import { ApiErrorResponseSchema } from "@/contracts";
import { describe, expect, it } from "vitest";

import { POST as analyze } from "./analyze/route";
import { POST as generate } from "./generate/route";

const routes = [
  ["analyze", analyze],
  ["generate", generate],
] as const;

describe("API route stubs", () => {
  it("returns typed, non-cacheable 501 responses with unique request IDs", async () => {
    const requestIds: string[] = [];

    for (const [name, post] of routes) {
      const response = await post();

      expect(response.status, name).toBe(501);
      expect(response.headers.get("Cache-Control"), name).toBe("no-store");

      const body = ApiErrorResponseSchema.parse(await response.json());

      expect(body.error.code, name).toBe("NOT_IMPLEMENTED");
      requestIds.push(body.error.requestId);
    }

    expect(new Set(requestIds).size).toBe(routes.length);
  });
});
