import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Blog, Post, slugify } from '../../core/blog';

/**
 * Writes the blog. Signing in is only half of it — the database decides who may
 * actually publish, so this page being reachable gives nothing away.
 */
@Component({
  selector: 'ds-admin',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class Admin {
  private readonly fb = inject(FormBuilder);
  protected readonly blog = inject(Blog);

  readonly posts = signal<Post[]>([]);
  readonly editing = signal<Post | null>(null);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly note = signal<string | null>(null);

  readonly login = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  readonly post = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    slug: ['', [Validators.required]],
    tag: ['News', [Validators.required]],
    excerpt: ['', [Validators.maxLength(320)]],
    cover_url: [''],
    body: ['', [Validators.required, Validators.minLength(20)]],
    published: [false],
  });

  constructor() {
    // Once a session turns up (page load or sign-in), load the posts.
    void this.refresh();
  }

  async signIn(): Promise<void> {
    if (this.login.invalid) {
      this.login.markAllAsTouched();
      return;
    }

    this.busy.set(true);
    this.error.set(null);
    const { email, password } = this.login.getRawValue();

    try {
      await this.blog.signIn(email, password);
      await this.refresh();
    } catch (failure) {
      this.error.set((failure as Error).message);
    } finally {
      this.busy.set(false);
    }
  }

  async signOut(): Promise<void> {
    await this.blog.signOut();
    this.posts.set([]);
    this.reset();
  }

  /** Suggests a slug while the title is being typed, unless one was set by hand. */
  onTitle(): void {
    const slug = this.post.controls.slug;
    if (!slug.dirty) {
      slug.setValue(slugify(this.post.controls.title.value), { emitEvent: false });
    }
  }

  edit(post: Post): void {
    this.editing.set(post);
    this.post.reset({
      title: post.title,
      slug: post.slug,
      tag: post.tag,
      excerpt: post.excerpt,
      cover_url: post.cover_url ?? '',
      body: post.body,
      published: post.published,
    });
    this.post.controls.slug.markAsDirty();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  reset(): void {
    this.editing.set(null);
    this.note.set(null);
    this.post.reset({ title: '', slug: '', tag: 'News', excerpt: '', cover_url: '', body: '', published: false });
  }

  async save(): Promise<void> {
    if (this.post.invalid) {
      this.post.markAllAsTouched();
      return;
    }

    this.busy.set(true);
    this.error.set(null);
    const value = this.post.getRawValue();

    try {
      await this.blog.save(
        { ...value, cover_url: value.cover_url.trim() || null },
        this.editing()?.id,
      );
      this.note.set(value.published ? 'Published.' : 'Saved as a draft.');
      this.reset();
      await this.refresh();
    } catch (failure) {
      this.error.set((failure as Error).message);
    } finally {
      this.busy.set(false);
    }
  }

  async remove(post: Post): Promise<void> {
    if (!confirm(`Delete “${post.title}”? This cannot be undone.`)) {
      return;
    }

    this.busy.set(true);
    try {
      await this.blog.remove(post.id);
      await this.refresh();
    } catch (failure) {
      this.error.set((failure as Error).message);
    } finally {
      this.busy.set(false);
    }
  }

  invalid(control: keyof typeof this.post.controls): boolean {
    const field = this.post.controls[control];
    return field.invalid && (field.touched || field.dirty);
  }

  private async refresh(): Promise<void> {
    if (!this.blog.configured) {
      return;
    }

    // The client loads on demand; wait for the stored session to come back.
    await this.blog.ready();

    try {
      this.posts.set(await this.blog.all());
    } catch {
      // Not signed in, or not an admin — the policies simply return nothing.
      this.posts.set([]);
    }
  }
}
