import { ApiErrorResponseSchema } from "@/contracts";
import { AnalysisInputError } from "@/server/analyze/service";
import { GenerationInputError } from "@/server/generate/service";
import { LLMProviderError } from "@/server/llm/provider";
import { YoutubeSourceError } from "@/server/youtube";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { serviceErrorResponse } from "./service-error";

async function responseCode(error: unknown) {
  const response = serviceErrorResponse(error);
  const body = ApiErrorResponseSchema.parse(await response.json());

  expect(response.headers.get("Cache-Control")).toBe("no-store");
  return {
    code: body.error.code,
    retryable: body.error.retryable,
    status: response.status,
  };
}

describe("serviceErrorResponse", () => {
  it.each([
    [
      new YoutubeSourceError("invalid_url"),
      { code: "INVALID_YOUTUBE_URL", retryable: false, status: 400 },
    ],
    [
      new YoutubeSourceError("comments_disabled"),
      { code: "COMMENTS_DISABLED", retryable: false, status: 422 },
    ],
    [
      new YoutubeSourceError("quota_exceeded"),
      { code: "YOUTUBE_QUOTA_EXCEEDED", retryable: true, status: 503 },
    ],
    [
      new YoutubeSourceError("feature_disabled"),
      { code: "FEATURE_DISABLED", retryable: false, status: 503 },
    ],
    [
      new YoutubeSourceError("authentication"),
      { code: "FEATURE_DISABLED", retryable: false, status: 503 },
    ],
    [
      new LLMProviderError("authentication"),
      {
        code: "MODEL_AUTHENTICATION_FAILED",
        retryable: false,
        status: 502,
      },
    ],
    [
      new LLMProviderError("invalid_output"),
      { code: "INVALID_MODEL_OUTPUT", retryable: true, status: 502 },
    ],
    [
      new LLMProviderError("invalid_request"),
      { code: "FEATURE_DISABLED", retryable: false, status: 503 },
    ],
    [
      new LLMProviderError("timeout"),
      { code: "EXTERNAL_SERVICE_TIMEOUT", retryable: true, status: 504 },
    ],
    [
      new AnalysisInputError("too_few_comments"),
      { code: "TOO_FEW_COMMENTS", retryable: false, status: 422 },
    ],
    [
      new AnalysisInputError("invalid_evidence"),
      { code: "INVALID_MODEL_OUTPUT", retryable: true, status: 502 },
    ],
    [
      new GenerationInputError("target_format_mismatch"),
      { code: "VALIDATION_ERROR", retryable: false, status: 400 },
    ],
  ])("maps a known service error", async (error, expected) => {
    await expect(responseCode(error)).resolves.toEqual(expected);
  });

  it("maps post-generation schema failures to invalid model output", async () => {
    let validationError: unknown;
    try {
      z.strictObject({ value: z.string() }).parse({ value: 1 });
    } catch (error) {
      validationError = error;
    }

    await expect(responseCode(validationError)).resolves.toEqual({
      code: "INVALID_MODEL_OUTPUT",
      retryable: true,
      status: 502,
    });
  });

  it("collapses unknown failures into the generic internal envelope", async () => {
    const secret = "private-failure-detail";
    const response = serviceErrorResponse(new Error(secret));
    const responseText = await response.text();
    const body = ApiErrorResponseSchema.parse(JSON.parse(responseText));

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(responseText).not.toContain(secret);
  });
});
