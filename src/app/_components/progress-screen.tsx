"use client";

import { useEffect, useState } from "react";

import { SectionLabel } from "@/app/_components/ui";

const ANALYSIS_STEPS = [
  {
    title: "Reading comments",
    detail: "Collecting the top comment threads from the video",
  },
  {
    title: "Finding repeated audience signals",
    detail: "Grouping requests, questions, and reactions that keep coming back",
  },
  {
    title: "Ranking opportunities",
    detail: "Scoring each signal by how much evidence stands behind it",
  },
  {
    title: "Connecting recommendations to evidence",
    detail: "Attaching the exact comments that justify each recommendation",
  },
];

const STEP_INTERVAL_MS = 620;

/**
 * Sequential activity display for the analysis phase. There is deliberately
 * no percentage: the steps describe real stages of the pipeline and the last
 * step stays active until the request actually resolves.
 */
export function ProgressScreen({ sourceUrl }: { sourceUrl: string }) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (activeStep >= ANALYSIS_STEPS.length - 1) {
      return;
    }
    const timer = setTimeout(
      () => setActiveStep((step) => step + 1),
      STEP_INTERVAL_MS,
    );
    return () => clearTimeout(timer);
  }, [activeStep]);

  return (
    <div className="stage-enter mx-auto w-full max-w-xl py-10 lg:py-20">
      <SectionLabel>Listening</SectionLabel>
      <h1
        id="stage-heading"
        tabIndex={-1}
        className="mt-3 font-display text-3xl font-bold tracking-tight text-ink outline-none"
      >
        Reading your audience…
      </h1>
      <p className="mt-2 truncate text-sm text-ink-faint">{sourceUrl}</p>

      <ol className="mt-10 flex flex-col gap-1" aria-label="Analysis steps">
        {ANALYSIS_STEPS.map((step, index) => {
          const state =
            index < activeStep
              ? "done"
              : index === activeStep
                ? "active"
                : "pending";
          return (
            <li
              key={step.title}
              className={`flex gap-4 rounded-2xl px-4 py-3.5 ${
                state === "active" ? "bg-surface" : ""
              }`}
            >
              <span className="mt-1 flex size-5 shrink-0 items-center justify-center">
                {state === "done" ? (
                  <span aria-hidden="true" className="text-sm text-signal">
                    ✓
                  </span>
                ) : state === "active" ? (
                  <span
                    aria-hidden="true"
                    className="pulse-dot size-2.5 rounded-full bg-signal"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="size-2.5 rounded-full border border-line-strong"
                  />
                )}
              </span>
              <span>
                <span
                  className={`block text-sm font-medium ${
                    state === "pending" ? "text-ink-faint" : "text-ink"
                  }`}
                >
                  {step.title}
                </span>
                {state === "active" && (
                  <span className="mt-0.5 block text-sm text-ink-soft">
                    {step.detail}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>

      <p aria-live="polite" className="sr-only">
        {ANALYSIS_STEPS[activeStep].title}
      </p>
    </div>
  );
}
