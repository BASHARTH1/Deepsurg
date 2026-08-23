import { Injectable, signal } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  tag: string;
  cover_url: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

/** What the editor sends; the database fills in the rest. */
export type PostDraft = Pick<
  Post,
  'slug' | 'title' | 'excerpt' | 'body' | 'tag' | 'cover_url' | 'published'
>;

/**
 * Blog storage, straight from the browser to Supabase.
 *
 * The anon key is public by design — every rule that matters lives in row level
 * security on the database (see supabase/schema.sql): anyone may read published
 * posts, and only addresses listed in `admins` may write.
 *
 * The client library is imported dynamically. It is ~50kB over the wire and most
 * visitors never need it, so it stays out of the initial page.
 */
@Injectable({ providedIn: 'root' })
export class Blog {
  /** Email of whoever is signed in to the admin panel. */
  readonly admin = signal<string | null>(null);

  private client: Promise<SupabaseClient> | null = null;

  get configured(): boolean {
    return Boolean(environment.supabaseUrl && environment.supabaseAnonKey);
  }

  // ------------------------------------------------------------------ public

  /** Newest first. `limit` trims it for the home page. */
  async published(limit?: number): Promise<Post[]> {
    const db = await this.db();
    if (!db) {
      return [];
    }

    let query = db
      .from('posts')
      .select('*')
      .eq('published', true)
      .order('published_at', { ascending: false, nullsFirst: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(error.message);
    }
    return (data ?? []) as Post[];
  }

  async bySlug(slug: string): Promise<Post | null> {
    const db = await this.db();
    if (!db) {
      return null;
    }

    const { data, error } = await db.from('posts').select('*').eq('slug', slug).maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    return (data as Post) ?? null;
  }

  // ------------------------------------------------------------------- admin

  async signIn(email: string, password: string): Promise<void> {
    const db = await this.require();
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(error.message);
    }
  }

  async signOut(): Promise<void> {
    const db = await this.db();
    await db?.auth.signOut();
  }

  /** Drafts included — the policies only return these to an admin. */
  async all(): Promise<Post[]> {
    const db = await this.db();
    if (!db) {
      return [];
    }

    const { data, error } = await db
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }
    return (data ?? []) as Post[];
  }

  async save(draft: PostDraft, id?: string): Promise<Post> {
    const db = await this.require();

    // Stamp the publication date the first time a post goes live.
    const row = {
      ...draft,
      published_at: draft.published ? new Date().toISOString() : null,
    };

    const query = id
      ? db.from('posts').update(row).eq('id', id).select().single()
      : db.from('posts').insert(row).select().single();

    const { data, error } = await query;
    if (error) {
      throw new Error(error.message);
    }
    return data as Post;
  }

  async remove(id: string): Promise<void> {
    const db = await this.db();
    if (!db) {
      return;
    }

    const { error } = await db.from('posts').delete().eq('id', id);
    if (error) {
      throw new Error(error.message);
    }
  }

  /** Resolves once the stored session, if any, has been read back. */
  async ready(): Promise<void> {
    await this.db();
  }

  // ------------------------------------------------------------------ client

  private db(): Promise<SupabaseClient | null> {
    if (!this.configured) {
      return Promise.resolve(null);
    }

    this.client ??= import('@supabase/supabase-js').then(async ({ createClient }) => {
      const db = createClient(environment.supabaseUrl, environment.supabaseAnonKey);

      const { data } = await db.auth.getSession();
      this.admin.set(data.session?.user.email ?? null);
      db.auth.onAuthStateChange((_event, session) => {
        this.admin.set(session?.user.email ?? null);
      });

      return db;
    });

    return this.client;
  }

  private async require(): Promise<SupabaseClient> {
    const db = await this.db();
    if (!db) {
      throw new Error('No Supabase project is configured.');
    }
    return db;
  }
}

/** Turns a title into a URL-safe slug. */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
}
