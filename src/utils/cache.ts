// Memory cache utility for client-side instant data lookups and scroll position history

import { Post, Comment } from "../types";

interface RepoDetails {
  repo: any;
  readme: string;
  similarRepos: any[];
}

// Global module-level store that survives React component lifecycle unmounts
class MemoryCache {
  private repoDetailsCache: Map<string, RepoDetails> = new Map();
  private communityPosts: Post[] | null = null;
  private commentsCache: Map<string, Comment[]> = new Map();
  private scrollPositions: Map<string, number> = new Map();
  private genericCache: Map<string, any> = new Map();

  // Repo cache helpers
  public getRepoDetails(owner: string, name: string): RepoDetails | null {
    const key = `${owner.toLowerCase()}/${name.toLowerCase()}`;
    return this.repoDetailsCache.get(key) || null;
  }

  public setRepoDetails(owner: string, name: string, data: RepoDetails): void {
    const key = `${owner.toLowerCase()}/${name.toLowerCase()}`;
    this.repoDetailsCache.set(key, data);
  }

  // Community posts cache helpers
  public getCommunityPosts(): Post[] | null {
    return this.communityPosts;
  }

  public setCommunityPosts(posts: Post[]): void {
    this.communityPosts = posts;
  }

  // Community comments cache helpers
  public getPostComments(postId: string): Comment[] | null {
    return this.commentsCache.get(postId) || null;
  }

  public setPostComments(postId: string, comments: Comment[]): void {
    this.commentsCache.set(postId, comments);
  }

  // Scroll Position helpers
  public getScrollPosition(key: string): number {
    return this.scrollPositions.get(key) || 0;
  }

  public setScrollPosition(key: string, value: number): void {
    this.scrollPositions.set(key, value);
  }

  // Generic key-value cache
  public get(key: string): any {
    return this.genericCache.get(key);
  }

  public set(key: string, value: any): void {
    this.genericCache.set(key, value);
  }

  public has(key: string): boolean {
    return this.genericCache.has(key);
  }

  public clear(): void {
    this.repoDetailsCache.clear();
    this.communityPosts = null;
    this.commentsCache.clear();
    this.scrollPositions.clear();
    this.genericCache.clear();
  }
}

export const appCache = new MemoryCache();
