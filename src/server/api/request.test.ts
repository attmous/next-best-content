import { ApiErrorResponseSchema } from "@/contracts";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { parseJsonRequest } from "./request";

function jsonRequest(body: unknown): Request {
  return new Request("https://example.test/api/test", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("parseJsonRequest", () => {
  it("returns data parsed by the supplied schema", async () => {
    const schema = z.strictObject({
      title: z.string(),
      count: z.coerce.number(),
    });

    const result = await parseJsonRequest(
      jsonRequest({ title: "Draft", count: "3" }),
      schema,
    );

    expect(result).toEqual({
      ok: true,
      data: {
        title: "Draft",
        count: 3,
      },
    });
  });

  it("returns a typed validation error for malformed JSON", async () => {
    const submittedText = "private-submitted-value";
    const request = new Request("https://example.test/api/test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: `{"secret":"${submittedText}"`,
    });

    const result = await parseJsonRequest(
      request,
      z.strictObject({ secret: z.string() }),
    );

    expect(result.ok).toBe(false);

    if (result.ok) {
      throw new Error("Expected malformed JSON to fail.");
    }

    expect(result.response.status).toBe(400);
    expect(result.response.headers.get("Cache-Control")).toBe("no-store");

    const responseText = await result.response.text();
    expect(responseText).not.toContain(submittedText);

    const body = ApiErrorResponseSchema.parse(JSON.parse(responseText));
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.retryable).toBe(false);
    expect(body.error.details).toEqual({
      issues: [
        {
          path: [],
          code: "invalid_json",
          message: "Request body must contain valid JSON.",
        },
      ],
      issueCount: 1,
      truncated: false,
    });
  });

  it("returns sanitized diagnostics for schema validation failures", async () => {
    const submittedText = "private-submitted-value";
    const schema = z.strictObject({
      title: z.string(),
      nested: z.strictObject({
        count: z.number().int(),
      }),
    });

    const result = await parseJsonRequest(
      jsonRequest({
        title: { secret: submittedText },
        nested: { count: submittedText },
      }),
      schema,
    );

    expect(result.ok).toBe(false);

    if (result.ok) {
      throw new Error("Expected invalid input to fail.");
    }

    const responseText = await result.response.text();
    expect(responseText).not.toContain(submittedText);

    const body = ApiErrorResponseSchema.parse(JSON.parse(responseText));
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details).toMatchObject({
      issueCount: 2,
      truncated: false,
    });

    const issues = body.error.details?.issues;
    expect(issues).toEqual([
      {
        path: ["title"],
        code: "invalid_type",
        message: "Invalid input: expected string, received object",
      },
      {
        path: ["nested", "count"],
        code: "invalid_type",
        message: "Invalid input: expected number, received string",
      },
    ]);

    for (const issue of issues as Array<Record<string, unknown>>) {
      expect(Object.keys(issue).sort()).toEqual(["code", "message", "path"]);
    }
  });

  it("does not echo unrecognized field names in validation messages", async () => {
    const submittedText = "private-submitted-value";
    const result = await parseJsonRequest(
      jsonRequest({
        title: "Draft",
        [submittedText]: true,
      }),
      z.strictObject({
        title: z.string(),
      }),
    );

    expect(result.ok).toBe(false);

    if (result.ok) {
      throw new Error("Expected an unrecognized field to fail.");
    }

    const responseText = await result.response.text();
    expect(responseText).not.toContain(submittedText);

    const body = ApiErrorResponseSchema.parse(JSON.parse(responseText));
    expect(body.error.details?.issues).toEqual([
      {
        path: [],
        code: "unrecognized_keys",
        message: "Request contains unrecognized fields.",
      },
    ]);
  });

  it("caps validation diagnostics and reports truncation metadata", async () => {
    const result = await parseJsonRequest(
      jsonRequest({
        values: Array.from({ length: 25 }, () => null),
      }),
      z.strictObject({
        values: z.array(z.string()),
      }),
    );

    expect(result.ok).toBe(false);

    if (result.ok) {
      throw new Error("Expected invalid input to fail.");
    }

    const body = ApiErrorResponseSchema.parse(await result.response.json());
    const details = body.error.details;

    expect(details).toMatchObject({
      issueCount: 25,
      truncated: true,
    });
    expect(details?.issues).toHaveLength(20);
  });
});
