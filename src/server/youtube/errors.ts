export type YoutubeSourceErrorKind =
  | "authentication"
  | "cancelled"
  | "comments_disabled"
  | "feature_disabled"
  | "inaccessible"
  | "invalid_request"
  | "invalid_url"
  | "quota_exceeded"
  | "rate_limited"
  | "timeout"
  | "upstream";

const ERROR_MESSAGES: Record<YoutubeSourceErrorKind, string> = {
  authentication: "YouTube rejected its API credentials or configuration.",
  cancelled: "The YouTube request was cancelled.",
  comments_disabled: "Comments are unavailable for this video.",
  feature_disabled: "YouTube access is disabled.",
  inaccessible: "The YouTube video is unavailable.",
  invalid_request: "The YouTube request is invalid.",
  invalid_url: "The YouTube video URL is invalid.",
  quota_exceeded: "YouTube quota is unavailable.",
  rate_limited: "YouTube is temporarily rate limiting requests.",
  timeout: "YouTube did not respond in time.",
  upstream: "YouTube returned an unexpected response.",
};

const RETRYABLE_KINDS = new Set<YoutubeSourceErrorKind>([
  "quota_exceeded",
  "rate_limited",
  "timeout",
  "upstream",
]);

/**
 * A deliberately sanitized source error. Upstream response bodies, submitted
 * URLs, and credentials are never attached to this error.
 */
export class YoutubeSourceError extends Error {
  readonly kind: YoutubeSourceErrorKind;
  readonly retryable: boolean;

  constructor(kind: YoutubeSourceErrorKind) {
    super(ERROR_MESSAGES[kind]);
    this.name = "YoutubeSourceError";
    this.kind = kind;
    this.retryable = RETRYABLE_KINDS.has(kind);
  }
}

export function isYoutubeSourceError(
  error: unknown,
): error is YoutubeSourceError {
  return error instanceof YoutubeSourceError;
}
