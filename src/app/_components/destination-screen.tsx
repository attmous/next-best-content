"use client";

import type { Signal } from "@/contracts";
import {
  PLATFORM_LABELS,
  TARGET_PLATFORMS,
  recommendedOutputFor,
  type OutputId,
} from "@/app/_lib/platforms";
import { Button, SectionLabel } from "@/app/_components/ui";

/**
 * Flow 3: choose the destination platform and output, independent of where
 * the audience signal came from. Rendered entirely from the platform
 * registry — coming-soon platforms are informational only and trigger no
 * calls of any kind.
 */
export function DestinationScreen({
  signal,
  onSelect,
  onBack,
}: {
  signal: Signal;
  onSelect: (outputId: OutputId) => void;
  onBack: () => void;
}) {
  const recommendedId = recommendedOutputFor(
    signal.recommendation.suggestedFormat,
  );

  return (
    <div className="stage-enter mx-auto flex w-full max-w-5xl flex-col gap-8">
      <section>
        <SectionLabel>Destination</SectionLabel>
        <h1
          id="stage-heading"
          tabIndex={-1}
          className="mt-3 max-w-3xl font-display text-3xl font-bold tracking-tight text-ink outline-none sm:text-4xl"
        >
          Where should this content land?
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
          Creating from the signal “{signal.title}”. The destination is
          independent of the source — audience insight from one platform can
          become content for another.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {TARGET_PLATFORMS.map((entry) => (
          <article
            key={entry.platform}
            aria-label={PLATFORM_LABELS[entry.platform]}
            className={`rounded-3xl border p-6 ${
              entry.availability === "coming_soon"
                ? "border-dashed border-line"
                : "border-line bg-surface"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold text-ink">
                {PLATFORM_LABELS[entry.platform]}
              </h2>
              {entry.availability === "coming_soon" && (
                <span className="rounded-full border border-line-strong px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                  Coming soon
                </span>
              )}
            </div>

            {entry.availability === "coming_soon" ? (
              <p className="mt-3 text-sm leading-6 text-ink-faint">
                {entry.comingSoonCopy}
              </p>
            ) : (
              <ul className="mt-4 flex flex-col gap-3">
                {entry.outputs.map((output) => {
                  const isAvailable = output.availability === "available";
                  const isRecommended = output.id === recommendedId;
                  return (
                    <li key={output.id}>
                      {isAvailable ? (
                        <button
                          type="button"
                          onClick={() => onSelect(output.id)}
                          className={`w-full rounded-2xl border px-4 py-3.5 text-left transition-colors ${
                            isRecommended
                              ? "border-signal/60 bg-signal/5 hover:bg-signal/10"
                              : "border-line-strong hover:bg-surface-raised"
                          }`}
                        >
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-ink">
                              {output.title}
                            </span>
                            {isRecommended && (
                              <span className="rounded-full bg-signal px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-signal-ink">
                                Recommended
                              </span>
                            )}
                          </span>
                          <span className="mt-1 block text-sm leading-5.5 text-ink-soft">
                            {output.description}
                          </span>
                        </button>
                      ) : (
                        <div
                          aria-disabled="true"
                          className="rounded-2xl border border-dashed border-line px-4 py-3.5"
                        >
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-ink-faint">
                              {output.title}
                            </span>
                            <span className="rounded-full border border-line-strong px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                              Not available yet
                            </span>
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-ink-faint">
                            {output.unavailableReason}
                          </span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </article>
        ))}
      </div>

      <div className="border-t border-line pt-5">
        <Button variant="ghost" onClick={onBack}>
          ← Back to signals
        </Button>
      </div>
    </div>
  );
}
