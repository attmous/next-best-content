import { ApiErrorResponseSchema } from "@/contracts";
import { describe, expect, it } from "vitest";

import { validateMutationRequest } from "./mutation-request";

function mutationRequest(headers: HeadersInit = {}): Request {
  return new Request("http://localhost/api/analyze", {
    method: "POST",
    headers,
    body: "submitted-secret",
  });
}

describe("validateMutationRequest", () => {
  it.each([
    new Headers({ "Content-Type": "application/json" }),
    new Headers({
      "Content-Type": "application/json; charset=utf-8",
    }),
    new Headers({
      "Content-Type": "Application/JSON ; charset=UTF-8",
      Origin: "http://localhost",
      "Sec-Fetch-Site": "same-origin",
    }),
  ])("accepts same-origin JSON and local CLI requests", (headers) => {
    expect(validateMutationRequest(mutationRequest(headers))).toBeUndefined();
  });

  it.each([
    new Headers(),
    new Headers({ "Content-Type": "text/plain" }),
    new Headers({ "Content-Type": "application/problem+json" }),
  ])(
    "rejects unsupported mutation media types without reading the body",
    async (headers) => {
      const response = validateMutationRequest(
        mutationRequest(headers),
      );

      expect(response?.status).toBe(415);
      expect(response?.headers.get("Cache-Control")).toBe("no-store");
      const result = ApiErrorResponseSchema.parse(
        await response?.json(),
      );
      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.retryable).toBe(false);
      expect(JSON.stringify(result)).not.toContain(
        "submitted-secret",
      );
    },
  );

  it.each([
    new Headers({ Origin: "https://attacker.example" }),
    new Headers({ Origin: "null" }),
    new Headers({ "Sec-Fetch-Site": "cross-site" }),
    new Headers({
      Origin: "http://localhost",
      "Sec-Fetch-Site": "CROSS-SITE",
    }),
  ])("rejects cross-site mutations before body parsing", async (headers) => {
    const requestHeaders = new Headers(headers);
    requestHeaders.set("Content-Type", "application/json");
    const response = validateMutationRequest(
      mutationRequest(requestHeaders),
    );

    expect(response?.status).toBe(403);
    expect(response?.headers.get("Cache-Control")).toBe("no-store");
    const result = ApiErrorResponseSchema.parse(
      await response?.json(),
    );
    expect(result.error.code).toBe("FEATURE_DISABLED");
    expect(result.error.retryable).toBe(false);
    expect(JSON.stringify(result)).not.toContain("submitted-secret");
  });
});
