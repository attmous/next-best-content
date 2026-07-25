import { CapabilitiesResponseSchema } from "@/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

describe("GET /api/capabilities", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns a typed, non-cacheable capability snapshot", async () => {
    vi.stubEnv("APP_PROFILE", "public_demo");
    vi.stubEnv("APP_INSTALLATION", "public");

    const response = GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = await response.json();
    expect(() => CapabilitiesResponseSchema.parse(body)).not.toThrow();
    expect(body).toMatchObject({
      profile: "public_demo",
      installation: "public",
      availability: {
        demo: { available: true },
        modelBackedWorkflows: {
          available: false,
          reason: "profile_restricted",
        },
      },
    });
    expect(body).not.toHaveProperty("openaiCredentials");
  });
});
