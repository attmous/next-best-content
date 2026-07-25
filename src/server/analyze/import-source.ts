import { randomUUID } from "node:crypto";

import {
  IMPORT_THUMBNAIL_PLACEHOLDER,
  type AnalyzeSource,
  type Provenance,
  type SourceAsset,
  type VideoMetadata,
} from "@/contracts";

import type { AnalysisComment } from "./service";

type ImportSource = Extract<AnalyzeSource, { type: "import" }>;

export interface NormalizedImportSource {
  video: VideoMetadata;
  sourceAsset: SourceAsset;
  comments: AnalysisComment[];
  provenance: Provenance;
}

const PLATFORM_LABELS = {
  youtube: "YouTube",
  linkedin: "LinkedIn",
  other: "Audience",
} as const;

export function normalizeImportSource(
  source: ImportSource,
  createId: () => string = randomUUID,
): NormalizedImportSource {
  const comments = source.comments.map((comment, index) => ({
    id: `import-comment-${index + 1}`,
    ...comment,
  }));

  const sourceAsset: SourceAsset = {
    ...source.sourceAsset,
    platform: source.platform,
    kind: source.sourceAsset?.kind ?? "import",
    sampledCommentCount: comments.length,
  };
  const label = PLATFORM_LABELS[source.platform];

  const video: VideoMetadata =
    source.video ??
    ({
      id: sourceAsset.id ?? `import-${createId()}`,
      title: sourceAsset.title ?? `${label} comment import`,
      channelTitle:
        sourceAsset.creatorName ?? "Creator-supplied audience data",
      thumbnailUrl:
        sourceAsset.thumbnailUrl ?? IMPORT_THUMBNAIL_PLACEHOLDER,
      commentCount: comments.length,
    } satisfies VideoMetadata);

  return {
    video,
    sourceAsset,
    comments,
    provenance: {
      source: "import",
      evidence: "creator_supplied",
      platform: source.platform,
    },
  };
}
