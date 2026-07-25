import { CapabilitiesResponseSchema } from "@/contracts";
import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("GET /api/capabilities", () => {
  it("returns a typed, non-cacheable capability snapshot", async () => {
    const response = GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = await response.json();
    expect(() => CapabilitiesResponseSchema.parse(body)).not.toThrow();
  });
});
