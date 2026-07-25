"use client";

import { useEffect, useRef, useState } from "react";

import type { ContentPack } from "@/contracts";
import {
  buildCaptionText,
  buildStoryboardMarkdown,
  copyToClipboard,
  downloadSlideImage,
  downloadTextFile,
} from "@/app/_lib/exports";
import {
  Button,
  ProvenanceBadge,
  SectionLabel,
} from "@/app/_components/ui";

export function ExportScreen({
  pack,
  onBack,
  onRestart,
}: {
  pack: ContentPack;
  onBack: () => void;
  onRestart: () => void;
}) {
  const isShort = pack.format === "short";
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const [downloadingSlides, setDownloadingSlides] = useState(false);
  const copyResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyResetTimer.current) clearTimeout(copyResetTimer.current);
    };
  }, []);

  async function handleCopyCaption() {
    const success = await copyToClipboard(buildCaptionText(pack));
    setCopyState(success ? "copied" : "failed");
    if (copyResetTimer.current) clearTimeout(copyResetTimer.current);
    copyResetTimer.current = setTimeout(() => setCopyState("idle"), 2_500);
  }

  async function handleDownloadAllSlides() {
    setDownloadingSlides(true);
    try {
      // Sequential with a small gap so browsers accept every download.
      for (let index = 0; index < pack.scenes.length; index += 1) {
        await downloadSlideImage(pack, index);
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
    } finally {
      setDownloadingSlides(false);
    }
  }

  return (
    <div className="stage-enter mx-auto flex w-full max-w-5xl flex-col gap-8">
      <section>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <SectionLabel>Export</SectionLabel>
          <ProvenanceBadge provenance={pack.provenance} />
        </div>
        <h1
          id="stage-heading"
          tabIndex={-1}
          className="mt-3 max-w-3xl font-display text-3xl font-bold tracking-tight text-ink outline-none sm:text-4xl"
        >
          {pack.title}
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          {isShort
            ? "YouTube Short · six scenes · timed storyboard"
            : "Carousel · six slides"}
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Final preview */}
        <section
          aria-label="Final preview"
          className="rounded-3xl border border-line bg-surface p-6"
        >
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Final preview
          </h2>
          <p className="mt-3 font-display text-lg leading-6.5 text-ink">
            “{pack.hook}”
          </p>
          <ol className="mt-5 flex flex-col gap-3">
            {pack.scenes.map((scene) => (
              <li
                key={scene.index}
                className="flex gap-4 rounded-xl bg-surface-raised px-4 py-3"
              >
                <span className="font-display text-sm font-bold text-signal">
                  {scene.index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">
                    {scene.headline}
                    {isShort && (
                      <span className="ml-2 font-normal text-ink-faint">
                        {scene.durationSeconds}s
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-sm leading-5.5 text-ink-soft">
                    {scene.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className="flex flex-col gap-6">
          {/* Caption */}
          <section
            aria-label="Caption"
            className="rounded-3xl border border-line bg-surface p-6"
          >
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Caption
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink">
              {buildCaptionText(pack)}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <Button variant="secondary" onClick={handleCopyCaption}>
                {copyState === "copied" ? "Copied ✓" : "Copy caption"}
              </Button>
              <span aria-live="polite" className="text-xs text-ink-faint">
                {copyState === "copied"
                  ? "Caption and hashtags are on your clipboard."
                  : copyState === "failed"
                    ? "Clipboard was blocked — select and copy the text above."
                    : ""}
              </span>
            </div>
          </section>

          {/* Evidence summary */}
          <section
            aria-label="Why this content exists"
            className="rounded-3xl border border-signal/25 bg-surface p-6"
          >
            <h2 className="text-xs font-semibold uppercase tracking-wide text-signal">
              Why this content exists
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink">
              Answers the signal{" "}
              <strong className="font-semibold">
                “{pack.sourceSignal.title}”
              </strong>{" "}
              — backed by {pack.sourceSignal.evidenceCount} audience comments.
            </p>
            <figure className="mt-3 rounded-xl border-l-2 border-signal/60 bg-surface-raised px-3.5 py-2.5">
              <blockquote className="text-sm leading-5.5 text-ink-soft">
                “{pack.sourceEvidence[0].text}”
              </blockquote>
              <figcaption className="mt-1.5 text-xs text-ink-faint">
                {pack.sourceEvidence[0].author} ·{" "}
                {pack.sourceEvidence[0].likeCount.toLocaleString("en-US")} likes
              </figcaption>
            </figure>
          </section>

          {/* Downloads */}
          <section
            aria-label="Downloads"
            className="rounded-3xl border border-line bg-surface p-6"
          >
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Downloads
            </h2>
            <div className="mt-4 flex flex-col gap-3">
              <Button
                variant="secondary"
                onClick={() =>
                  downloadTextFile(
                    `nextbestcontent-${pack.format}-storyboard.md`,
                    buildStoryboardMarkdown(pack),
                  )
                }
                className="justify-start"
              >
                Download storyboard (.md)
              </Button>
              {!isShort && (
                <Button
                  variant="secondary"
                  onClick={handleDownloadAllSlides}
                  loading={downloadingSlides}
                  loadingLabel="Rendering slides…"
                  className="justify-start"
                >
                  Download all 6 slides (.png)
                </Button>
              )}
              <div className="rounded-xl border border-dashed border-line px-4 py-3 text-sm text-ink-faint">
                {isShort ? (
                  <>
                    <p className="font-medium text-ink-soft">
                      MP4 render · not available
                    </p>
                    <p className="mt-0.5 text-xs leading-5">
                      Video rendering isn&rsquo;t part of this build — the
                      storyboard file above carries every scene, timing, and
                      voiceover line.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-ink-soft">
                      Slide PNGs are rendered locally
                    </p>
                    <p className="mt-0.5 text-xs leading-5">
                      Each 1080×1350 image is drawn in your browser — nothing
                      is uploaded anywhere.
                    </p>
                  </>
                )}
              </div>
              <div className="rounded-xl border border-dashed border-line px-4 py-3 text-sm text-ink-faint">
                <p className="font-medium text-ink-soft">
                  Narration audio · not available
                </p>
                <p className="mt-0.5 text-xs leading-5">
                  The ElevenLabs integration is disabled in this build. The
                  voiceover ships as a script inside the storyboard file.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <Button variant="ghost" onClick={onBack}>
          ← Back to preflight
        </Button>
        <Button variant="secondary" onClick={onRestart}>
          Analyze another video
        </Button>
      </div>
    </div>
  );
}
