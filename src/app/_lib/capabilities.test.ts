import { describe, expect, it } from "vitest";

import type {
  CapabilitiesResponse,
  CapabilityAvailability,
} from "@/contracts";
import {
  PUBLIC_RUNTIME,
  allowsRequestScopedModelKey,
  outputGenerationState,
  runtimeContextFromPayload,
  sourceOptionState,
  type RuntimeContext,
} from "./capabilities";
import { SOURCE_OPTIONS } from "./platforms";

const available = { available: true } as const;
const restricted = {
  available: false,
  reason: "profile_restricted",
} as const;

function capabilities(
  overrides: Partial<CapabilitiesResponse["availability"]> = {},
  profile: CapabilitiesResponse["profile"] = "self_hosted",
): CapabilitiesResponse {
  const model: CapabilityAvailability =
    profile === "self_hosted" ? available : restricted;
  return {
    profile,
    installation: profile === "self_hosted" ? "private" : "public",
    availability: {
      demo: available,
      modelBackedWorkflows: model,
      requestScopedModelKey: model,
      openai: model,
      import: model,
      youtubeLive: model,
      linkedinImport: model,
      linkedinDirectRead: {
        available: false,
        reason: "access_not_available",
      },
      youtubeShort: model,
      linkedinDocument: model,
      linkedinPublish: {
        available: false,
        reason: "not_implemented",
      },
      ...overrides,
    },
    targets: [
      {
        platform: "youtube",
        format: "short",
        output: "short",
        generation: overrides.youtubeShort ?? model,
      },
      {
        platform: "linkedin",
        format: "carousel",
        output: "document",
        generation: overrides.linkedinDocument ?? model,
      },
    ],
  };
}

function runtime(
  overrides: Partial<CapabilitiesResponse["availability"]> = {},
): RuntimeContext {
  const response = capabilities(overrides);
  return { profile: response.profile, capabilities: response };
}

function option(id: string) {
  const found = SOURCE_OPTIONS.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`unknown option ${id}`);
  return found;
}

describe("runtimeContextFromPayload", () => {
  it("uses the explicit server-owned profile even when every model flow is off", () => {
    const payload = capabilities(
      {
        modelBackedWorkflows: {
          available: false,
          reason: "operator_disabled",
        },
        requestScopedModelKey: {
          available: false,
          reason: "operator_disabled",
        },
        openai: { available: false, reason: "operator_disabled" },
        import: { available: false, reason: "operator_disabled" },
        youtubeLive: { available: false, reason: "operator_disabled" },
        linkedinImport: {
          available: false,
          reason: "operator_disabled",
        },
        youtubeShort: { available: false, reason: "operator_disabled" },
        linkedinDocument: {
          available: false,
          reason: "operator_disabled",
        },
      },
      "self_hosted",
    );

    expect(runtimeContextFromPayload(payload).profile).toBe("self_hosted");
  });

  it("fails closed when the response is missing or contradicts invariants", () => {
    expect(runtimeContextFromPayload(undefined)).toBe(PUBLIC_RUNTIME);
    expect(
      runtimeContextFromPayload({
        ...capabilities(),
        availability: {
          ...capabilities().availability,
          openai: { available: false, reason: "operator_disabled" },
        },
      }),
    ).toBe(PUBLIC_RUNTIME);
  });
});

describe("sourceOptionState", () => {
  it("keeps the synthetic demo interactive in every profile", () => {
    expect(sourceOptionState(option("demo"), PUBLIC_RUNTIME).interactive).toBe(
      true,
    );
    expect(sourceOptionState(option("demo"), runtime()).interactive).toBe(true);
  });

  it("public profile exposes no external source actions", () => {
    for (const id of ["youtube-live", "import"] as const) {
      const state = sourceOptionState(option(id), PUBLIC_RUNTIME);
      expect(state.interactive).toBe(false);
      expect(state.reason).toMatch(/hosted demo/i);
    }
  });

  it("self-hosted sources follow the exact capability facts", () => {
    const context = runtime({
      import: available,
      youtubeLive: {
        available: false,
        reason: "policy_approval_required",
      },
    });

    expect(sourceOptionState(option("import"), context).interactive).toBe(true);
    expect(sourceOptionState(option("youtube-live"), context)).toEqual({
      interactive: false,
      reason: "The required platform policy approval has not been enabled.",
    });
  });

  it("keeps direct LinkedIn reads unavailable", () => {
    expect(
      sourceOptionState(option("linkedin-live"), runtime()).interactive,
    ).toBe(false);

    const claimedAvailable = runtime();
    if (claimedAvailable.capabilities) {
      claimedAvailable.capabilities.availability.linkedinDirectRead =
        available;
    }
    expect(
      sourceOptionState(option("linkedin-live"), claimedAvailable).interactive,
    ).toBe(false);
  });
});

describe("destination and credential capabilities", () => {
  it("keeps synthetic formats available when model generation is restricted", () => {
    const publicCapabilities = capabilities({}, "public_demo");
    const context: RuntimeContext = {
      profile: "public_demo",
      capabilities: publicCapabilities,
    };

    expect(
      outputGenerationState("youtube-short", "demo", context).interactive,
    ).toBe(true);
    expect(
      outputGenerationState("linkedin-document", "demo", context).interactive,
    ).toBe(true);
    expect(
      outputGenerationState("youtube-short", "live", context).interactive,
    ).toBe(false);
  });

  it("follows ordered target generation for live runs", () => {
    const context = runtime({
      youtubeShort: {
        available: false,
        reason: "operator_disabled",
      },
    });

    expect(
      outputGenerationState("youtube-short", "live", context).interactive,
    ).toBe(false);
    expect(
      outputGenerationState("linkedin-document", "live", context).interactive,
    ).toBe(true);
  });

  it("shows request-scoped key entry only when the server allows it", () => {
    expect(allowsRequestScopedModelKey(PUBLIC_RUNTIME)).toBe(false);
    expect(allowsRequestScopedModelKey(runtime())).toBe(true);
    expect(
      allowsRequestScopedModelKey(
        runtime({
          requestScopedModelKey: {
            available: false,
            reason: "operator_disabled",
          },
        }),
      ),
    ).toBe(false);
  });
});
