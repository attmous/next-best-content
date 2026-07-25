"use client";

import type { ContentPack, Signal } from "@/contracts";
import type { UiError } from "@/app/_lib/errors";
import {
  PLATFORM_LABELS,
  availableOutputs,
  getOutput,
  recommendedOutputFor,
  type OutputId,
} from "@/app/_lib/platforms";
import { CarouselView } from "@/app/_components/carousel-view";
import { PlatformIcon } from "@/app/_components/icons";
import { InlineTextArea } from "@/app/_components/inline-edit";
import { ShortPreview } from "@/app/_components/short-preview";
import {
  Button,
  ProvenanceBadge,
  SectionLabel,
  Spinner,
} from "@/app/_components/ui";

export function StudioScreen({
  signal,
  packs,
  outputId,
  generating,
  generateError,
  onSwitchOutput,
  onChangeDestination,
  onRetryGenerate,
  onPackChange,
  onBack,
  onPreflight,
}: {
  signal: Signal;
  packs: Partial<Record<OutputId, ContentPack>>;
  outputId: OutputId;
  generating: boolean;
  generateError: UiError | null;
  onSwitchOutput: (outputId: OutputId) => void;
  onChangeDestination: () => void;
  onRetryGenerate: () => void;
  onPackChange: (outputId: OutputId, pack: ContentPack) => void;
  onBack: () => void;
  onPreflight: () => void;
}) {
  const output = getOutput(outputId);
  const pack = packs[outputId];
  const recommendedId = recommendedOutputFor(
    signal.recommendation.suggestedFormat,
  );

  function updateScene(
    sceneIndex: number,
    field: "headline" | "body",
    value: string,
  ) {
    if (!pack) return;
    onPackChange(outputId, {
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
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-3 py-1 text-xs font-semibold text-ink">
            <PlatformIcon
              platform={output.platform}
              className="size-3.5 text-ink-soft"
            />
            For {PLATFORM_LABELS[output.platform]} · {output.title}
          </span>
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
          Built from the signal “{signal.title}” — {signal.evidenceCount}{" "}
          supporting comments travel with this draft.
        </p>
      </section>

      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
          Destination
        </legend>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-xl border border-line bg-surface p-1">
            {availableOutputs().map((candidate) => {
              const isActive = candidate.id === outputId;
              const isRecommended = candidate.id === recommendedId;
              return (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => onSwitchOutput(candidate.id)}
                  aria-pressed={isActive}
                  disabled={generating}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                    isActive
                      ? "bg-signal text-signal-ink"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  <PlatformIcon
                    platform={candidate.platform}
                    className="size-4"
                  />
                  {candidate.title.startsWith(
                    PLATFORM_LABELS[candidate.platform],
                  )
                    ? candidate.title
                    : `${PLATFORM_LABELS[candidate.platform]} ${candidate.title}`}
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
          <Button variant="ghost" onClick={onChangeDestination}>
            All destinations…
          </Button>
        </div>
      </fieldset>

      {generating && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-6 py-10 text-ink-soft"
        >
          <Spinner />
          <span>
            Drafting six{" "}
            {output.contractFormat === "short" ? "scenes" : "pages"} from the
            audience signal…
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
                Hook ·{" "}
                {output.contractFormat === "short"
                  ? "the first two seconds"
                  : "the opening line"}{" "}
                · editable
              </p>
              <InlineTextArea
                label="Hook"
                value={pack.hook}
                onChange={(value) =>
                  onPackChange(outputId, { ...pack, hook: value })
                }
                className="mt-1 font-display text-lg leading-6.5 text-ink"
                rows={2}
              />
            </div>
          </section>

          <section aria-label="Preview and scenes">
            {output.contractFormat === "short" ? (
              <ShortPreview pack={pack} onSceneChange={updateScene} />
            ) : (
              <CarouselView
                pack={pack}
                variant={
                  output.platform === "linkedin" ? "linkedin-document" : "generic"
                }
                onSceneChange={updateScene}
              />
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
