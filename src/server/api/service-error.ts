import { ZodError } from "zod";

import { AnalysisInputError } from "@/server/analyze/service";
import { GenerationInputError } from "@/server/generate/service";
import { LLMProviderError } from "@/server/llm/provider";
import {
  isYoutubeSourceError,
  type YoutubeSourceError,
} from "@/server/youtube";

import { apiErrorResponse, internalErrorResponse } from "./response";

function youtubeErrorResponse(error: YoutubeSourceError) {
  switch (error.kind) {
    case "invalid_url":
    case "inaccessible":
      return apiErrorResponse({
        code: "INVALID_YOUTUBE_URL",
        message: "The YouTube video URL is invalid or unavailable.",
        retryable: false,
        status: 400,
      });
    case "comments_disabled":
      return apiErrorResponse({
        code: "COMMENTS_DISABLED",
        message: "Comments are unavailable for this YouTube video.",
        retryable: false,
        status: 422,
      });
    case "quota_exceeded":
      return apiErrorResponse({
        code: "YOUTUBE_QUOTA_EXCEEDED",
        message: "YouTube quota is temporarily unavailable.",
        retryable: true,
        status: 503,
      });
    case "feature_disabled":
    case "authentication":
      return apiErrorResponse({
        code: "FEATURE_DISABLED",
        message:
          error.kind === "authentication"
            ? "YouTube credentials or API configuration are unavailable."
            : "YouTube analysis is disabled.",
        retryable: false,
        status: 503,
      });
    case "invalid_request":
      return apiErrorResponse({
        code: "VALIDATION_ERROR",
        message: "The YouTube request is invalid.",
        retryable: false,
        status: 400,
      });
    case "cancelled":
    case "rate_limited":
    case "timeout":
    case "upstream":
      return apiErrorResponse({
        code: "EXTERNAL_SERVICE_TIMEOUT",
        message: "YouTube is temporarily unavailable.",
        retryable: error.retryable,
        status: error.kind === "timeout" ? 504 : 503,
      });
  }
}

function modelErrorResponse(error: LLMProviderError) {
  switch (error.kind) {
    case "authentication":
      return apiErrorResponse({
        code: "MODEL_AUTHENTICATION_FAILED",
        message: "The model provider rejected its credentials.",
        retryable: false,
        status: 502,
      });
    case "invalid_output":
      return apiErrorResponse({
        code: "INVALID_MODEL_OUTPUT",
        message: "The model returned an invalid structured response.",
        retryable: true,
        status: 502,
      });
    case "feature_disabled":
    case "invalid_request":
      return apiErrorResponse({
        code: "FEATURE_DISABLED",
        message:
          error.kind === "invalid_request"
            ? "The model request configuration is unavailable."
            : "Model-backed generation is disabled.",
        retryable: false,
        status: 503,
      });
    case "rate_limit":
    case "timeout":
    case "upstream":
      return apiErrorResponse({
        code: "EXTERNAL_SERVICE_TIMEOUT",
        message: "The model provider is temporarily unavailable.",
        retryable: error.retryable,
        status: error.kind === "timeout" ? 504 : 503,
      });
  }
}

/**
 * Converts known service failures into sanitized API envelopes. Unknown
 * failures deliberately collapse to the generic internal error.
 */
export function serviceErrorResponse(error: unknown) {
  if (isYoutubeSourceError(error)) {
    return youtubeErrorResponse(error);
  }

  if (error instanceof LLMProviderError) {
    return modelErrorResponse(error);
  }

  if (error instanceof AnalysisInputError) {
    if (error.kind === "too_few_comments") {
      return apiErrorResponse({
        code: "TOO_FEW_COMMENTS",
        message: "At least three usable comments are required.",
        retryable: false,
        status: 422,
      });
    }

    return apiErrorResponse({
      code: "INVALID_MODEL_OUTPUT",
      message: "The model selected invalid source evidence.",
      retryable: true,
      status: 502,
    });
  }

  if (error instanceof GenerationInputError) {
    return apiErrorResponse({
      code: "VALIDATION_ERROR",
      message: "The requested target is incompatible with the content format.",
      retryable: false,
      status: 400,
    });
  }

  if (error instanceof ZodError) {
    return apiErrorResponse({
      code: "INVALID_MODEL_OUTPUT",
      message: "Generated content failed response validation.",
      retryable: true,
      status: 502,
    });
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return apiErrorResponse({
      code: "EXTERNAL_SERVICE_TIMEOUT",
      message: "The request was cancelled before completion.",
      retryable: true,
      status: 408,
    });
  }

  return internalErrorResponse();
}
