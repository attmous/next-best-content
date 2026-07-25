import type {
  ApplicationProfile,
  CapabilityAvailabilityReason,
  Installation,
} from "@/contracts";

export type RuntimeEnvironment = Readonly<
  Record<string, string | undefined>
>;

interface ApplicationRuntimeEnvironment {
  readonly APP_PROFILE?: string;
  readonly APP_INSTALLATION?: string;
  readonly ENABLE_SERVER_LLM_KEY?: string;
  readonly LLM_API_KEY?: string;
  readonly ENABLE_OPENAI_BYOK?: string;
  readonly ENABLE_YOUTUBE_API?: string;
  readonly YOUTUBE_POLICY_APPROVED?: string;
  readonly YOUTUBE_API_KEY?: string;
}

export interface ApplicationRuntimePolicy {
  profile: ApplicationProfile;
  installation: Installation;
  /** Whether APP_PROFILE contained an explicit, recognized value. */
  profileConfigured: boolean;
  /** Whether APP_INSTALLATION contained an explicit, recognized value. */
  installationConfigured: boolean;
  /** Server-managed model mode is explicitly enabled in this profile. */
  serverModelEnabled: boolean;
  /** Server-managed model mode is enabled and has usable local configuration. */
  serverModelAvailable: boolean;
  /** Request-scoped model keys are allowed by this profile and operator policy. */
  requestScopedModelKeyAllowed: boolean;
  modelBackedWorkflowsAvailable: boolean;
  modelUnavailableReason?: CapabilityAvailabilityReason;
  /**
   * Live YouTube retrieval passed the profile, operator, policy, and local
   * configuration gates. This does not imply that a model is available.
   */
  youtubeSourceAvailable: boolean;
  /** Live YouTube analysis has both source access and a model runtime. */
  youtubeLiveAvailable: boolean;
  youtubeUnavailableReason?: CapabilityAvailabilityReason;
}

function enabled(value: string | undefined): boolean {
  return value === "true";
}

function configured(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Resolves fail-closed server policy without retaining or returning raw
 * environment values. Installation is advisory operator metadata only; it
 * never changes enforcement.
 */
export function resolveApplicationRuntime(
  environment:
    | RuntimeEnvironment
    | ApplicationRuntimeEnvironment = process.env,
): ApplicationRuntimePolicy {
  const profileConfigured =
    environment.APP_PROFILE === "public_demo" ||
    environment.APP_PROFILE === "self_hosted";
  const profile: ApplicationProfile =
    environment.APP_PROFILE === "self_hosted"
      ? "self_hosted"
      : "public_demo";

  const installationConfigured =
    environment.APP_INSTALLATION === "public" ||
    environment.APP_INSTALLATION === "private";
  const installation: Installation =
    environment.APP_INSTALLATION === "private" ? "private" : "public";

  const selfHosted = profile === "self_hosted";
  const serverModelEnabled =
    selfHosted && enabled(environment.ENABLE_SERVER_LLM_KEY);
  const serverModelAvailable =
    serverModelEnabled && configured(environment.LLM_API_KEY);
  const requestScopedModelKeyAllowed =
    selfHosted && enabled(environment.ENABLE_OPENAI_BYOK);
  const modelBackedWorkflowsAvailable =
    serverModelAvailable || requestScopedModelKeyAllowed;

  const modelUnavailableReason = modelBackedWorkflowsAvailable
    ? undefined
    : !selfHosted
      ? ("profile_restricted" as const)
      : serverModelEnabled
        ? ("configuration_missing" as const)
        : ("operator_disabled" as const);

  const youtubePolicyApproved = enabled(
    environment.YOUTUBE_POLICY_APPROVED,
  );
  const youtubeOperatorEnabled = enabled(
    environment.ENABLE_YOUTUBE_API,
  );
  const youtubeSourceAvailable =
    selfHosted &&
    youtubePolicyApproved &&
    youtubeOperatorEnabled &&
    configured(environment.YOUTUBE_API_KEY);
  const youtubeLiveAvailable =
    youtubeSourceAvailable && modelBackedWorkflowsAvailable;

  const youtubeUnavailableReason = youtubeLiveAvailable
    ? undefined
    : !selfHosted
      ? ("profile_restricted" as const)
      : !youtubePolicyApproved
        ? ("policy_approval_required" as const)
        : !youtubeOperatorEnabled
          ? ("operator_disabled" as const)
          : !configured(environment.YOUTUBE_API_KEY)
            ? ("configuration_missing" as const)
            : modelUnavailableReason;

  return {
    profile,
    installation,
    profileConfigured,
    installationConfigured,
    serverModelEnabled,
    serverModelAvailable,
    requestScopedModelKeyAllowed,
    modelBackedWorkflowsAvailable,
    ...(modelUnavailableReason === undefined
      ? {}
      : { modelUnavailableReason }),
    youtubeSourceAvailable,
    youtubeLiveAvailable,
    ...(youtubeUnavailableReason === undefined
      ? {}
      : { youtubeUnavailableReason }),
  };
}
