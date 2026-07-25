/**
 * Runtime profile detection, driven by the backend capability response.
 *
 * The server owns `/api/capabilities` (shape defined in the shared
 * contracts once the backend intelligence PR lands). The frontend never
 * guesses from environment variables or hosting checks: it asks the
 * backend, and when the endpoint is absent or unreadable it falls back to
 * the safest profile — `public_demo`, where only the synthetic demo runs
 * and no external analyze/generate calls are made.
 *
 * The schema here is deliberately tolerant (unknown fields pass through,
 * every capability optional) so the frontend keeps working as the server
 * evolves; it is not a second source of truth.
 */
import { z } from "zod";

import type { SourceOption } from "@/app/_lib/platforms";

export type RuntimeProfile = "public_demo" | "self_hosted";

const CapabilityAvailabilitySchema = z.looseObject({
  available: z.boolean(),
  reason: z.string().optional(),
});
export type CapabilityAvailability = z.infer<
  typeof CapabilityAvailabilitySchema
>;

const CapabilitiesSchema = z.looseObject({
  availability: z
    .looseObject({
      openai: CapabilityAvailabilitySchema.optional(),
      import: CapabilityAvailabilitySchema.optional(),
      youtubeLive: CapabilityAvailabilitySchema.optional(),
      linkedinImport: CapabilityAvailabilitySchema.optional(),
      linkedinDirectRead: CapabilityAvailabilitySchema.optional(),
      youtubeShort: CapabilityAvailabilitySchema.optional(),
      linkedinDocument: CapabilityAvailabilitySchema.optional(),
      linkedinPublish: CapabilityAvailabilitySchema.optional(),
    })
    .optional(),
});
export type Capabilities = z.infer<typeof CapabilitiesSchema>;

export interface RuntimeContext {
  profile: RuntimeProfile;
  /** Null when the capabilities endpoint is absent or unreadable. */
  capabilities: Capabilities | null;
}

/** Safe default: synthetic demo only, no external calls. */
export const PUBLIC_RUNTIME: RuntimeContext = {
  profile: "public_demo",
  capabilities: null,
};

/**
 * An installation counts as self-hosted when the backend affirms at least
 * one private capability (a model key, import processing, or live YouTube).
 */
export function deriveProfile(
  capabilities: Capabilities | null,
): RuntimeProfile {
  const availability = capabilities?.availability;
  if (!availability) return "public_demo";
  return availability.openai?.available ||
    availability.import?.available ||
    availability.youtubeLive?.available
    ? "self_hosted"
    : "public_demo";
}

export async function fetchRuntimeContext(): Promise<RuntimeContext> {
  try {
    const response = await fetch("/api/capabilities", {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return PUBLIC_RUNTIME;
    const parsed = CapabilitiesSchema.safeParse(await response.json());
    if (!parsed.success) return PUBLIC_RUNTIME;
    return { profile: deriveProfile(parsed.data), capabilities: parsed.data };
  } catch {
    return PUBLIC_RUNTIME;
  }
}

export interface SourceOptionState {
  /** Whether the option opens an actionable panel (forms, submissions). */
  interactive: boolean;
  /** Copy explaining a non-interactive state. */
  reason?: string;
}

const PUBLIC_REASONS: Partial<Record<SourceOption["id"], string>> = {
  "youtube-live":
    "Live YouTube analysis isn't available in this hosted demo. Run NextBestContent privately with your own key to analyze your channel.",
  import:
    "Comment-import processing isn't available in this hosted demo. The private self-hosted version processes your exports locally.",
};

const REASON_LABELS: Record<string, string> = {
  configuration_missing:
    "Not configured in this installation — enable it through the container environment.",
  policy_gate_disabled:
    "The required policy gates are switched off in this installation's environment.",
  not_implemented: "This capability isn't implemented by the backend yet.",
};

function selfHostedReason(capability: CapabilityAvailability | undefined) {
  const reason = capability?.reason;
  return (
    (reason && REASON_LABELS[reason]) ??
    "Disabled by this installation's configuration — enable it through the container environment."
  );
}

/**
 * Resolves how a source option renders under the current runtime. The
 * synthetic demo is always actionable; everything external must be
 * affirmed by the backend before it becomes interactive, so a
 * non-interactive option can never trigger an API call.
 */
export function sourceOptionState(
  option: SourceOption,
  runtime: RuntimeContext,
): SourceOptionState {
  if (option.mode === "demo") {
    return { interactive: true };
  }

  // LinkedIn direct reads stay unavailable everywhere (restricted API).
  if (option.id === "linkedin-live") {
    return { interactive: false, reason: option.unavailableReason };
  }

  if (runtime.profile === "public_demo") {
    return {
      interactive: false,
      reason: PUBLIC_REASONS[option.id] ?? option.unavailableReason,
    };
  }

  const availability = runtime.capabilities?.availability;
  const capability =
    option.id === "youtube-live" ? availability?.youtubeLive : availability?.import;

  if (capability?.available) {
    return { interactive: true };
  }
  return { interactive: false, reason: selfHostedReason(capability) };
}
