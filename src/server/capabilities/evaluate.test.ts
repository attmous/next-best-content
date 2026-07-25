import { describe, expect, it } from "vitest";

import { evaluateCapabilities } from "./evaluate";

describe("evaluateCapabilities", () => {
  it("keeps every external capability unavailable by default", () => {
    const result = evaluateCapabilities({});

    expect(result.openaiCredentials).toEqual({
      serverManaged: false,
      requestScoped: false,
    });
    expect(result.availability.openai).toEqual({
      available: false,
      reason: "configuration_missing",
    });
    expect(result.availability.youtubeLive).toEqual({
      available: false,
      reason: "policy_approval_required",
    });
    expect(result.availability.linkedinDirectRead).toEqual({
      available: false,
      reason: "access_not_available",
    });
  });

  it("enables import and generation when OpenAI is explicitly configured", () => {
    const result = evaluateCapabilities({
      ENABLE_OPENAI_API: "true",
      OPENAI_API_KEY: "server-key",
    });

    expect(result.availability.import.available).toBe(true);
    expect(result.openaiCredentials).toEqual({
      serverManaged: true,
      requestScoped: false,
    });
    expect(result.availability.linkedinImport.available).toBe(true);
    expect(result.availability.youtubeShort.available).toBe(true);
    expect(result.availability.linkedinDocument.available).toBe(true);
    expect(result.availability.youtubeLive.available).toBe(false);
  });

  it("exposes model-backed flows when request-scoped keys are enabled", () => {
    const result = evaluateCapabilities({
      ENABLE_OPENAI_BYOK: "true",
    });

    expect(result.availability.openai).toEqual({ available: true });
    expect(result.openaiCredentials).toEqual({
      serverManaged: false,
      requestScoped: true,
    });
    expect(result.availability.import).toEqual({ available: true });
    expect(result.availability.youtubeShort).toEqual({ available: true });
    expect(result.availability.linkedinDocument).toEqual({
      available: true,
    });
  });

  it("requires every YouTube and OpenAI gate before live access", () => {
    const result = evaluateCapabilities({
      ENABLE_OPENAI_API: "true",
      OPENAI_API_KEY: "server-key",
      ENABLE_YOUTUBE_API: "true",
      YOUTUBE_POLICY_APPROVED: "true",
      YOUTUBE_API_KEY: "youtube-key",
    });

    expect(result.availability.youtubeLive).toEqual({ available: true });
    expect(result.availability.linkedinPublish.available).toBe(false);
  });

  it("requires exact lowercase true flags", () => {
    const result = evaluateCapabilities({
      ENABLE_OPENAI_API: "TRUE",
      ENABLE_OPENAI_BYOK: "TRUE",
      OPENAI_API_KEY: "server-key",
      ENABLE_YOUTUBE_API: "1",
      YOUTUBE_POLICY_APPROVED: "yes",
      YOUTUBE_API_KEY: "youtube-key",
    });

    expect(result.availability.openai.available).toBe(false);
    expect(result.availability.youtubeLive.available).toBe(false);
  });
});
