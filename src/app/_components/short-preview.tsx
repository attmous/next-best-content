"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import type { ContentPack } from "@/contracts";
import { InlineTextArea, InlineTextInput } from "@/app/_components/inline-edit";
import { Button } from "@/app/_components/ui";

function subscribeToReducedMotion(onChange: () => void): () => void {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/**
 * 9:16 storyboard player for the Short format. MP4 rendering isn't part of
 * this build, so this is a timed, playable storyboard — scene copy advances
 * on each scene's real duration.
 */
export function ShortPreview({
  pack,
  onSceneChange,
}: {
  pack: ContentPack;
  onSceneChange: (sceneIndex: number, field: "headline" | "body", value: string) => void;
}) {
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  const scene = pack.scenes[current];
  const totalSeconds = useMemo(
    () => pack.scenes.reduce((sum, item) => sum + item.durationSeconds, 0),
    [pack.scenes],
  );

  useEffect(() => {
    if (!playing) return;
    const duration = Math.max(pack.scenes[current].durationSeconds, 1) * 1000;
    const timer = setTimeout(() => {
      if (current >= pack.scenes.length - 1) {
        setPlaying(false);
      } else {
        setCurrent((index) => index + 1);
      }
    }, duration);
    return () => clearTimeout(timer);
  }, [playing, current, pack.scenes]);

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Phone frame */}
      <div className="mx-auto w-full max-w-[270px] shrink-0 lg:mx-0">
        <div className="relative aspect-[9/16] overflow-hidden rounded-[28px] border border-line-strong bg-[#0a0b08] shadow-2xl shadow-black/40">
          {/* Segment progress */}
          <div
            aria-hidden="true"
            className="absolute inset-x-3 top-3 z-10 flex gap-1"
          >
            {pack.scenes.map((item, index) => (
              <span
                key={item.index}
                className="h-1 flex-1 overflow-hidden rounded-full bg-white/20"
              >
                <span
                  className="block h-full bg-signal"
                  style={{
                    width: index < current ? "100%" : index === current ? (playing ? "100%" : "0%") : "0%",
                    transitionProperty: "width",
                    transitionTimingFunction: "linear",
                    transitionDuration:
                      index === current && playing
                        ? `${scene.durationSeconds}s`
                        : "0.01s",
                  }}
                />
              </span>
            ))}
          </div>

          <div className="flex h-full flex-col justify-between p-5 pt-10">
            <p className="font-display text-2xl font-bold leading-tight text-white">
              {scene.headline}
            </p>
            <div>
              <p className="text-sm leading-6 text-white/85">{scene.body}</p>
              <p className="mt-4 text-[10px] uppercase tracking-[0.18em] text-white/40">
                Scene {current + 1} of {pack.scenes.length} ·{" "}
                {scene.durationSeconds}s
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              if (!playing && current >= pack.scenes.length - 1) {
                setCurrent(0);
              }
              setPlaying((value) => !value);
            }}
            aria-label={playing ? "Pause storyboard" : "Play timed storyboard"}
            className="flex-1"
          >
            {playing ? "Pause" : "Play storyboard"}
          </Button>
          <span className="text-xs text-ink-faint">{Math.round(totalSeconds)}s total</span>
        </div>
        {prefersReducedMotion && (
          <p className="mt-2 text-xs leading-5 text-ink-faint">
            Reduced motion is on — playback still advances scenes on their
            timings, without animated transitions.
          </p>
        )}
      </div>

      {/* Scene details + editing */}
      <div className="min-w-0 flex-1">
        <nav aria-label="Scenes">
          <ol className="flex flex-wrap gap-1.5">
            {pack.scenes.map((item, index) => (
              <li key={item.index}>
                <button
                  type="button"
                  onClick={() => {
                    setPlaying(false);
                    setCurrent(index);
                  }}
                  aria-current={index === current ? "true" : undefined}
                  aria-label={`Scene ${index + 1}: ${item.headline}`}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    index === current
                      ? "bg-signal text-signal-ink"
                      : "bg-surface-raised text-ink-soft hover:text-ink"
                  }`}
                >
                  {index + 1}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              On-screen headline · editable
            </p>
            <InlineTextInput
              label={`Scene ${current + 1} headline`}
              value={scene.headline}
              onChange={(value) => onSceneChange(current, "headline", value)}
              className="mt-1 font-display text-lg font-bold text-ink"
            />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              On-screen body · editable
            </p>
            <InlineTextArea
              label={`Scene ${current + 1} body`}
              value={scene.body}
              onChange={(value) => onSceneChange(current, "body", value)}
              className="mt-1 text-sm leading-6 text-ink"
              rows={3}
            />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Voiceover
            </p>
            <p className="mt-1 text-sm leading-6 text-ink-soft">
              {scene.voiceover}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Visual direction
            </p>
            <p className="mt-1 text-sm leading-6 text-ink-soft">
              {scene.visualDirection}
            </p>
          </div>
          <p className="border-t border-line pt-3 text-xs leading-5 text-ink-faint">
            Narration audio isn&rsquo;t available in this build (the ElevenLabs
            integration is disabled), so the voiceover ships as a script. MP4
            rendering is also out of scope — the timed storyboard above is the
            preview.
          </p>
        </div>
      </div>
    </div>
  );
}
