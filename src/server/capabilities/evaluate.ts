import {
  CapabilitiesResponseSchema,
  type CapabilitiesResponse,
  type CapabilityAvailability,
} from "@/contracts";

type RuntimeEnvironment = Record<string, string | undefined>;

function enabled(value: string | undefined): boolean {
  return value === "true";
}

function configured(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function availability(
  available: boolean,
  reason:
    | CapabilityAvailability["reason"]
    | undefined = undefined,
): CapabilityAvailability {
  return {
    available,
    ...(available || reason === undefined ? {} : { reason }),
  };
}

export function evaluateCapabilities(
  environment: RuntimeEnvironment = process.env,
): CapabilitiesResponse {
  const serverOpenaiAvailable =
    enabled(environment.ENABLE_OPENAI_API) &&
    configured(environment.OPENAI_API_KEY);
  const byokAvailable = enabled(environment.ENABLE_OPENAI_BYOK);
  const openaiAvailable = serverOpenaiAvailable || byokAvailable;
  const openaiReason = openaiAvailable
    ? undefined
    : ("configuration_missing" as const);

  const youtubePolicyApproved = enabled(
    environment.YOUTUBE_POLICY_APPROVED,
  );
  const youtubeConfigured =
    enabled(environment.ENABLE_YOUTUBE_API) &&
    configured(environment.YOUTUBE_API_KEY);
  const youtubeAvailable =
    openaiAvailable && youtubePolicyApproved && youtubeConfigured;
  const youtubeReason = !youtubePolicyApproved
    ? ("policy_approval_required" as const)
    : !openaiAvailable || !youtubeConfigured
      ? ("configuration_missing" as const)
      : undefined;

  return CapabilitiesResponseSchema.parse({
    openaiCredentials: {
      serverManaged: serverOpenaiAvailable,
      requestScoped: byokAvailable,
    },
    availability: {
      openai: availability(openaiAvailable, openaiReason),
      import: availability(openaiAvailable, openaiReason),
      youtubeLive: availability(youtubeAvailable, youtubeReason),
      linkedinImport: availability(openaiAvailable, openaiReason),
      linkedinDirectRead: availability(false, "access_not_available"),
      youtubeShort: availability(openaiAvailable, openaiReason),
      linkedinDocument: availability(openaiAvailable, openaiReason),
      linkedinPublish: availability(false, "not_implemented"),
    },
  });
}
