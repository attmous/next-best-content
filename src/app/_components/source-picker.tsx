"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";

import { parseYoutubeUrl } from "@/app/_lib/youtube";
import {
  SOURCE_OPTIONS,
  type SourceOption,
  type SourceOptionId,
  type SourcePlatformTag,
} from "@/app/_lib/platforms";
import {
  ImportForm,
  type ImportSubmission,
} from "@/app/_components/import-form";
import {
  FlaskIcon,
  ImportTrayIcon,
  LockIcon,
  PlatformIcon,
} from "@/app/_components/icons";
import { Button } from "@/app/_components/ui";

function OptionGlyph({ option }: { option: SourceOption }) {
  const className = "size-5";
  if (option.id === "import") return <ImportTrayIcon className={className} />;
  if (option.mode === "demo") return <FlaskIcon className={className} />;
  return (
    <PlatformIcon platform={option.platform ?? "other"} className={className} />
  );
}

const URL_ERROR_COPY: Record<string, string> = {
  empty: "Paste a YouTube video URL to get started.",
  not_a_url: "That doesn't look like a URL. Paste a full YouTube video link.",
  not_youtube:
    "That link isn't a YouTube link. To analyze another platform's comments, use Import.",
  no_video:
    "We couldn't find a video in that link. Use a link like youtube.com/watch?v=…",
};

/**
 * Flow 1: "Where should we find the audience signal?" — every card, badge,
 * and disabled state renders from the platform registry.
 */
export function SourcePicker({
  initialOpenId = null,
  onAnalyzeYoutube,
  onImport,
  onDemo,
}: {
  initialOpenId?: SourceOptionId | null;
  onAnalyzeYoutube: (normalizedUrl: string) => void;
  onImport: (submission: ImportSubmission) => void;
  onDemo: () => void;
}) {
  const [openId, setOpenId] = useState<SourceOptionId | null>(initialOpenId);
  const [importPlatform, setImportPlatform] =
    useState<SourcePlatformTag>("youtube");

  function panelFor(option: SourceOption): ReactNode {
    switch (option.id) {
      case "youtube-live":
        return <YoutubeUrlPanel onSubmit={onAnalyzeYoutube} />;
      case "import":
        return (
          <ImportForm
            key={importPlatform}
            initialPlatform={importPlatform}
            onSubmit={onImport}
            submitting={false}
          />
        );
      case "demo":
        return (
          <div className="flex flex-col gap-3">
            <p className="text-sm leading-6 text-ink-soft">
              Everything in the demo — the video, every comment, every name —
              is fictional and stays labeled as synthetic on every screen.
            </p>
            <div>
              <Button onClick={onDemo}>Try Adam&rsquo;s channel demo</Button>
            </div>
          </div>
        );
      case "linkedin-live":
        return (
          <div className="flex flex-col gap-3">
            <p className="text-sm leading-6 text-ink-soft">
              {option.unavailableReason}
            </p>
            <div>
              <Button
                variant="secondary"
                onClick={() => {
                  setImportPlatform("linkedin");
                  setOpenId("import");
                }}
              >
                Import LinkedIn comments instead
              </Button>
            </div>
          </div>
        );
    }
  }

  return (
    <section aria-label="Choose an insight source">
      <h2 className="font-display text-xl font-bold text-ink">
        Where should we find the audience signal?
      </h2>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {SOURCE_OPTIONS.map((option) => {
          const isOpen = openId === option.id;
          const isGated = option.availability === "gated";
          const panelId = `source-panel-${option.id}`;
          return (
            <div
              key={option.id}
              className={`rounded-2xl border transition-colors ${
                isOpen
                  ? "border-signal/50 bg-surface"
                  : "border-line bg-surface hover:border-line-strong"
              }`}
            >
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenId(isOpen ? null : option.id)}
                className="flex w-full items-start justify-between gap-4 rounded-2xl px-5 py-4 text-left"
              >
                <span className="flex min-w-0 items-start gap-3.5">
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl ${
                      isOpen
                        ? "bg-signal text-signal-ink"
                        : "bg-surface-raised text-ink-soft"
                    }`}
                  >
                    <OptionGlyph option={option} />
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-ink">
                        {option.title}
                      </span>
                      {isGated && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-warn/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warn">
                          <LockIcon className="size-3" />
                          {option.id === "linkedin-live"
                            ? "Requires approval"
                            : "Gate-dependent"}
                        </span>
                      )}
                      {option.mode === "demo" && (
                        <span className="rounded-full border border-signal/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-signal">
                          Synthetic
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-sm leading-5.5 text-ink-soft">
                      {option.description}
                    </span>
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={`mt-1 text-ink-faint transition-transform ${isOpen ? "rotate-90" : ""}`}
                >
                  ›
                </span>
              </button>
              <div id={panelId} hidden={!isOpen} className="px-5 pb-5">
                {isOpen && panelFor(option)}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function YoutubeUrlPanel({
  onSubmit,
}: {
  onSubmit: (normalizedUrl: string) => void;
}) {
  const inputId = useId();
  const errorId = useId();
  const [value, setValue] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);

  const gateNote = SOURCE_OPTIONS.find(
    (option) => option.id === "youtube-live",
  )?.unavailableReason;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = parseYoutubeUrl(value);
    if (!parsed.ok) {
      setInputError(URL_ERROR_COPY[parsed.reason]);
      return;
    }
    setInputError(null);
    onSubmit(parsed.normalizedUrl);
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="Analyze a YouTube video"
    >
      <label htmlFor={inputId} className="block text-sm font-medium text-ink">
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
          className={`w-full flex-1 rounded-xl border bg-surface-raised px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint ${
            inputError ? "border-danger" : "border-line-strong"
          }`}
        />
        <Button type="submit" className="shrink-0">
          Find my next content
        </Button>
      </div>
      {inputError && (
        <p id={errorId} role="alert" className="mt-2 text-sm text-danger">
          {inputError}
        </p>
      )}
      {gateNote && (
        <p className="mt-3 text-xs leading-5 text-ink-faint">{gateNote}</p>
      )}
    </form>
  );
}
