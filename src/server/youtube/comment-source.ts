import type { VideoMetadata } from "@/contracts";

export interface SourceComment {
  author: string;
  text: string;
  likeCount: number;
}

export interface CommentSourceResult {
  video: VideoMetadata;
  comments: SourceComment[];
}

export interface CommentSourceOptions {
  limit: number;
  signal: AbortSignal;
}

export interface CommentSource {
  getComments(
    normalizedYoutubeUrl: string,
    options: CommentSourceOptions,
  ): Promise<CommentSourceResult>;
}
