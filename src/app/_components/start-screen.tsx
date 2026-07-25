"use client";

import { useId, useState, type FormEvent } from "react";

import { parseYoutubeUrl } from "@/app/_lib/youtube";
import { JourneyExplainer } from "@/app/_components/journey";
import { Button, SectionLabel } from "@/app/_components/ui";

const INPUT_ERROR_COPY: Record<string, string> = {
  empty: "Paste a YouTube video URL to get started.",
  not_a_url: "That doesn't look like a URL. Paste a full YouTube video link.",
  not_youtube:
    "That link isn't a YouTube link. NextBestContent listens to YouTube comment sections.",
  no_video:
    "We couldn't find a video in that link. Use a link like youtube.com/watch?v=…",
};

export function StartScreen({
  onAnalyze,
  onDemo,
}: {
  onAnalyze: (normalizedUrl: string) => void;
  onDemo: () => void;
}) {
  const inputId = useId();
  const errorId = useId();
  const [value, setValue] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = parseYoutubeUrl(value);
    if (!parsed.ok) {
      setInputError(INPUT_ERROR_COPY[parsed.reason]);
      return;
    }
    setInputError(null);
    onAnalyze(parsed.normalizedUrl);
  }

  return (
    <div className="stage-enter mx-auto flex w-full max-w-5xl flex-col gap-14 lg:gap-16">
      <section className="mt-4 lg:mt-10">
        <SectionLabel>Audience intelligence for creators</SectionLabel>
        <h1
          id="stage-heading"
          tabIndex={-1}
          className="mt-4 max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink outline-none sm:text-6xl"
        >
          Your audience already told you what to create next.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-ink-soft">
          NextBestContent reads the comments under your video, finds the
          requests, questions, and reactions your audience keeps repeating, and
          turns the strongest one into a publish-ready Short or carousel —
          every recommendation backed by the actual comments behind it.
        </p>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-8 max-w-2xl"
          aria-label="Analyze a YouTube video"
        >
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-ink"
          >
            YouTube video URL
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              id={inputId}
              name="youtubeUrl"
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="https://www.youtube.com/watch?v=…"
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                if (inputError) setInputError(null);
              }}
              aria-invalid={inputError ? true : undefined}
              aria-describedby={inputError ? errorId : undefined}
              className={`w-full flex-1 rounded-xl border bg-surface px-4 py-3 text-sm text-ink placeholder:text-ink-faint ${
                inputError ? "border-danger" : "border-line-strong"
              }`}
            />
            <Button type="submit" className="shrink-0 sm:px-6">
              Find my next content
            </Button>
          </div>
          {inputError && (
            <p id={errorId} role="alert" className="mt-2 text-sm text-danger">
              {inputError}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
            <Button variant="secondary" onClick={onDemo}>
              Try Adam&rsquo;s channel demo
            </Button>
            <p className="text-xs text-ink-faint">
              The demo walks the full journey with clearly labeled synthetic
              data — no live YouTube access needed.
            </p>
          </div>
        </form>
      </section>

      <section aria-label="How it works" className="pb-4">
        <h2 className="sr-only">The four-step journey</h2>
        <JourneyExplainer />
      </section>
    </div>
  );
}
