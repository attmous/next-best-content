/**
 * Frontend platform & capability registry.
 *
 * Single source of truth for which source platforms, source modes, target
 * platforms, and outputs exist, what each one is called, and whether it is
 * available, gated, or coming soon. Screens render from this registry instead
 * of scattering `if (platform === …)` conditionals.
 *
 * Source platform and target platform are deliberately independent concepts:
 * a creator may import LinkedIn comments and produce a YouTube Short, or
 * analyze a YouTube video and produce a LinkedIn document post.
 */
import type { ContentFormat } from "@/contracts";

export type PlatformId = "youtube" | "linkedin" | "x" | "facebook";

/** Imports can come from anywhere, so the source tag allows "other". */
export type SourcePlatformTag = PlatformId | "other";

export type SourceMode = "live" | "import" | "demo";

export type Availability = "available" | "gated" | "coming_soon";

export const PLATFORM_LABELS: Record<PlatformId, string> = {
  youtube: "YouTube",
  linkedin: "LinkedIn",
  x: "X / Twitter",
  facebook: "Facebook",
};

export const SOURCE_TAG_LABELS: Record<SourcePlatformTag, string> = {
  ...PLATFORM_LABELS,
  other: "Other platform",
};

export type SourceOptionId =
  | "youtube-live"
  | "import"
  | "demo"
  | "linkedin-live";

export interface SourceOption {
  id: SourceOptionId;
  /** Fixed source platform, or null when the user tags it (imports). */
  platform: PlatformId | null;
  mode: SourceMode;
  availability: Availability;
  title: string;
  description: string;
  /** Shown when availability is not "available". */
  unavailableReason?: string;
}

export const SOURCE_OPTIONS: SourceOption[] = [
  {
    id: "youtube-live",
    platform: "youtube",
    mode: "live",
    availability: "gated",
    title: "YouTube video",
    description:
      "Paste a video URL and analyze its live comment section through the YouTube Data API.",
    unavailableReason:
      "Live YouTube access runs only when this environment's API and policy gates are both enabled. You can still submit — if the gates are off you'll get a clear error, never substituted data. Importing comments avoids the YouTube gates but still needs the analysis backend.",
  },
  {
    id: "import",
    platform: null,
    mode: "import",
    availability: "available",
    title: "Import comments",
    description:
      "Prepare up to 100 comments you have the right to use — exported from YouTube, LinkedIn, or anywhere else — as JSON, CSV, or pasted text. Analysis still depends on this environment's backend.",
  },
  {
    id: "demo",
    platform: "youtube",
    mode: "demo",
    availability: "available",
    title: "Synthetic demo",
    description:
      "Walk the full journey on clearly labeled fictional data for Adam's channel — nothing is fetched from any platform.",
  },
  {
    id: "linkedin-live",
    platform: "linkedin",
    mode: "live",
    availability: "gated",
    title: "LinkedIn post",
    description:
      "Analyze the comments under one of your LinkedIn posts directly.",
    unavailableReason:
      "Reading LinkedIn comments requires LinkedIn's restricted Community Management API approval, which this build does not have. Export your post's comments and use Import instead.",
  },
];

export type OutputId =
  | "youtube-short"
  | "linkedin-document"
  | "linkedin-text"
  | "x-post"
  | "facebook-post";

export interface TargetOutput {
  id: OutputId;
  platform: PlatformId;
  title: string;
  description: string;
  availability: Availability;
  /**
   * The shared-contract format this output maps onto, or null when the
   * contract cannot express it yet (in which case generation stays disabled).
   */
  contractFormat: ContentFormat | null;
  unavailableReason?: string;
}

export interface TargetPlatformEntry {
  platform: PlatformId;
  availability: Availability;
  outputs: TargetOutput[];
  /** Shown on coming-soon cards instead of outputs. */
  comingSoonCopy?: string;
}

export const TARGET_PLATFORMS: TargetPlatformEntry[] = [
  {
    platform: "youtube",
    availability: "available",
    outputs: [
      {
        id: "youtube-short",
        platform: "youtube",
        title: "YouTube Short",
        description:
          "A six-scene vertical video storyboard with hook, voiceover, and timings.",
        availability: "available",
        contractFormat: "short",
      },
    ],
  },
  {
    platform: "linkedin",
    availability: "available",
    outputs: [
      {
        id: "linkedin-document",
        platform: "linkedin",
        title: "Document post",
        description:
          "A six-page swipeable document (carousel) with post text, CTA, and hashtags.",
        availability: "available",
        contractFormat: "carousel",
      },
      {
        id: "linkedin-text",
        platform: "linkedin",
        title: "Text post",
        description: "A single evidence-backed text post.",
        availability: "gated",
        contractFormat: null,
        unavailableReason:
          "The shared contract only defines short and carousel packs today. Text-post generation stays off until the contract adds a text format — no fake drafts.",
      },
    ],
  },
  {
    platform: "x",
    availability: "coming_soon",
    outputs: [],
    comingSoonCopy:
      "X / Twitter threads and posts are on the roadmap. Nothing is drafted or published for X yet.",
  },
  {
    platform: "facebook",
    availability: "coming_soon",
    outputs: [],
    comingSoonCopy:
      "Facebook posts and Reels are on the roadmap. Nothing is drafted or published for Facebook yet.",
  },
];

const ALL_OUTPUTS: TargetOutput[] = TARGET_PLATFORMS.flatMap(
  (entry) => entry.outputs,
);

export function getOutput(id: OutputId): TargetOutput {
  const output = ALL_OUTPUTS.find((candidate) => candidate.id === id);
  if (!output) {
    throw new Error(`Unknown output: ${id}`);
  }
  return output;
}

export function availableOutputs(): TargetOutput[] {
  return ALL_OUTPUTS.filter((output) => output.availability === "available");
}

/**
 * Maps a signal's recommended contract format to the default destination:
 * shorts land on YouTube, carousels on LinkedIn as document posts.
 */
export function recommendedOutputFor(format: ContentFormat): OutputId {
  return format === "short" ? "youtube-short" : "linkedin-document";
}

/** What the creator selected on the source screen, carried through the run. */
export interface SourceDescriptor {
  mode: SourceMode;
  platform: SourcePlatformTag;
  /** URL the creator provided (video URL or original-post URL). */
  url?: string;
  /** Imported file name, when the comments came from a file. */
  fileName?: string;
  /** Number of comments the creator imported. */
  importedCommentCount?: number;
}

export const SOURCE_MODE_LABELS: Record<SourceMode, string> = {
  live: "Live data",
  import: "Creator import",
  demo: "Synthetic demo",
};

export function describeSource(source: SourceDescriptor): string {
  const platform = SOURCE_TAG_LABELS[source.platform];
  switch (source.mode) {
    case "live":
      return `Live ${platform} comments`;
    case "import":
      return `Creator-imported ${platform} comments`;
    case "demo":
      return `Synthetic demo shaped like ${platform} comments`;
  }
}
