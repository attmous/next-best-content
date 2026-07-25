import { ApiErrorResponseSchema } from "@/contracts";
import { describe, expect, it } from "vitest";

import { notImplementedResponse } from "./not-implemented";
import {
  apiErrorResponse,
  internalErrorResponse,
  jsonResponse,
} from "./response";

describe("API response helpers", () => {
  it("returns non-cacheable JSON success responses", async () => {
    const response = jsonResponse(
      {
        status: "ok",
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "public, max-age=3600",
          "X-Test": "preserved",
        },
      },
    );

    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Content-Type")).toContain("application/json");
    expect(response.headers.get("X-Test")).toBe("preserved");
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("creates typed errors with unique request IDs", async () => {
    const responses = [
      apiErrorResponse({
        code: "FEATURE_DISABLED",
        message: "This feature is disabled.",
        retryable: false,
        status: 403,
      }),
      apiErrorResponse({
        code: "FEATURE_DISABLED",
        message: "This feature is disabled.",
        retryable: false,
        status: 403,
      }),
    ];

    const bodies = await Promise.all(
      responses.map(async (response) => {
        expect(response.headers.get("Cache-Control")).toBe("no-store");
        return ApiErrorResponseSchema.parse(await response.json());
      }),
    );

    expect(bodies[0].error.requestId).not.toBe(
      bodies[1].error.requestId,
    );
  });

  it("returns a generic typed internal error", async () => {
    const response = internalErrorResponse();

    expect(response.status).toBe(500);
    expect(response.headers.get("Cache-Control")).toBe("no-store");

    const body = ApiErrorResponseSchema.parse(await response.json());
    expect(body.error).toMatchObject({
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred.",
      retryable: true,
    });
    expect(body.error.details).toBeUndefined();
  });

  it("preserves the honest 501 response through the shared helper", async () => {
    const response = notImplementedResponse("Analyze");

    expect(response.status).toBe(501);
    expect(response.headers.get("Cache-Control")).toBe("no-store");

    const body = ApiErrorResponseSchema.parse(await response.json());
    expect(body.error).toMatchObject({
      code: "NOT_IMPLEMENTED",
      message: "Analyze is not implemented yet.",
      retryable: false,
    });
  });
});
