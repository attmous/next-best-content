"use client";

import { useEffect, useRef, useState } from "react";

import type { ContentPack } from "@/contracts";
import {
  buildCaptionText,
  buildStoryboardMarkdown,
  copyToClipboard,
  downloadDocumentPdf,
  downloadSlideImage,
  downloadTextFile,
} from "@/app/_lib/exports";
import {
  PLATFORM_LABELS,
  getOutput,
  type OutputId,
  type SourceDescriptor,
} from "@/app/_lib/platforms";
import { SourceReceipt } from "@/app/_components/source-receipt";
import { Button, ProvenanceBadge, SectionLabel } from "@/app/_components/ui";

export function ExportScreen({
  pack,
  outputId,
  source,
  onBack,
  onRestart,
}: {
  pack: ContentPack;
  outputId: OutputId;
  source: SourceDescriptor;
  onBack: () => void;
  onRestart: () => void;
}) {
  const output = getOutput(outputId);
  const isShort = pack.format === "short";
  const isLinkedinDocument = outputId === "linkedin-document";
  const captionLabel = isLinkedinDocument ? "Post text" : "Caption";

  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const [downloadingSlides, setDownloadingSlides] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState(false);
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

  async function handleDownloadPdf() {
    setDownloadingPdf(true);
    setPdfError(false);
    try {
      await downloadDocumentPdf(pack, "nextbestcontent-linkedin-document.pdf");
    } catch {
      setPdfError(true);
    } finally {
      setDownloadingPdf(false);
    }
  }

  const openLink = isShort
    ? {
        href: "https://studio.youtube.com/",
        label: "Open YouTube Studio",
      }
    : output.platform === "linkedin"
      ? { href: "https://www.linkedin.com/feed/", label: "Open LinkedIn" }
      : null;

  return (
    <div className="stage-enter mx-auto flex w-full max-w-5xl flex-col gap-8">
      <section>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <SectionLabel>Export</SectionLabel>
          <span className="rounded-full border border-line-strong px-3 py-1 text-xs font-semibold text-ink">
            For {PLATFORM_LABELS[output.platform]} · {output.title}
          </span>
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
            : isLinkedinDocument
              ? "LinkedIn document post · six pages"
              : "Carousel · six slides"}
        </p>
        <div className="mt-4">
          <SourceReceipt source={source} provenance={pack.provenance} />
        </div>
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
          {/* Caption / post text */}
          <section
            aria-label={captionLabel}
            className="rounded-3xl border border-line bg-surface p-6"
          >
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              {captionLabel}
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink">
              {buildCaptionText(pack)}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <Button variant="secondary" onClick={handleCopyCaption}>
                {copyState === "copied"
                  ? "Copied ✓"
                  : `Copy ${captionLabel.toLowerCase()}`}
              </Button>
              <span aria-live="polite" className="text-xs text-ink-faint">
                {copyState === "copied"
                  ? "Text and hashtags are on your clipboard."
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
              {isLinkedinDocument && (
                <>
                  <Button
                    onClick={handleDownloadPdf}
                    loading={downloadingPdf}
                    loadingLabel="Building PDF…"
                    className="justify-start"
                  >
                    Download document (.pdf)
                  </Button>
                  {pdfError && (
                    <p role="alert" className="text-xs text-danger">
                      The PDF couldn&rsquo;t be built in this browser — the
                      per-page PNGs below carry the same content.
                    </p>
                  )}
                </>
              )}
              <Button
                variant="secondary"
                onClick={() =>
                  downloadTextFile(
                    `nextbestcontent-${outputId}-storyboard.md`,
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
                  loadingLabel="Rendering images…"
                  className="justify-start"
                >
                  Download all 6 {isLinkedinDocument ? "pages" : "slides"}{" "}
                  (.png)
                </Button>
              )}
              {isShort ? (
                <div className="rounded-xl border border-dashed border-line px-4 py-3 text-sm text-ink-faint">
                  <p className="font-medium text-ink-soft">
                    MP4 render · not available
                  </p>
                  <p className="mt-0.5 text-xs leading-5">
                    Video rendering isn&rsquo;t part of this build — the
                    storyboard file above carries every scene, timing, and
                    voiceover line.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-line px-4 py-3 text-sm text-ink-faint">
                  <p className="font-medium text-ink-soft">
                    Rendered locally in your browser
                  </p>
                  <p className="mt-0.5 text-xs leading-5">
                    {isLinkedinDocument
                      ? "The PDF and page images are assembled on your machine — nothing is uploaded anywhere."
                      : "Each 1080×1350 image is drawn in your browser — nothing is uploaded anywhere."}
                  </p>
                </div>
              )}
              {isShort && (
                <div className="rounded-xl border border-dashed border-line px-4 py-3 text-sm text-ink-faint">
                  <p className="font-medium text-ink-soft">
                    Narration audio · not available
                  </p>
                  <p className="mt-0.5 text-xs leading-5">
                    The ElevenLabs integration is disabled in this build. The
                    voiceover ships as a script inside the storyboard file.
                  </p>
                </div>
              )}
              {openLink && (
                <p className="text-xs leading-5 text-ink-faint">
                  <a
                    href={openLink.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-signal underline-offset-4 hover:underline"
                  >
                    {openLink.label} ↗
                  </a>{" "}
                  — a convenience link only. Nothing is published
                  automatically; upload the downloaded assets yourself.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <Button variant="ghost" onClick={onBack}>
          ← Back to preflight
        </Button>
        <Button variant="secondary" onClick={onRestart}>
          Analyze another source
        </Button>
      </div>
    </div>
  );
}
