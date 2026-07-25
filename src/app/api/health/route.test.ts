import { describe, expect, it } from "vitest";

import { createHealthHandler } from "./route";

describe("GET /api/health", () => {
  it.each([
    ["public_demo", "public"],
    ["public_demo", "private"],
    ["self_hosted", "public"],
    ["self_hosted", "private"],
  ] as const)(
    "accepts recognized %s/%s production configuration without optional integrations",
    async (profile, installation) => {
      const health = createHealthHandler({
        NODE_ENV: "production",
        APP_PROFILE: profile,
        APP_INSTALLATION: installation,
      });

      const response = health();

      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(response.headers.get("Content-Type")).toContain(
        "application/json",
      );
      expect(await response.json()).toEqual({ status: "ok" });
    },
  );

  it.each([
    {},
    { APP_PROFILE: "self_hosted" },
    { APP_INSTALLATION: "private" },
    {
      APP_PROFILE: "unexpected",
      APP_INSTALLATION: "private",
    },
    {
      APP_PROFILE: "self_hosted",
      APP_INSTALLATION: "unexpected",
    },
  ])(
    "fails readiness closed for missing or unknown production configuration",
    async (configuration) => {
      const health = createHealthHandler({
        NODE_ENV: "production",
        LLM_API_KEY: "health-check-secret",
        YOUTUBE_API_KEY: "youtube-health-secret",
        ...configuration,
      });

      const response = health();
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(body).toEqual({ status: "unavailable" });
      expect(JSON.stringify(body)).not.toContain("secret");
      expect(Object.keys(body)).toEqual(["status"]);
    },
  );

  it("reports healthy in nonproduction while runtime behavior remains fail closed", async () => {
    const health = createHealthHandler({
      NODE_ENV: "development",
      APP_PROFILE: "unknown",
      APP_INSTALLATION: "unknown",
    });

    const response = health();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
