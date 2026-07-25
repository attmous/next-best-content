import {
  ApiErrorResponseSchema,
  PreflightResponseSchema,
} from "@/contracts";
import { evaluatePreflight } from "@/server/preflight/evaluate";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/preflight/evaluate", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/server/preflight/evaluate")>();

  return {
    ...actual,
    evaluatePreflight: vi.fn(actual.evaluatePreflight),
  };
});

import { POST } from "./route";

const checkOrder = [
  "hook",
  "audience_fit",
  "evidence",
  "clarity",
  "format",
  "cta",
  "brand_safety",
] as const;

function scene(index: number) {
  return {
    index,
    headline: `Scene ${index + 1}`,
    body: "One clear idea for the audience.",
    visualDirection: "Show the idea with a simple visual.",
    voiceover: "Explain the idea clearly.",
    durationSeconds: 0,
  };
}

const validBody = {
  contentPack: {
    format: "carousel" as const,
    title: "A clear six-slide draft",
    hook: "Here is the useful answer your audience asked for.",
    angle: "Turn one audience question into a practical walkthrough.",
    scenes: Array.from({ length: 6 }, (_, index) => scene(index)),
    caption: "A concise answer grounded in audience feedback.",
    cta: "Save this post",
    hashtags: ["#creatortips"],
  },
};

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/preflight", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function rawRequest(body: string): Request {
  return new Request("http://localhost/api/preflight", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
  });
}

describe("POST /api/preflight", () => {
  it("evaluates a valid draft and returns all seven checks without caching", async () => {
    const response = await POST(jsonRequest(validBody));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");

    const result = PreflightResponseSchema.parse(await response.json());

    expect(result.checks.map((check) => check.name)).toEqual(checkOrder);
    expect(result.verdict).toBe("blocked");
  });

  it("returns a typed validation error for malformed JSON", async () => {
    const response = await POST(rawRequest("{"));

    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");

    const result = ApiErrorResponseSchema.parse(await response.json());

    expect(result.error.code).toBe("VALIDATION_ERROR");
    expect(result.error.retryable).toBe(false);
  });

  it("caps safe validation diagnostics without echoing submitted values", async () => {
    const privateValue = "private-submitted-value";
    const invalidBody = {
      contentPack: {
        ...validBody.contentPack,
        title: { privateValue },
        scenes: Array.from({ length: 12 }, () => ({
          index: privateValue,
          headline: 1,
          body: 2,
          visualDirection: 3,
          voiceover: 4,
          durationSeconds: privateValue,
        })),
      },
    };

    const response = await POST(jsonRequest(invalidBody));
    const rawResult = await response.json();
    const result = ApiErrorResponseSchema.parse(rawResult);
    const details = result.error.details as
      | {
          issues?: unknown[];
          issueCount?: number;
          truncated?: boolean;
        }
      | undefined;

    expect(response.status).toBe(400);
    expect(details?.issues).toHaveLength(20);
    expect(details?.issueCount).toBeGreaterThan(20);
    expect(details?.truncated).toBe(true);
    expect(JSON.stringify(rawResult)).not.toContain(privateValue);
  });

  it("assigns a unique request ID to each validation failure", async () => {
    const first = ApiErrorResponseSchema.parse(
      await (await POST(rawRequest("{"))).json(),
    );
    const second = ApiErrorResponseSchema.parse(
      await (await POST(rawRequest("{"))).json(),
    );

    expect(first.error.requestId).not.toBe(second.error.requestId);
  });

  it("returns a generic typed internal error when evaluation throws", async () => {
    vi.mocked(evaluatePreflight).mockImplementationOnce(() => {
      throw new Error("private evaluator failure");
    });

    const response = await POST(jsonRequest(validBody));
    const rawResult = await response.json();
    const result = ApiErrorResponseSchema.parse(rawResult);

    expect(response.status).toBe(500);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(result.error.code).toBe("INTERNAL_ERROR");
    expect(result.error.retryable).toBe(true);
    expect(JSON.stringify(rawResult)).not.toContain("private evaluator failure");
  });
});
