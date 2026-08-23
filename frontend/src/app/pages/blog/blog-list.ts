import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Blog, Post } from '../../core/blog';

@Component({
  selector: 'ds-blog-list',
  standalone: true,
  imports: [DatePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="masthead">
      <div class="ds-container masthead__inner">
        <span class="ds-eyebrow"><span class="ds-eyebrow__dot"></span>Blog</span>
        <h1>What we're <span class="ds-gradient-text">working on</span></h1>
        <p class="ds-lead">
          Notes from the operating room and the lab — what we are building, and what we are
          learning from the teams using it.
        </p>
      </div>
    </section>

    <section class="ds-section">
      <div class="ds-container">
        @if (loading()) {
          <p class="state">Loading…</p>
        } @else if (error()) {
          <p class="state state--bad">{{ error() }}</p>
        } @else if (!posts().length) {
          <p class="state">No posts yet — the first one is on its way.</p>
        } @else {
          <ul class="feed">
            @for (post of posts(); track post.id) {
              <li>
                <a class="ds-card entry" [routerLink]="['/blog', post.slug]">
                  @if (post.cover_url) {
                    <img class="entry__cover" [src]="post.cover_url" [alt]="" loading="lazy" />
                  }
                  <div class="entry__text">
                    <span class="entry__meta">
                      <span class="entry__tag">{{ post.tag }}</span>
                      <time [attr.datetime]="post.published_at">
                        {{ post.published_at | date: 'd MMMM y' }}
                      </time>
                    </span>
                    <h2>{{ post.title }}</h2>
                    <p>{{ post.excerpt }}</p>
                  </div>
                </a>
              </li>
            }
          </ul>
        }
      </div>
    </section>
  `,
  styleUrl: './blog.scss',
})
export class BlogList {
  private readonly blog = inject(Blog);

  readonly posts = signal<Post[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    this.blog
      .published()
      .then((posts) => this.posts.set(posts))
      .catch((failure: Error) => this.error.set(failure.message))
      .finally(() => this.loading.set(false));
  }
}
