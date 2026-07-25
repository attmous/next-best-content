"use client";

import { JourneyExplainer } from "@/app/_components/journey";
import { SourcePicker } from "@/app/_components/source-picker";
import type { ImportSubmission } from "@/app/_components/import-form";
import type { SourceOptionId } from "@/app/_lib/platforms";
import { SectionLabel } from "@/app/_components/ui";

export function StartScreen({
  initialPanel = null,
  onAnalyzeYoutube,
  onImport,
  onDemo,
}: {
  initialPanel?: SourceOptionId | null;
  onAnalyzeYoutube: (normalizedUrl: string) => void;
  onImport: (submission: ImportSubmission) => void;
  onDemo: () => void;
}) {
  return (
    <div className="stage-enter mx-auto flex w-full max-w-5xl flex-col gap-12 lg:gap-14">
      <section className="mt-4 lg:mt-8">
        <SectionLabel>Audience intelligence for creators</SectionLabel>
        <h1
          id="stage-heading"
          tabIndex={-1}
          className="mt-4 max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink outline-none sm:text-6xl"
        >
          Your audience already told you what to create next.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-ink-soft">
          NextBestContent reads your audience&rsquo;s comments — live from
          YouTube or imported from anywhere — finds the requests, questions,
          and reactions they keep repeating, and turns the strongest one into
          publish-ready content for YouTube or LinkedIn. Every recommendation
          is backed by the actual comments behind it.
        </p>
      </section>

      <SourcePicker
        initialOpenId={initialPanel}
        onAnalyzeYoutube={onAnalyzeYoutube}
        onImport={onImport}
        onDemo={onDemo}
      />

      <section aria-label="How it works" className="pb-4">
        <h2 className="sr-only">The four-step journey</h2>
        <JourneyExplainer />
      </section>
    </div>
  );
}
