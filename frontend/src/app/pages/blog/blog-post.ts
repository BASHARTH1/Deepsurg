import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Blog, Post } from '../../core/blog';

@Component({
  selector: 'ds-blog-post',
  standalone: true,
  imports: [DatePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="ds-section article">
      <div class="ds-container article__inner">
        <a class="article__back" routerLink="/blog">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M13 8H4m0 0 3.4-3.4M4 8l3.4 3.4" stroke="currentColor" stroke-width="1.7"
                  stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          All posts
        </a>

        @if (loading()) {
          <p class="state">Loading…</p>
        } @else if (!post()) {
          <p class="state">That post is not here. It may have been unpublished.</p>
        } @else {
          <header class="article__head">
            <span class="entry__meta">
              <span class="entry__tag">{{ post()!.tag }}</span>
              <time [attr.datetime]="post()!.published_at">
                {{ post()!.published_at | date: 'd MMMM y' }}
              </time>
            </span>
            <h1>{{ post()!.title }}</h1>
            @if (post()!.excerpt) {
              <p class="ds-lead">{{ post()!.excerpt }}</p>
            }
          </header>

          @if (post()!.cover_url) {
            <img class="article__cover" [src]="post()!.cover_url" [alt]="" />
          }

          <div class="article__body">
            @for (paragraph of paragraphs(); track $index) {
              <p>{{ paragraph }}</p>
            }
          </div>
        }
      </div>
    </article>
  `,
  styleUrl: './blog.scss',
})
export class BlogPost {
  /** Bound from the route by withComponentInputBinding(). */
  readonly slug = input.required<string>();

  private readonly blog = inject(Blog);

  readonly post = signal<Post | null>(null);
  readonly loading = signal(true);

  /** Blank lines separate paragraphs; the editor is plain text, not HTML. */
  paragraphs(): string[] {
    return (this.post()?.body ?? '')
      .split(/\n\s*\n/)
      .map((block) => block.trim())
      .filter(Boolean);
  }

  ngOnInit(): void {
    this.blog
      .bySlug(this.slug())
      .then((post) => this.post.set(post))
      .catch(() => this.post.set(null))
      .finally(() => this.loading.set(false));
  }
}
