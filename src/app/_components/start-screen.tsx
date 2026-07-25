"use client";

import { JourneyExplainer } from "@/app/_components/journey";
import { SourcePicker } from "@/app/_components/source-picker";
import type { ImportSubmission } from "@/app/_components/import-form";
import {
  allowsRequestScopedModelKey,
  type RuntimeContext,
} from "@/app/_lib/capabilities";
import type { SourceOptionId } from "@/app/_lib/platforms";
import { SectionLabel } from "@/app/_components/ui";

/**
 * The workspace: source selection for a full run. In a self-hosted install
 * this is the home screen; in the hosted demo it is reachable from the
 * landing page with external sources shown as informational only.
 */
export function StartScreen({
  runtime,
  initialPanel = null,
  onAnalyzeYoutube,
  onImport,
  onDemo,
}: {
  runtime: RuntimeContext;
  initialPanel?: SourceOptionId | null;
  onAnalyzeYoutube: (normalizedUrl: string, modelApiKey?: string) => void;
  onImport: (submission: ImportSubmission, modelApiKey?: string) => void;
  onDemo: () => void;
}) {
  const isSelfHosted = runtime.profile === "self_hosted";
  const requestScopedKeyAllowed = allowsRequestScopedModelKey(runtime);

  return (
    <div className="stage-enter mx-auto flex w-full max-w-5xl flex-col gap-12 lg:gap-14">
      <section className="mt-4 lg:mt-8">
        <SectionLabel>
          {isSelfHosted
            ? "Private workspace · self-hosted"
            : "Workspace preview · hosted demo"}
        </SectionLabel>
        <h1
          id="stage-heading"
          tabIndex={-1}
          className="mt-4 max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink outline-none sm:text-6xl"
        >
          Your audience already told you what to create next.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-ink-soft">
          {isSelfHosted
            ? requestScopedKeyAllowed
              ? "This self-hosted workspace uses a server-managed container key or an optional request-scoped key. A request-scoped key stays in memory for one run, is sent only to this installation's API, and is never stored."
              : "This self-hosted workspace analyzes comments with a model key configured through the container environment — the key never appears in, or passes through, the browser."
            : "This hosted workspace shows the full product surface. External sources are informational here — the synthetic demo below runs the complete journey, and the private version unlocks the rest."}
        </p>
      </section>

      <SourcePicker
        runtime={runtime}
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
