import type { ApiErrorCode } from "@/contracts";

/**
 * `fetch`-level failures have no typed envelope, so the client folds them into
 * this synthetic code alongside the backend's contract codes.
 */
export type UiErrorCode = ApiErrorCode | "NETWORK_ERROR";

export interface UiError {
  code: UiErrorCode;
  title: string;
  description: string;
  retryable: boolean;
  /** Whether the error screen should offer the synthetic demo as a way out. */
  offerDemo: boolean;
  /** Whether comment import is a sensible alternative to this failure. */
  offerImport: boolean;
  requestId?: string;
}

interface ErrorCopy {
  title: string;
  description: string;
  retryable: boolean;
  offerDemo: boolean;
  offerImport: boolean;
}

const ERROR_COPY: Record<UiErrorCode, ErrorCopy> = {
  VALIDATION_ERROR: {
    title: "That request didn't validate",
    description:
      "Something about the request didn't match what the analysis service expects. Check the video URL and try again.",
    retryable: true,
    offerDemo: true,
    offerImport: false,
  },
  INVALID_YOUTUBE_URL: {
    title: "That doesn't look like a YouTube video",
    description:
      "We couldn't find a video behind that link. Paste a full YouTube video URL, like youtube.com/watch?v=…",
    retryable: true,
    offerDemo: true,
    offerImport: true,
  },
  COMMENTS_DISABLED: {
    title: "Comments are turned off for this video",
    description:
      "NextBestContent listens to your audience through comments, and this video has them disabled. Try a video with an active comment section.",
    retryable: false,
    offerDemo: true,
    offerImport: true,
  },
  TOO_FEW_COMMENTS: {
    title: "Not enough comments to find a signal",
    description:
      "This video doesn't have enough comments yet for a trustworthy read on your audience. Try a video with a busier comment section.",
    retryable: false,
    offerDemo: true,
    offerImport: true,
  },
  YOUTUBE_QUOTA_EXCEEDED: {
    title: "YouTube is rate-limiting us right now",
    description:
      "The daily YouTube API quota has been used up. This usually resets within 24 hours — nothing on your end is wrong.",
    retryable: true,
    offerDemo: true,
    offerImport: true,
  },
  MODEL_AUTHENTICATION_FAILED: {
    title: "The analysis model rejected its credentials",
    description:
      "The model provider didn't accept the configured API key. The key needs to be checked on the server — nothing on your end is wrong.",
    retryable: false,
    offerDemo: true,
    offerImport: false,
  },
  INVALID_MODEL_OUTPUT: {
    title: "The model returned something we couldn't trust",
    description:
      "The analysis model produced an output that failed our validation checks, so we stopped rather than show you unreliable results. Trying again usually resolves this.",
    retryable: true,
    offerDemo: true,
    offerImport: false,
  },
  EXTERNAL_SERVICE_TIMEOUT: {
    title: "An upstream service took too long",
    description:
      "A service we depend on didn't answer in time. This is usually temporary — try again in a moment.",
    retryable: true,
    offerDemo: true,
    offerImport: false,
  },
  FEATURE_DISABLED: {
    title: "Live access is disabled for this environment",
    description:
      "The required integration is switched off here — live YouTube analysis needs both API and policy gates enabled. Importing comments works without any gates.",
    retryable: false,
    offerDemo: true,
    offerImport: true,
  },
  NOT_IMPLEMENTED: {
    title: "The live pipeline isn't wired up yet",
    description:
      "This build's backend routes are still under construction, so live analysis can't run. The synthetic demo walks the identical journey with clearly labeled fictional data.",
    retryable: false,
    offerDemo: true,
    offerImport: true,
  },
  INTERNAL_ERROR: {
    title: "Something broke on our side",
    description:
      "An unexpected error occurred while processing the request. It's been assigned a request ID — try again, and mention the ID if it keeps happening.",
    retryable: true,
    offerDemo: true,
    offerImport: false,
  },
  NETWORK_ERROR: {
    title: "We couldn't reach the server",
    description:
      "The request never made it to the analysis service. Check your connection and try again.",
    retryable: true,
    offerDemo: true,
    offerImport: false,
  },
};

export function toUiError(
  code: UiErrorCode,
  options?: { requestId?: string; message?: string },
): UiError {
  const copy = ERROR_COPY[code] ?? ERROR_COPY.INTERNAL_ERROR;
  return {
    code,
    title: copy.title,
    description: copy.description,
    retryable: copy.retryable,
    offerDemo: copy.offerDemo,
    offerImport: copy.offerImport,
    requestId: options?.requestId,
  };
}
