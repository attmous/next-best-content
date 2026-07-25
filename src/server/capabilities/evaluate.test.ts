import { describe, expect, it } from "vitest";

import { evaluateCapabilities } from "./evaluate";

describe("evaluateCapabilities", () => {
  it("returns a fail-closed public-demo snapshot by default", () => {
    const result = evaluateCapabilities({});

    expect(result).toEqual({
      profile: "public_demo",
      installation: "public",
      availability: {
        demo: { available: true },
        modelBackedWorkflows: {
          available: false,
          reason: "profile_restricted",
        },
        requestScopedModelKey: {
          available: false,
          reason: "profile_restricted",
        },
        openai: {
          available: false,
          reason: "profile_restricted",
        },
        import: {
          available: false,
          reason: "profile_restricted",
        },
        youtubeLive: {
          available: false,
          reason: "profile_restricted",
        },
        linkedinImport: {
          available: false,
          reason: "profile_restricted",
        },
        linkedinDirectRead: {
          available: false,
          reason: "access_not_available",
        },
        youtubeShort: {
          available: false,
          reason: "profile_restricted",
        },
        linkedinDocument: {
          available: false,
          reason: "profile_restricted",
        },
        linkedinPublish: {
          available: false,
          reason: "not_implemented",
        },
      },
      targets: [
        {
          platform: "youtube",
          format: "short",
          output: "short",
          generation: {
            available: false,
            reason: "profile_restricted",
          },
        },
        {
          platform: "linkedin",
          format: "carousel",
          output: "document",
          generation: {
            available: false,
            reason: "profile_restricted",
          },
        },
      ],
    });
  });

  it("ignores accidentally configured external credentials in public_demo", () => {
    const result = evaluateCapabilities({
      APP_PROFILE: "public_demo",
      APP_INSTALLATION: "private",
      ENABLE_SERVER_LLM_KEY: "true",
      LLM_API_KEY: "local-model-secret",
      ENABLE_OPENAI_BYOK: "true",
      ENABLE_YOUTUBE_API: "true",
      YOUTUBE_POLICY_APPROVED: "true",
      YOUTUBE_API_KEY: "youtube-secret",
    });

    expect(result.profile).toBe("public_demo");
    expect(result.installation).toBe("private");
    expect(result.availability.modelBackedWorkflows).toEqual({
      available: false,
      reason: "profile_restricted",
    });
    expect(result.availability.requestScopedModelKey).toEqual({
      available: false,
      reason: "profile_restricted",
    });
    expect(result.availability.youtubeLive).toEqual({
      available: false,
      reason: "profile_restricted",
    });
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(result).not.toHaveProperty("openaiCredentials");
  });

  it("reports explicit self-hosted flag-off as operator disabled", () => {
    const result = evaluateCapabilities({
      APP_PROFILE: "self_hosted",
      APP_INSTALLATION: "private",
    });

    expect(result.availability.modelBackedWorkflows).toEqual({
      available: false,
      reason: "operator_disabled",
    });
    expect(result.availability.requestScopedModelKey).toEqual({
      available: false,
      reason: "operator_disabled",
    });
    expect(result.availability.import).toEqual({
      available: false,
      reason: "operator_disabled",
    });
    expect(result.availability.linkedinImport).toEqual({
      available: false,
      reason: "operator_disabled",
    });
  });

  it("reports missing configuration for an enabled server model mode", () => {
    const result = evaluateCapabilities({
      APP_PROFILE: "self_hosted",
      ENABLE_SERVER_LLM_KEY: "true",
    });

    expect(result.availability.modelBackedWorkflows).toEqual({
      available: false,
      reason: "configuration_missing",
    });
    expect(result.availability.openai).toEqual(
      result.availability.modelBackedWorkflows,
    );
  });

  it("enables model-backed imports and outputs with a canonical local server key", () => {
    const result = evaluateCapabilities({
      APP_PROFILE: "self_hosted",
      ENABLE_SERVER_LLM_KEY: "true",
      LLM_API_KEY: "local-model-secret",
    });

    expect(result.availability.modelBackedWorkflows).toEqual({
      available: true,
    });
    expect(result.availability.openai).toEqual(
      result.availability.modelBackedWorkflows,
    );
    expect(result.availability.import).toEqual({ available: true });
    expect(result.availability.linkedinImport).toEqual({
      available: true,
    });
    expect(result.availability.youtubeShort).toEqual({ available: true });
    expect(result.availability.linkedinDocument).toEqual({
      available: true,
    });
    expect(result.targets[0].generation).toEqual(
      result.availability.youtubeShort,
    );
    expect(result.targets[1].generation).toEqual(
      result.availability.linkedinDocument,
    );
  });

  it("enables request-scoped model workflows only behind the exact self-hosted opt-in", () => {
    const enabled = evaluateCapabilities({
      APP_PROFILE: "self_hosted",
      ENABLE_OPENAI_BYOK: "true",
    });
    const wrongCase = evaluateCapabilities({
      APP_PROFILE: "self_hosted",
      ENABLE_OPENAI_BYOK: "TRUE",
    });

    expect(enabled.availability.requestScopedModelKey).toEqual({
      available: true,
    });
    expect(enabled.availability.modelBackedWorkflows).toEqual({
      available: true,
    });
    expect(wrongCase.availability.requestScopedModelKey).toEqual({
      available: false,
      reason: "operator_disabled",
    });
  });

  it("requires every YouTube gate and reports useful non-secret reasons", () => {
    const policyMissing = evaluateCapabilities({
      APP_PROFILE: "self_hosted",
      ENABLE_OPENAI_BYOK: "true",
    });
    const operatorDisabled = evaluateCapabilities({
      APP_PROFILE: "self_hosted",
      ENABLE_OPENAI_BYOK: "true",
      YOUTUBE_POLICY_APPROVED: "true",
    });
    const configurationMissing = evaluateCapabilities({
      APP_PROFILE: "self_hosted",
      ENABLE_OPENAI_BYOK: "true",
      YOUTUBE_POLICY_APPROVED: "true",
      ENABLE_YOUTUBE_API: "true",
    });
    const available = evaluateCapabilities({
      APP_PROFILE: "self_hosted",
      ENABLE_OPENAI_BYOK: "true",
      YOUTUBE_POLICY_APPROVED: "true",
      ENABLE_YOUTUBE_API: "true",
      YOUTUBE_API_KEY: "youtube-secret",
    });

    expect(policyMissing.availability.youtubeLive).toEqual({
      available: false,
      reason: "policy_approval_required",
    });
    expect(operatorDisabled.availability.youtubeLive).toEqual({
      available: false,
      reason: "operator_disabled",
    });
    expect(configurationMissing.availability.youtubeLive).toEqual({
      available: false,
      reason: "configuration_missing",
    });
    expect(available.availability.youtubeLive).toEqual({
      available: true,
    });
  });

  it("keeps direct LinkedIn reads and publishing unavailable", () => {
    const result = evaluateCapabilities({
      APP_PROFILE: "self_hosted",
      ENABLE_OPENAI_BYOK: "true",
    });

    expect(result.availability.linkedinDirectRead).toEqual({
      available: false,
      reason: "access_not_available",
    });
    expect(result.availability.linkedinPublish).toEqual({
      available: false,
      reason: "not_implemented",
    });
  });

  it("does not let advisory installation metadata change enforcement", () => {
    const environment = {
      APP_PROFILE: "self_hosted",
      ENABLE_SERVER_LLM_KEY: "true",
      LLM_API_KEY: "local-model-secret",
    } as const;

    const publicInstallation = evaluateCapabilities({
      ...environment,
      APP_INSTALLATION: "public",
    });
    const privateInstallation = evaluateCapabilities({
      ...environment,
      APP_INSTALLATION: "private",
    });

    expect(publicInstallation.availability).toEqual(
      privateInstallation.availability,
    );
    expect(publicInstallation.installation).toBe("public");
    expect(privateInstallation.installation).toBe("private");
  });
});
