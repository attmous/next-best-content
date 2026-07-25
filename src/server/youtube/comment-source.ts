import type { VideoMetadata } from "@/contracts";

export interface SourceComment {
  id: string;
  author: string;
  text: string;
  likeCount: number;
}

export interface CommentSourceResult {
  video: VideoMetadata;
  comments: SourceComment[];
}

export interface CommentSourceOptions {
  /** Maximum number of published top-level comments to return (1–100). */
  limit: number;
  signal: AbortSignal;
}

export interface CommentSource {
  getComments(
    normalizedYoutubeUrl: string,
    options: CommentSourceOptions,
  ): Promise<CommentSourceResult>;
}
