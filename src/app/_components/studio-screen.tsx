"use client";

import type { ContentFormat, ContentPack, Signal } from "@/contracts";
import type { UiError } from "@/app/_lib/errors";
import { CarouselView } from "@/app/_components/carousel-view";
import { InlineTextArea } from "@/app/_components/inline-edit";
import { ShortPreview } from "@/app/_components/short-preview";
import {
  Button,
  ProvenanceBadge,
  SectionLabel,
  Spinner,
} from "@/app/_components/ui";

const FORMAT_LABELS: Record<ContentFormat, string> = {
  short: "YouTube Short",
  carousel: "Carousel",
};

export function StudioScreen({
  signal,
  packs,
  activeFormat,
  generating,
  generateError,
  onSelectFormat,
  onRetryGenerate,
  onPackChange,
  onBack,
  onPreflight,
}: {
  signal: Signal;
  packs: Partial<Record<ContentFormat, ContentPack>>;
  activeFormat: ContentFormat;
  generating: boolean;
  generateError: UiError | null;
  onSelectFormat: (format: ContentFormat) => void;
  onRetryGenerate: () => void;
  onPackChange: (format: ContentFormat, pack: ContentPack) => void;
  onBack: () => void;
  onPreflight: () => void;
}) {
  const pack = packs[activeFormat];

  function updateScene(
    sceneIndex: number,
    field: "headline" | "body",
    value: string,
  ) {
    if (!pack) return;
    onPackChange(activeFormat, {
      ...pack,
      scenes: pack.scenes.map((scene, index) =>
        index === sceneIndex ? { ...scene, [field]: value } : scene,
      ),
    });
  }

  return (
    <div className="stage-enter mx-auto flex w-full max-w-6xl flex-col gap-8">
      <section>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <SectionLabel>Content studio</SectionLabel>
          {pack && <ProvenanceBadge provenance={pack.provenance} />}
        </div>
        <h1
          id="stage-heading"
          tabIndex={-1}
          className="mt-3 max-w-3xl font-display text-3xl font-bold tracking-tight text-ink outline-none sm:text-4xl"
        >
          {pack?.title ?? signal.recommendation.workingTitle}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
          Built from the signal “{signal.title}” —{" "}
          {signal.evidenceCount} supporting comments travel with this draft.
        </p>
      </section>

      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
          Format
        </legend>
        <div className="mt-2 inline-flex rounded-xl border border-line bg-surface p-1">
          {(Object.keys(FORMAT_LABELS) as ContentFormat[]).map((format) => {
            const isActive = format === activeFormat;
            const isRecommended =
              format === signal.recommendation.suggestedFormat;
            return (
              <button
                key={format}
                type="button"
                onClick={() => onSelectFormat(format)}
                aria-pressed={isActive}
                disabled={generating}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                  isActive
                    ? "bg-signal text-signal-ink"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                {FORMAT_LABELS[format]}
                {isRecommended && (
                  <span
                    className={`ml-2 text-[10px] uppercase tracking-wide ${isActive ? "text-signal-ink/70" : "text-signal"}`}
                  >
                    Recommended
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </fieldset>

      {generating && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-6 py-10 text-ink-soft"
        >
          <Spinner />
          <span>
            Drafting six {activeFormat === "short" ? "scenes" : "slides"} from
            the audience signal…
          </span>
        </div>
      )}

      {!generating && generateError && (
        <div
          role="alert"
          className="rounded-2xl border border-danger/40 bg-danger/5 p-6"
        >
          <p className="font-semibold text-ink">{generateError.title}</p>
          <p className="mt-1 text-sm leading-6 text-ink-soft">
            {generateError.description}
          </p>
          <div className="mt-4 flex gap-3">
            {generateError.retryable && (
              <Button onClick={onRetryGenerate}>Try again</Button>
            )}
            <Button variant="ghost" onClick={onBack}>
              Back to signals
            </Button>
          </div>
        </div>
      )}

      {!generating && !generateError && pack && (
        <>
          <section aria-label="Hook">
            <div className="rounded-2xl border border-line bg-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-signal">
                Hook · the first two seconds · editable
              </p>
              <InlineTextArea
                label="Hook"
                value={pack.hook}
                onChange={(value) =>
                  onPackChange(activeFormat, { ...pack, hook: value })
                }
                className="mt-1 font-display text-lg leading-6.5 text-ink"
                rows={2}
              />
            </div>
          </section>

          <section aria-label="Preview and scenes">
            {activeFormat === "short" ? (
              <ShortPreview pack={pack} onSceneChange={updateScene} />
            ) : (
              <CarouselView pack={pack} onSceneChange={updateScene} />
            )}
          </section>
        </>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <Button variant="ghost" onClick={onBack}>
          ← Back to signals
        </Button>
        <Button onClick={onPreflight} disabled={!pack || generating}>
          Run preflight checks
        </Button>
      </div>
    </div>
  );
}
