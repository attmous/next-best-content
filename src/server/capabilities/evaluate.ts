import {
  CapabilitiesResponseSchema,
  type CapabilitiesResponse,
  type CapabilityAvailability,
  type CapabilityAvailabilityReason,
} from "@/contracts";
import {
  resolveApplicationRuntime,
  type RuntimeEnvironment,
} from "@/server/runtime/application-profile";

const AVAILABLE = { available: true } as const satisfies CapabilityAvailability;

function unavailable(
  reason: CapabilityAvailabilityReason | undefined,
): CapabilityAvailability {
  return {
    available: false,
    reason: reason ?? "configuration_missing",
  };
}

export function evaluateCapabilities(
  environment: RuntimeEnvironment = process.env,
): CapabilitiesResponse {
  const runtime = resolveApplicationRuntime(environment);
  const modelBackedWorkflows = runtime.modelBackedWorkflowsAvailable
    ? AVAILABLE
    : unavailable(runtime.modelUnavailableReason);
  const requestScopedModelKey = runtime.requestScopedModelKeyAllowed
    ? AVAILABLE
    : unavailable(
        runtime.profile === "public_demo"
          ? "profile_restricted"
          : "operator_disabled",
      );
  const youtubeLive = runtime.youtubeLiveAvailable
    ? AVAILABLE
    : unavailable(runtime.youtubeUnavailableReason);

  return CapabilitiesResponseSchema.parse({
    profile: runtime.profile,
    installation: runtime.installation,
    availability: {
      // The demo is a client-owned synthetic journey, not an analyze source.
      demo: AVAILABLE,
      modelBackedWorkflows,
      requestScopedModelKey,
      // Deprecated exact alias retained for an atomic UI migration.
      openai: modelBackedWorkflows,
      // Generic import means a rights-confirmed, creator-owned data import.
      import: modelBackedWorkflows,
      youtubeLive,
      // This is accepted LinkedIn labeling on creator-owned import data.
      linkedinImport: modelBackedWorkflows,
      linkedinDirectRead: unavailable("access_not_available"),
      youtubeShort: modelBackedWorkflows,
      linkedinDocument: modelBackedWorkflows,
      linkedinPublish: unavailable("not_implemented"),
    },
    // Targets describe model-backed output generation. They remain visible
    // when generation is unavailable so the synthetic demo can show formats.
    targets: [
      {
        platform: "youtube",
        format: "short",
        output: "short",
        generation: modelBackedWorkflows,
      },
      {
        platform: "linkedin",
        format: "carousel",
        output: "document",
        generation: modelBackedWorkflows,
      },
    ],
  });
}
