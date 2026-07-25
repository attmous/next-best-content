import { describe, expect, it } from "vitest";

import { resolveApplicationRuntime } from "./application-profile";

describe("resolveApplicationRuntime", () => {
  it("fails closed to a public demo/public installation when configuration is missing", () => {
    expect(resolveApplicationRuntime({})).toEqual({
      profile: "public_demo",
      installation: "public",
      profileConfigured: false,
      installationConfigured: false,
      serverModelEnabled: false,
      serverModelAvailable: false,
      requestScopedModelKeyAllowed: false,
      modelBackedWorkflowsAvailable: false,
      modelUnavailableReason: "profile_restricted",
      youtubeSourceAvailable: false,
      youtubeLiveAvailable: false,
      youtubeUnavailableReason: "profile_restricted",
    });
  });

  it("treats unknown and wrong-case values as invalid fail-closed configuration", () => {
    const runtime = resolveApplicationRuntime({
      APP_PROFILE: "SELF_HOSTED",
      APP_INSTALLATION: "PRIVATE",
      ENABLE_SERVER_LLM_KEY: "true",
      LLM_API_KEY: "must-be-ignored",
    });

    expect(runtime).toMatchObject({
      profile: "public_demo",
      installation: "public",
      profileConfigured: false,
      installationConfigured: false,
      serverModelEnabled: false,
      serverModelAvailable: false,
      modelUnavailableReason: "profile_restricted",
    });
  });

  it("accepts all four explicit profile and installation combinations", () => {
    for (const profile of ["public_demo", "self_hosted"] as const) {
      for (const installation of ["public", "private"] as const) {
        const runtime = resolveApplicationRuntime({
          APP_PROFILE: profile,
          APP_INSTALLATION: installation,
        });

        expect(runtime).toMatchObject({
          profile,
          installation,
          profileConfigured: true,
          installationConfigured: true,
        });
      }
    }
  });

  it("ignores every external credential and opt-in in the public profile", () => {
    const runtime = resolveApplicationRuntime({
      APP_PROFILE: "public_demo",
      APP_INSTALLATION: "private",
      ENABLE_SERVER_LLM_KEY: "true",
      LLM_API_KEY: "local-model-secret",
      ENABLE_OPENAI_BYOK: "true",
      ENABLE_YOUTUBE_API: "true",
      YOUTUBE_POLICY_APPROVED: "true",
      YOUTUBE_API_KEY: "youtube-secret",
    });

    expect(runtime).toMatchObject({
      installation: "private",
      serverModelEnabled: false,
      serverModelAvailable: false,
      requestScopedModelKeyAllowed: false,
      modelBackedWorkflowsAvailable: false,
      modelUnavailableReason: "profile_restricted",
      youtubeSourceAvailable: false,
      youtubeLiveAvailable: false,
      youtubeUnavailableReason: "profile_restricted",
    });
    expect(JSON.stringify(runtime)).not.toContain("secret");
  });

  it("enables self-hosted model workflows only with the canonical server opt-in and key", () => {
    const runtime = resolveApplicationRuntime({
      APP_PROFILE: "self_hosted",
      ENABLE_SERVER_LLM_KEY: "true",
      LLM_API_KEY: "local-model-secret",
    });

    expect(runtime).toMatchObject({
      serverModelEnabled: true,
      serverModelAvailable: true,
      requestScopedModelKeyAllowed: false,
      modelBackedWorkflowsAvailable: true,
    });
    expect(runtime).not.toHaveProperty("modelUnavailableReason");
    expect(JSON.stringify(runtime)).not.toContain("local-model-secret");
  });

  it("does not honor legacy server-model environment variables", () => {
    const runtime = resolveApplicationRuntime({
      APP_PROFILE: "self_hosted",
      ENABLE_OPENAI_API: "true",
      OPENAI_API_KEY: "legacy-secret",
    });

    expect(runtime).toMatchObject({
      serverModelEnabled: false,
      serverModelAvailable: false,
      modelBackedWorkflowsAvailable: false,
      modelUnavailableReason: "operator_disabled",
    });
  });

  it("distinguishes an operator-disabled model from missing enabled configuration", () => {
    expect(
      resolveApplicationRuntime({
        APP_PROFILE: "self_hosted",
        LLM_API_KEY: "unused-without-opt-in",
      }).modelUnavailableReason,
    ).toBe("operator_disabled");

    expect(
      resolveApplicationRuntime({
        APP_PROFILE: "self_hosted",
        ENABLE_SERVER_LLM_KEY: "true",
        LLM_API_KEY: "   ",
      }).modelUnavailableReason,
    ).toBe("configuration_missing");
  });

  it("supports explicitly enabled request-scoped keys without exposing credential state", () => {
    const runtime = resolveApplicationRuntime({
      APP_PROFILE: "self_hosted",
      ENABLE_OPENAI_BYOK: "true",
    });

    expect(runtime).toMatchObject({
      serverModelAvailable: false,
      requestScopedModelKeyAllowed: true,
      modelBackedWorkflowsAvailable: true,
    });
    expect(runtime).not.toHaveProperty("modelUnavailableReason");
  });

  it("requires exact lowercase true model flags", () => {
    const runtime = resolveApplicationRuntime({
      APP_PROFILE: "self_hosted",
      ENABLE_SERVER_LLM_KEY: "TRUE",
      LLM_API_KEY: "local-model-secret",
      ENABLE_OPENAI_BYOK: "1",
    });

    expect(runtime).toMatchObject({
      serverModelEnabled: false,
      serverModelAvailable: false,
      requestScopedModelKeyAllowed: false,
      modelBackedWorkflowsAvailable: false,
      modelUnavailableReason: "operator_disabled",
    });
  });

  it("keeps YouTube source access separate from model-backed live analysis", () => {
    const runtime = resolveApplicationRuntime({
      APP_PROFILE: "self_hosted",
      ENABLE_YOUTUBE_API: "true",
      YOUTUBE_POLICY_APPROVED: "true",
      YOUTUBE_API_KEY: "youtube-secret",
    });

    expect(runtime).toMatchObject({
      youtubeSourceAvailable: true,
      youtubeLiveAvailable: false,
      youtubeUnavailableReason: "operator_disabled",
    });
  });

  it("enables live YouTube only when source and model gates pass", () => {
    const runtime = resolveApplicationRuntime({
      APP_PROFILE: "self_hosted",
      ENABLE_OPENAI_BYOK: "true",
      ENABLE_YOUTUBE_API: "true",
      YOUTUBE_POLICY_APPROVED: "true",
      YOUTUBE_API_KEY: "youtube-secret",
    });

    expect(runtime).toMatchObject({
      youtubeSourceAvailable: true,
      youtubeLiveAvailable: true,
    });
    expect(runtime).not.toHaveProperty("youtubeUnavailableReason");
  });

  it("reports YouTube gate reasons in policy, operator, then configuration order", () => {
    expect(
      resolveApplicationRuntime({
        APP_PROFILE: "self_hosted",
        ENABLE_OPENAI_BYOK: "true",
      }).youtubeUnavailableReason,
    ).toBe("policy_approval_required");

    expect(
      resolveApplicationRuntime({
        APP_PROFILE: "self_hosted",
        ENABLE_OPENAI_BYOK: "true",
        YOUTUBE_POLICY_APPROVED: "true",
      }).youtubeUnavailableReason,
    ).toBe("operator_disabled");

    expect(
      resolveApplicationRuntime({
        APP_PROFILE: "self_hosted",
        ENABLE_OPENAI_BYOK: "true",
        YOUTUBE_POLICY_APPROVED: "true",
        ENABLE_YOUTUBE_API: "true",
      }).youtubeUnavailableReason,
    ).toBe("configuration_missing");
  });

  it("does not use installation metadata as capability enforcement", () => {
    const baseEnvironment = {
      APP_PROFILE: "self_hosted",
      ENABLE_SERVER_LLM_KEY: "true",
      LLM_API_KEY: "local-model-secret",
    } as const;

    const publicInstallation = resolveApplicationRuntime({
      ...baseEnvironment,
      APP_INSTALLATION: "public",
    });
    const privateInstallation = resolveApplicationRuntime({
      ...baseEnvironment,
      APP_INSTALLATION: "private",
    });

    expect(publicInstallation.modelBackedWorkflowsAvailable).toBe(true);
    expect(privateInstallation.modelBackedWorkflowsAvailable).toBe(true);
  });
});
