import type { Provenance } from "@/contracts";
import {
  SOURCE_MODE_LABELS,
  SOURCE_TAG_LABELS,
  type SourceDescriptor,
} from "@/app/_lib/platforms";
import { PlatformIcon, SourceModeIcon } from "@/app/_components/icons";
import { ProvenanceBadge } from "@/app/_components/ui";

/**
 * Compact receipt describing where the audience signal came from: source
 * platform, source mode, and the file or URL behind it. Rendered wherever
 * results are shown so provenance never disappears.
 */
export function SourceReceipt({
  source,
  provenance,
}: {
  source: SourceDescriptor;
  provenance: Provenance;
}) {
  return (
    <dl
      aria-label="Source receipt"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-surface-raised px-4 py-2.5 text-xs text-ink-soft"
    >
      <div className="flex items-center gap-1.5">
        <dt className="sr-only">Source platform</dt>
        <dd className="flex items-center gap-1.5 font-medium text-ink">
          <PlatformIcon
            platform={source.platform}
            className="size-3.5 text-ink-soft"
          />
          {SOURCE_TAG_LABELS[source.platform]}
        </dd>
      </div>
      <div className="flex items-center gap-1.5">
        <dt className="sr-only">Source mode</dt>
        <dd className="flex items-center gap-1.5 font-medium text-ink">
          <SourceModeIcon mode={source.mode} className="size-3.5 text-ink-soft" />
          {SOURCE_MODE_LABELS[source.mode]}
        </dd>
      </div>
      {source.fileName && (
        <div className="flex min-w-0 items-center gap-1.5">
          <dt className="uppercase tracking-wide text-ink-faint">File</dt>
          <dd className="max-w-48 truncate font-mono">{source.fileName}</dd>
        </div>
      )}
      {source.mode === "import" &&
        typeof source.importedCommentCount === "number" && (
          <div className="flex items-center gap-1.5">
            <dt className="uppercase tracking-wide text-ink-faint">Comments</dt>
            <dd className="font-medium text-ink">
              {source.importedCommentCount}
            </dd>
          </div>
        )}
      {source.url && (
        <div className="flex min-w-0 items-center gap-1.5">
          <dt className="uppercase tracking-wide text-ink-faint">URL</dt>
          <dd className="max-w-64 truncate">{source.url}</dd>
        </div>
      )}
      <div className="ml-auto">
        <ProvenanceBadge provenance={provenance} />
      </div>
    </dl>
  );
}
