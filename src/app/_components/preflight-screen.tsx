"use client";

import type {
  PreflightCheck,
  PreflightCheckName,
  PreflightResponse,
} from "@/contracts";
import type { UiError } from "@/app/_lib/errors";
import { Button, SectionLabel, Spinner } from "@/app/_components/ui";

const CHECK_LABELS: Record<PreflightCheckName, string> = {
  hook: "Hook",
  audience_fit: "Audience fit",
  evidence: "Evidence",
  clarity: "Clarity",
  format: "Format",
  cta: "Call to action",
  brand_safety: "Brand safety",
};

const VERDICT_COPY = {
  ready: {
    label: "Ready",
    detail: "All seven checks passed. This pack is ready to move to export.",
    className: "border-ok/50 bg-ok/10 text-ok",
  },
  needs_changes: {
    label: "Needs changes",
    detail:
      "Nothing is blocking, but the flagged checks below would make this stronger.",
    className: "border-warn/50 bg-warn/10 text-warn",
  },
  blocked: {
    label: "Blocked",
    detail: "At least one check failed. Fix the issues below before exporting.",
    className: "border-danger/50 bg-danger/10 text-danger",
  },
} as const;

export function PreflightScreen({
  result,
  running,
  error,
  onRerun,
  onEditInStudio,
  onContinue,
}: {
  result: PreflightResponse | null;
  running: boolean;
  error: UiError | null;
  onRerun: () => void;
  onEditInStudio: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="stage-enter mx-auto flex w-full max-w-4xl flex-col gap-8">
      <section>
        <SectionLabel>Preflight</SectionLabel>
        <h1
          id="stage-heading"
          tabIndex={-1}
          className="mt-3 font-display text-3xl font-bold tracking-tight text-ink outline-none sm:text-4xl"
        >
          Seven checks before you publish
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
          Every check is a transparent editorial measurement of this draft —
          none of them predict views or reach.
        </p>
      </section>

      {running && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-6 py-10 text-ink-soft"
        >
          <Spinner />
          <span>Running the seven preflight checks…</span>
        </div>
      )}

      {!running && error && (
        <div
          role="alert"
          className="rounded-2xl border border-danger/40 bg-danger/5 p-6"
        >
          <p className="font-semibold text-ink">{error.title}</p>
          <p className="mt-1 text-sm leading-6 text-ink-soft">
            {error.description}
          </p>
          <div className="mt-4 flex gap-3">
            {error.retryable && <Button onClick={onRerun}>Try again</Button>}
            <Button variant="ghost" onClick={onEditInStudio}>
              Back to studio
            </Button>
          </div>
        </div>
      )}

      {!running && result && (
        <>
          <section
            aria-label="Overall verdict"
            className="flex flex-col gap-5 rounded-3xl border border-line bg-surface p-6 sm:flex-row sm:items-center"
          >
            <div className="shrink-0">
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-6xl font-bold text-ink">
                  {result.overallScore}
                </span>
                <span className="text-sm text-ink-faint">/ 100</span>
              </div>
              <p className="mt-1 text-[11px] uppercase tracking-wide text-ink-faint">
                Overall editorial score
              </p>
            </div>
            <div className="min-w-0 flex-1">
              <span
                className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-semibold ${VERDICT_COPY[result.verdict].className}`}
              >
                {VERDICT_COPY[result.verdict].label}
              </span>
              <p className="mt-2 text-sm leading-6 text-ink-soft">
                {VERDICT_COPY[result.verdict].detail}
              </p>
              {result.blockingIssues.length > 0 && (
                <ul className="mt-3 flex list-disc flex-col gap-1 pl-5 text-sm text-danger">
                  {result.blockingIssues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section aria-label="Individual checks">
            <ul className="flex flex-col gap-3">
              {result.checks.map((check) => (
                <CheckRow
                  key={check.name}
                  check={check}
                  onEditInStudio={onEditInStudio}
                />
              ))}
            </ul>
          </section>
        </>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onEditInStudio}>
            ← Edit in studio
          </Button>
          <Button
            variant="secondary"
            onClick={onRerun}
            loading={running}
            loadingLabel="Re-running…"
          >
            Re-run preflight
          </Button>
        </div>
        <Button
          onClick={onContinue}
          disabled={running || !result || result.verdict === "blocked"}
        >
          Continue to export
        </Button>
      </div>
      {result?.verdict === "blocked" && !running && (
        <p className="-mt-4 text-right text-xs text-ink-faint">
          Export unlocks once the failing checks are fixed in the studio.
        </p>
      )}
    </div>
  );
}

function CheckRow({
  check,
  onEditInStudio,
}: {
  check: PreflightCheck;
  onEditInStudio: () => void;
}) {
  const status =
    check.status === "pass"
      ? { icon: "✓", className: "text-ok", label: "Passed" }
      : check.status === "warning"
        ? { icon: "!", className: "text-warn", label: "Warning" }
        : { icon: "✕", className: "text-danger", label: "Failed" };

  return (
    <li className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-current text-sm font-bold ${status.className}`}
        >
          {status.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="font-semibold text-ink">
              {CHECK_LABELS[check.name]}
              <span className="sr-only"> — {status.label}</span>
            </h3>
            <span className="text-sm text-ink-faint">{check.score} / 100</span>
          </div>
          <p className="mt-1 text-sm leading-6 text-ink-soft">
            {check.explanation}
          </p>
          {check.suggestedFix && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-raised px-4 py-3">
              <p className="text-sm leading-5.5 text-ink">
                <span className="font-semibold text-signal">Fix: </span>
                {check.suggestedFix}
              </p>
              <button
                type="button"
                onClick={onEditInStudio}
                className="shrink-0 text-sm font-medium text-signal underline-offset-4 hover:underline"
              >
                Edit in studio
              </button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
