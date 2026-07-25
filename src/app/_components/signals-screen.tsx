"use client";

import { useState } from "react";

import type { AnalyzeResponse, Signal } from "@/contracts";
import type { SourceDescriptor } from "@/app/_lib/platforms";
import { SourceReceipt } from "@/app/_components/source-receipt";
import {
  Button,
  CategoryBadge,
  ProvenanceBadge,
  ScoreMeter,
  SectionLabel,
} from "@/app/_components/ui";

export function SignalsScreen({
  analysis,
  source,
  onCreate,
}: {
  analysis: AnalyzeResponse;
  source: SourceDescriptor;
  onCreate: (signalId: string) => void;
}) {
  const { video, signals, provenance } = analysis;

  return (
    <div className="stage-enter mx-auto flex w-full max-w-6xl flex-col gap-10">
      <section aria-label="Analyzed video">
        <SectionLabel>Audience signals</SectionLabel>
        <h1
          id="stage-heading"
          tabIndex={-1}
          className="mt-3 max-w-3xl font-display text-3xl font-bold tracking-tight text-ink outline-none sm:text-4xl"
        >
          Three things your audience keeps telling you
        </h1>

        <div className="mt-6 flex flex-col gap-5 rounded-2xl border border-line bg-surface p-4 sm:flex-row sm:items-center">
          <VideoThumbnail
            title={video.title}
            url={video.thumbnailUrl}
            synthetic={provenance.source === "demo"}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-ink" title={video.title}>
              {video.title}
            </p>
            <p className="mt-1 text-sm text-ink-soft">{video.channelTitle}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-faint">
              {typeof video.commentCount === "number" && (
                <span>
                  <strong className="font-semibold text-ink">
                    {video.commentCount.toLocaleString("en-US")}
                  </strong>{" "}
                  comments analyzed
                </span>
              )}
              <ProvenanceBadge provenance={provenance} />
            </div>
          </div>
        </div>

        <div className="mt-3">
          <SourceReceipt source={source} provenance={provenance} />
        </div>
      </section>

      <section aria-label="Content opportunities">
        <h2 className="sr-only">Opportunities</h2>
        <div className="grid gap-5 lg:grid-cols-3">
          {signals.map((signal) => (
            <OpportunityCard
              key={signal.id}
              signal={signal}
              onCreate={() => onCreate(signal.id)}
            />
          ))}
        </div>
        <p className="mt-5 text-xs leading-5 text-ink-faint">
          Scores measure how much audience evidence stands behind each
          opportunity — they are not predictions of views or reach.
        </p>
      </section>
    </div>
  );
}

function VideoThumbnail({
  title,
  url,
  synthetic,
}: {
  title: string;
  url: string;
  synthetic: boolean;
}) {
  const [failed, setFailed] = useState(false);

  // Demo runs never fetch a real thumbnail: the fixture is fictional, so a
  // labeled placeholder is the honest representation.
  if (synthetic || failed) {
    return (
      <div
        role="img"
        aria-label={
          synthetic
            ? "Synthetic thumbnail placeholder"
            : "Thumbnail unavailable"
        }
        className="flex h-24 w-40 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-line bg-surface-raised"
      >
        <span aria-hidden="true" className="font-display text-xl text-signal">
          ▶
        </span>
        <span className="px-2 text-center text-[10px] uppercase tracking-wide text-ink-faint">
          {synthetic ? "Synthetic fixture" : "No thumbnail"}
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote thumbnail host can't be added to next.config (foundation-owned); plain img with graceful fallback
    <img
      src={url}
      alt={`Thumbnail for ${title}`}
      width={160}
      height={96}
      className="h-24 w-40 shrink-0 rounded-xl border border-line object-cover"
      onError={() => setFailed(true)}
    />
  );
}

function OpportunityCard({
  signal,
  onCreate,
}: {
  signal: Signal;
  onCreate: () => void;
}) {
  return (
    <article
      aria-label={signal.title}
      className="flex flex-col rounded-3xl border border-line bg-surface p-6 transition-colors hover:border-line-strong"
    >
      <div className="flex items-start justify-between gap-4">
        <CategoryBadge category={signal.category} />
        <ScoreMeter score={signal.opportunityScore} />
      </div>

      <h3 className="mt-4 font-display text-xl font-bold leading-snug text-ink">
        {signal.title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-ink-soft">{signal.summary}</p>

      <div className="mt-5 border-t border-line pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-signal">
          Evidence · {signal.evidenceCount} supporting comments
        </p>
        <ul className="mt-3 flex flex-col gap-3">
          {signal.evidence.slice(0, 3).map((quote) => (
            <li key={`${quote.author}-${quote.likeCount}`}>
              <figure className="rounded-xl border-l-2 border-signal/60 bg-surface-raised px-3.5 py-2.5">
                <blockquote className="text-sm leading-5.5 text-ink">
                  “{quote.text}”
                </blockquote>
                <figcaption className="mt-1.5 text-xs text-ink-faint">
                  {quote.author} · {quote.likeCount.toLocaleString("en-US")}{" "}
                  likes
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 rounded-xl bg-surface-raised p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
          Recommended ·{" "}
          {signal.recommendation.suggestedFormat === "short"
            ? "YouTube Short"
            : "Carousel"}
        </p>
        <p className="mt-2 text-sm font-semibold text-ink">
          {signal.recommendation.workingTitle}
        </p>
        <p className="mt-1.5 text-sm italic leading-5.5 text-ink-soft">
          “{signal.recommendation.hook}”
        </p>
      </div>

      <Button onClick={onCreate} className="mt-6 w-full">
        Create this
      </Button>
    </article>
  );
}
