/**
 * Runtime profile and feature availability, driven exclusively by the
 * server-owned capability contract.
 *
 * A missing, unreadable, or invalid response fails closed to the public demo:
 * the client-local synthetic journey remains usable, while no external source
 * form or model-backed action is exposed.
 */
import {
  CapabilitiesResponseSchema,
  type CapabilitiesResponse,
  type CapabilityAvailability,
  type CapabilityAvailabilityReason,
} from "@/contracts";
import type {
  OutputId,
  SourceOption,
} from "@/app/_lib/platforms";

export interface RuntimeContext {
  profile: CapabilitiesResponse["profile"];
  /** Null when the capabilities endpoint is absent, unreadable, or invalid. */
  capabilities: CapabilitiesResponse | null;
}

/** Safe default: synthetic demo only, no external calls or credential entry. */
export const PUBLIC_RUNTIME: RuntimeContext = {
  profile: "public_demo",
  capabilities: null,
};

export function runtimeContextFromPayload(payload: unknown): RuntimeContext {
  const parsed = CapabilitiesResponseSchema.safeParse(payload);
  if (!parsed.success) return PUBLIC_RUNTIME;
  return {
    profile: parsed.data.profile,
    capabilities: parsed.data,
  };
}

export async function fetchRuntimeContext(): Promise<RuntimeContext> {
  try {
    const response = await fetch("/api/capabilities", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return PUBLIC_RUNTIME;
    return runtimeContextFromPayload(await response.json());
  } catch {
    return PUBLIC_RUNTIME;
  }
}

export interface CapabilityUiState {
  /** Whether the action may expose an interactive control or issue a call. */
  interactive: boolean;
  /** Copy explaining a non-interactive state. */
  reason?: string;
}

const PUBLIC_REASONS: Partial<Record<SourceOption["id"], string>> = {
  "youtube-live":
    "Live YouTube analysis isn't available in this hosted demo. Run NextBestContent in a self-hosted installation to analyze your channel.",
  import:
    "Comment-import processing isn't available in this hosted demo. A self-hosted installation can analyze rights-confirmed creator exports.",
};

const REASON_LABELS: Record<CapabilityAvailabilityReason, string> = {
  profile_restricted:
    "This action isn't available in the public demo profile.",
  operator_disabled:
    "Disabled by this installation's operator configuration.",
  configuration_missing:
    "This installation is missing required local configuration.",
  policy_approval_required:
    "The required platform policy approval has not been enabled.",
  access_not_available:
    "The required platform access is not available for this installation.",
  not_implemented: "This capability isn't implemented yet.",
};

function unavailableState(
  capability: CapabilityAvailability,
): CapabilityUiState {
  if (capability.available) return { interactive: true };
  return {
    interactive: false,
    reason: REASON_LABELS[capability.reason],
  };
}

/**
 * Resolves how a source option renders under the active server profile.
 * LinkedIn direct reads remain unavailable, while imports use the generic
 * rights-confirmed creator-import capability.
 */
export function sourceOptionState(
  option: SourceOption,
  runtime: RuntimeContext,
): CapabilityUiState {
  if (option.mode === "demo") {
    const demo = runtime.capabilities?.availability.demo;
    return demo === undefined ? { interactive: true } : unavailableState(demo);
  }

  if (option.id === "linkedin-live") {
    const directRead =
      runtime.capabilities?.availability.linkedinDirectRead;
    return {
      interactive: false,
      reason:
        directRead !== undefined && !directRead.available
          ? REASON_LABELS[directRead.reason]
          : option.unavailableReason,
    };
  }

  if (runtime.profile === "public_demo") {
    return {
      interactive: false,
      reason: PUBLIC_REASONS[option.id] ?? option.unavailableReason,
    };
  }

  const availability = runtime.capabilities?.availability;
  if (availability === undefined) {
    return {
      interactive: false,
      reason: "Capabilities could not be verified for this installation.",
    };
  }

  return unavailableState(
    option.id === "youtube-live"
      ? availability.youtubeLive
      : availability.import,
  );
}

const TARGET_INDEX: Partial<Record<OutputId, 0 | 1>> = {
  "youtube-short": 0,
  "linkedin-document": 1,
};

/**
 * Synthetic generation is client-local and keeps both contracted demo formats
 * visible. Live runs follow the server's ordered model-generation targets.
 */
export function outputGenerationState(
  outputId: OutputId,
  mode: "live" | "demo",
  runtime: RuntimeContext,
): CapabilityUiState {
  if (mode === "demo") return { interactive: true };

  const targetIndex = TARGET_INDEX[outputId];
  if (targetIndex === undefined) {
    return {
      interactive: false,
      reason: "This destination is not implemented yet.",
    };
  }

  const target = runtime.capabilities?.targets[targetIndex];
  if (target === undefined) {
    return {
      interactive: false,
      reason: "Destination capabilities could not be verified.",
    };
  }
  return unavailableState(target.generation);
}

export function allowsRequestScopedModelKey(
  runtime: RuntimeContext,
): boolean {
  return (
    runtime.profile === "self_hosted" &&
    runtime.capabilities?.availability.requestScopedModelKey.available === true
  );
}
