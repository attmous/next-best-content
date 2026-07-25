import type { ButtonHTMLAttributes, ReactNode } from "react";

import type { Provenance, SignalCategory } from "@/contracts";
import { CategoryIcon } from "@/app/_components/icons";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary:
    "bg-signal text-signal-ink font-semibold hover:brightness-105 active:brightness-95 disabled:opacity-40 disabled:hover:brightness-100",
  secondary:
    "border border-line-strong text-ink hover:bg-surface-raised disabled:opacity-40 disabled:hover:bg-transparent",
  ghost:
    "text-ink-soft hover:text-ink hover:bg-surface-raised disabled:opacity-40",
  danger:
    "border border-danger/50 text-danger hover:bg-danger/10 disabled:opacity-40",
};

export function Button({
  variant = "primary",
  loading = false,
  loadingLabel,
  className = "",
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
  loadingLabel?: string;
}) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm transition-colors disabled:cursor-not-allowed ${BUTTON_STYLES[variant]} ${className}`}
    >
      {loading ? (
        <>
          <Spinner />
          <span>{loadingLabel ?? children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-signal">
      {children}
    </p>
  );
}

const PROVENANCE_COPY: Record<Provenance["source"], string> = {
  demo: "Synthetic demo data",
  youtube: "Live YouTube data",
  import: "Creator-supplied comments",
  unknown: "Unknown source",
};

export function ProvenanceBadge({ provenance }: { provenance: Provenance }) {
  const isDemo = provenance.source === "demo";
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
        isDemo
          ? "border-signal/40 bg-signal/10 text-signal"
          : "border-line-strong text-ink-soft"
      }`}
    >
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${isDemo ? "bg-signal" : "bg-ink-faint"}`}
      />
      {PROVENANCE_COPY[provenance.source]}
    </span>
  );
}

export const CATEGORY_LABELS: Record<SignalCategory, string> = {
  request: "Audience request",
  unanswered_question: "Unanswered question",
  strong_reaction: "Strong reaction",
};

export function CategoryBadge({ category }: { category: SignalCategory }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
      <CategoryIcon category={category} className="size-3.5 text-signal" />
      {CATEGORY_LABELS[category]}
    </span>
  );
}

/**
 * Opportunity score display. Deliberately labeled as an opportunity strength
 * measure — never a virality or performance prediction.
 */
export function ScoreMeter({ score }: { score: number }) {
  return (
    <div>
      <div className="flex items-baseline gap-1.5">
        <span className="font-display text-4xl font-bold text-signal">
          {score}
        </span>
        <span className="text-sm text-ink-faint">/ 100</span>
      </div>
      <div
        role="img"
        aria-label={`Opportunity score ${score} out of 100, based on audience evidence`}
        className="mt-1.5 h-1 w-24 overflow-hidden rounded-full bg-line"
      >
        <div
          className="h-full rounded-full bg-signal"
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11px] uppercase tracking-wide text-ink-faint">
        Opportunity score
      </p>
    </div>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3">
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-xl bg-signal font-display text-lg font-bold text-signal-ink"
      >
        N
      </span>
      <span className="leading-tight">
        <span className="block font-semibold tracking-tight text-ink">
          NextBestContent
        </span>
        {!compact && (
          <span className="block text-xs text-ink-faint">by Tripods</span>
        )}
      </span>
    </span>
  );
}
