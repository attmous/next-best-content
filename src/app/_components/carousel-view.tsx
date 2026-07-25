"use client";

import { useState } from "react";

import type { ContentPack } from "@/contracts";
import { InlineTextArea, InlineTextInput } from "@/app/_components/inline-edit";

/**
 * Six-slide carousel with keyboard-navigable slide stepping and lean inline
 * editing of the on-slide copy.
 */
export function CarouselView({
  pack,
  onSceneChange,
}: {
  pack: ContentPack;
  onSceneChange: (
    sceneIndex: number,
    field: "headline" | "body",
    value: string,
  ) => void;
}) {
  const [current, setCurrent] = useState(0);
  const scene = pack.scenes[current];

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="mx-auto w-full max-w-[340px] shrink-0 lg:mx-0">
        {/* Slide (4:5) */}
        <div
          role="group"
          aria-roledescription="slide"
          aria-label={`Slide ${current + 1} of ${pack.scenes.length}`}
          className="relative flex aspect-[4/5] flex-col overflow-hidden rounded-3xl border border-line-strong bg-[#12130f] p-7 shadow-2xl shadow-black/40"
        >
          <span
            aria-hidden="true"
            className="mb-5 block h-1.5 w-16 rounded-full bg-signal"
          />
          <InlineTextInput
            label={`Slide ${current + 1} headline`}
            value={scene.headline}
            onChange={(value) => onSceneChange(current, "headline", value)}
            className="font-display text-2xl font-bold leading-tight text-white"
          />
          <InlineTextArea
            label={`Slide ${current + 1} body`}
            value={scene.body}
            onChange={(value) => onSceneChange(current, "body", value)}
            className="mt-3 flex-1 text-sm leading-6 text-white/85"
            rows={5}
          />
          <div className="mt-auto flex items-center justify-between pt-4 text-[10px] uppercase tracking-[0.18em] text-white/40">
            <span>NextBestContent</span>
            <span>
              {current + 1} / {pack.scenes.length}
            </span>
          </div>
        </div>

        {/* Slide navigation */}
        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCurrent((index) => Math.max(0, index - 1))}
            disabled={current === 0}
            className="rounded-lg border border-line-strong px-3 py-1.5 text-sm text-ink hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Previous
          </button>
          <ol className="flex gap-1.5" aria-label="Slides">
            {pack.scenes.map((item, index) => (
              <li key={item.index}>
                <button
                  type="button"
                  onClick={() => setCurrent(index)}
                  aria-label={`Go to slide ${index + 1}`}
                  aria-current={index === current ? "true" : undefined}
                  className={`block size-2.5 rounded-full transition-colors ${
                    index === current
                      ? "bg-signal"
                      : "bg-line-strong hover:bg-ink-faint"
                  }`}
                />
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={() =>
              setCurrent((index) => Math.min(pack.scenes.length - 1, index + 1))
            }
            disabled={current === pack.scenes.length - 1}
            className="rounded-lg border border-line-strong px-3 py-1.5 text-sm text-ink hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next →
          </button>
        </div>
        <p className="mt-2 text-xs text-ink-faint">
          Headline and body are editable directly on the slide.
        </p>
      </div>

      {/* Caption, CTA, hashtags */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Visual direction · slide {current + 1}
            </p>
            <p className="mt-1 text-sm leading-6 text-ink-soft">
              {scene.visualDirection}
            </p>
          </div>
          <div className="border-t border-line pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Caption
            </p>
            <p className="mt-1 text-sm leading-6 text-ink">{pack.caption}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Call to action
            </p>
            <p className="mt-1 text-sm font-medium text-ink">{pack.cta}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Hashtags
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {pack.hashtags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full bg-surface-raised px-2.5 py-1 text-xs text-ink-soft"
                >
                  {tag}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
