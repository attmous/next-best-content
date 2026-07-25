import {
  VideoMetadataSchema,
  type VideoMetadata,
} from "@/contracts";
import { z } from "zod";

import type {
  CommentSource,
  CommentSourceOptions,
  CommentSourceResult,
  SourceComment,
} from "./comment-source";
import { YoutubeSourceError } from "./errors";
import { normalizeYoutubeUrl } from "./url";

const YOUTUBE_API_ORIGIN = "https://www.googleapis.com";
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_TIMEOUT_MS = 30_000;
const MAX_COMMENT_LIMIT = 100;

const VideoListResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().min(1),
      snippet: z.object({
        title: z.string().min(1),
        channelTitle: z.string().min(1),
        thumbnails: z.record(
          z.string(),
          z.object({
            url: z.string().url(),
          }),
        ),
      }),
      status: z.object({
        privacyStatus: z.enum(["private", "public", "unlisted"]),
      }),
    }),
  ),
});

const CommentThreadListResponseSchema = z.object({
  nextPageToken: z.string().min(1).optional(),
  items: z.array(
    z.object({
      snippet: z.object({
        topLevelComment: z.object({
          id: z.string().min(1),
          snippet: z.object({
            authorDisplayName: z.string().min(1),
            textDisplay: z.string().min(1),
            likeCount: z.number().int().nonnegative(),
          }),
        }),
      }),
    }),
  ),
});

const YoutubeErrorEnvelopeSchema = z.object({
  error: z.object({
    errors: z
      .array(
        z.object({
          reason: z.string(),
        }),
      )
      .optional(),
  }),
});

const QUOTA_REASONS = new Set([
  "dailyLimitExceeded",
  "dailyLimitExceededUnreg",
  "quotaExceeded",
  "variableTermExpiredDailyExceeded",
  "variableTermLimitExceeded",
]);

const RATE_LIMIT_REASONS = new Set([
  "rateLimitExceeded",
  "rateLimitExceededUnreg",
  "servingLimitExceeded",
  "userRateLimitExceeded",
  "userRateLimitExceededUnreg",
]);

const AUTHENTICATION_REASONS = new Set([
  "accessNotConfigured",
  "accountDelegationForbidden",
  "authError",
  "forbidden",
  "ipRefererBlocked",
  "keyInvalid",
  "keyExpired",
]);

const THUMBNAIL_PREFERENCE = [
  "maxres",
  "standard",
  "high",
  "medium",
  "default",
] as const;

export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export interface YoutubeSourceEnvironment {
  ENABLE_YOUTUBE_API?: string;
  YOUTUBE_POLICY_APPROVED?: string;
  YOUTUBE_API_KEY?: string;
}

export interface YoutubeCommentSourceFactoryOptions {
  environment?: YoutubeSourceEnvironment;
  fetch?: FetchLike;
  timeoutMs?: number;
}

interface OperationDeadline {
  callerSignal: AbortSignal;
  cleanup(): void;
  didTimeout(): boolean;
  signal: AbortSignal;
}

class DisabledYoutubeCommentSource implements CommentSource {
  async getComments(): Promise<CommentSourceResult> {
    throw new YoutubeSourceError("feature_disabled");
  }
}

class YoutubeDataApiCommentSource implements CommentSource {
  readonly #apiKey: string;
  readonly #fetch: FetchLike;
  readonly #timeoutMs: number;

  constructor(options: {
    apiKey: string;
    fetch: FetchLike;
    timeoutMs: number;
  }) {
    this.#apiKey = options.apiKey;
    this.#fetch = options.fetch;
    this.#timeoutMs = options.timeoutMs;
  }

  async getComments(
    youtubeUrl: string,
    options: CommentSourceOptions,
  ): Promise<CommentSourceResult> {
    const limit = parseLimit(options.limit);
    const { videoId } = normalizeYoutubeUrl(youtubeUrl);
    const deadline = createOperationDeadline(options.signal, this.#timeoutMs);

    try {
      const video = await this.#getVideo(videoId, deadline);
      const comments = await this.#getTopLevelComments(
        videoId,
        limit,
        deadline,
      );
      assertOperationActive(deadline);

      return {
        video,
        comments,
      };
    } finally {
      deadline.cleanup();
    }
  }

  async #getVideo(
    videoId: string,
    deadline: OperationDeadline,
  ): Promise<VideoMetadata> {
    const url = new URL("/youtube/v3/videos", YOUTUBE_API_ORIGIN);
    url.searchParams.set("part", "snippet,status");
    url.searchParams.set("id", videoId);

    const payload = await this.#getJson(url, deadline);
    const parsed = VideoListResponseSchema.safeParse(payload);

    if (!parsed.success) {
      throw new YoutubeSourceError("upstream");
    }

    if (parsed.data.items.length !== 1) {
      throw new YoutubeSourceError("inaccessible");
    }

    const [item] = parsed.data.items;
    if (item.id !== videoId) {
      throw new YoutubeSourceError("upstream");
    }

    if (item.status.privacyStatus === "private") {
      throw new YoutubeSourceError("inaccessible");
    }

    const thumbnailUrl = selectThumbnail(item.snippet.thumbnails);
    if (thumbnailUrl === undefined) {
      throw new YoutubeSourceError("upstream");
    }

    const video = VideoMetadataSchema.safeParse({
      id: item.id,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnailUrl,
    });

    if (!video.success) {
      throw new YoutubeSourceError("upstream");
    }

    return video.data;
  }

  async #getTopLevelComments(
    videoId: string,
    limit: number,
    deadline: OperationDeadline,
  ): Promise<SourceComment[]> {
    const comments: SourceComment[] = [];
    const commentIds = new Set<string>();
    const pageTokens = new Set<string>();
    let pageToken: string | undefined;

    while (comments.length < limit) {
      if (pageToken !== undefined) {
        if (pageTokens.has(pageToken)) {
          throw new YoutubeSourceError("upstream");
        }
        pageTokens.add(pageToken);
      }

      const url = new URL("/youtube/v3/commentThreads", YOUTUBE_API_ORIGIN);
      url.searchParams.set("part", "snippet");
      url.searchParams.set("videoId", videoId);
      url.searchParams.set("maxResults", String(MAX_COMMENT_LIMIT));
      url.searchParams.set("order", "relevance");
      url.searchParams.set("textFormat", "plainText");
      if (pageToken !== undefined) {
        url.searchParams.set("pageToken", pageToken);
      }

      const payload = await this.#getJson(url, deadline);
      const parsed = CommentThreadListResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new YoutubeSourceError("upstream");
      }

      const countBeforePage = comments.length;

      for (const thread of parsed.data.items) {
        const comment = thread.snippet.topLevelComment;
        if (commentIds.has(comment.id)) {
          continue;
        }

        commentIds.add(comment.id);
        comments.push({
          id: comment.id,
          author: comment.snippet.authorDisplayName,
          text: comment.snippet.textDisplay,
          likeCount: comment.snippet.likeCount,
        });

        if (comments.length === limit) {
          break;
        }
      }

      pageToken = parsed.data.nextPageToken;
      if (pageToken === undefined) {
        break;
      }

      if (comments.length === countBeforePage) {
        throw new YoutubeSourceError("upstream");
      }
    }

    return comments;
  }

  async #getJson(
    url: URL,
    deadline: OperationDeadline,
  ): Promise<unknown> {
    assertOperationActive(deadline);

    let response: Response;
    try {
      response = await this.#fetch(url, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "X-Goog-Api-Key": this.#apiKey,
        },
        method: "GET",
        signal: deadline.signal,
      });
    } catch {
      throw operationFailure(deadline);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw operationFailure(deadline);
    }

    assertOperationActive(deadline);

    if (!response.ok) {
      throw mapUpstreamError(response.status, payload);
    }

    return payload;
  }
}

function featureEnabled(environment: YoutubeSourceEnvironment): boolean {
  return (
    environment.ENABLE_YOUTUBE_API === "true" &&
    environment.YOUTUBE_POLICY_APPROVED === "true" &&
    (environment.YOUTUBE_API_KEY?.trim().length ?? 0) > 0
  );
}

function parseLimit(limit: number): number {
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > MAX_COMMENT_LIMIT
  ) {
    throw new YoutubeSourceError("invalid_request");
  }

  return limit;
}

function normalizedTimeout(timeoutMs: number | undefined): number {
  if (timeoutMs === undefined) {
    return DEFAULT_TIMEOUT_MS;
  }

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new YoutubeSourceError("invalid_request");
  }

  return Math.min(Math.floor(timeoutMs), MAX_TIMEOUT_MS);
}

function createOperationDeadline(
  callerSignal: AbortSignal,
  timeoutMs: number,
): OperationDeadline {
  const controller = new AbortController();
  let timedOut = false;

  const abortFromCaller = () => {
    controller.abort();
  };

  if (callerSignal.aborted) {
    controller.abort();
  } else {
    callerSignal.addEventListener("abort", abortFromCaller, { once: true });
  }

  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  return {
    callerSignal,
    signal: controller.signal,
    didTimeout: () => timedOut,
    cleanup: () => {
      clearTimeout(timeout);
      callerSignal.removeEventListener("abort", abortFromCaller);
    },
  };
}

function assertOperationActive(deadline: OperationDeadline): void {
  if (deadline.callerSignal.aborted) {
    throw new YoutubeSourceError("cancelled");
  }

  if (deadline.didTimeout()) {
    throw new YoutubeSourceError("timeout");
  }
}

function operationFailure(deadline: OperationDeadline): YoutubeSourceError {
  if (deadline.callerSignal.aborted) {
    return new YoutubeSourceError("cancelled");
  }

  if (deadline.didTimeout()) {
    return new YoutubeSourceError("timeout");
  }

  return new YoutubeSourceError("upstream");
}

function selectThumbnail(
  thumbnails: Record<string, { url: string }>,
): string | undefined {
  for (const key of THUMBNAIL_PREFERENCE) {
    const thumbnail = thumbnails[key];
    if (thumbnail !== undefined) {
      return thumbnail.url;
    }
  }

  return undefined;
}

function mapUpstreamError(
  status: number,
  payload: unknown,
): YoutubeSourceError {
  const envelope = YoutubeErrorEnvelopeSchema.safeParse(payload);
  const reasons = envelope.success
    ? (envelope.data.error.errors?.map((error) => error.reason) ?? [])
    : [];

  if (reasons.includes("commentsDisabled")) {
    return new YoutubeSourceError("comments_disabled");
  }

  if (reasons.some((reason) => QUOTA_REASONS.has(reason))) {
    return new YoutubeSourceError("quota_exceeded");
  }

  if (
    status === 429 ||
    reasons.some((reason) => RATE_LIMIT_REASONS.has(reason))
  ) {
    return new YoutubeSourceError("rate_limited");
  }

  if (
    status === 404 ||
    reasons.includes("videoNotFound")
  ) {
    return new YoutubeSourceError("inaccessible");
  }

  if (
    status === 401 ||
    status === 403 ||
    reasons.some((reason) => AUTHENTICATION_REASONS.has(reason))
  ) {
    return new YoutubeSourceError("authentication");
  }

  if (status >= 400 && status < 500) {
    return new YoutubeSourceError("invalid_request");
  }

  return new YoutubeSourceError("upstream");
}

/**
 * Creates the policy-gated source. A disabled source fails locally and cannot
 * call the injected fetch implementation.
 */
export function createYoutubeCommentSource(
  options: YoutubeCommentSourceFactoryOptions = {},
): CommentSource {
  const environment = options.environment ?? {
    ENABLE_YOUTUBE_API: process.env.ENABLE_YOUTUBE_API,
    YOUTUBE_POLICY_APPROVED: process.env.YOUTUBE_POLICY_APPROVED,
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
  };

  if (!featureEnabled(environment)) {
    return new DisabledYoutubeCommentSource();
  }

  const apiKey = environment.YOUTUBE_API_KEY?.trim();
  if (apiKey === undefined || apiKey === "") {
    return new DisabledYoutubeCommentSource();
  }

  return new YoutubeDataApiCommentSource({
    apiKey,
    fetch: options.fetch ?? globalThis.fetch,
    timeoutMs: normalizedTimeout(options.timeoutMs),
  });
}
