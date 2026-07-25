"use client";

import { useId, useState, type FormEvent } from "react";

import type { AnalyzeSource, Evidence } from "@/contracts";
import {
  detectImportKind,
  parseImportedComments,
} from "@/app/_lib/import-comments";
import { parseYoutubeUrl } from "@/app/_lib/youtube";
import {
  SOURCE_TAG_LABELS,
  type SourcePlatformTag,
} from "@/app/_lib/platforms";
import { PlatformIcon } from "@/app/_components/icons";
import { Button } from "@/app/_components/ui";

export interface ImportSubmission {
  comments: Evidence[];
  platform: SourcePlatformTag;
  rightsConfirmed: true;
  sourceUrl: string;
  fileName?: string;
}

type ImportAnalyzeSource = Extract<AnalyzeSource, { type: "import" }>;

export function toImportAnalyzeSource(
  submission: ImportSubmission,
): ImportAnalyzeSource {
  const platform =
    submission.platform === "youtube" || submission.platform === "linkedin"
      ? submission.platform
      : "other";

  return {
    type: "import",
    platform,
    rightsConfirmed: submission.rightsConfirmed,
    comments: submission.comments,
  };
}

const PLATFORM_TAGS: SourcePlatformTag[] = [
  "youtube",
  "linkedin",
  "x",
  "facebook",
  "other",
];

/**
 * Creator comment import: file upload or paste, an explicit original-platform
 * tag, and the original content URL for visible source traceability. Parsing
 * happens entirely in the browser.
 */
export function ImportForm({
  initialPlatform = "youtube",
  onSubmit,
  submitting,
}: {
  initialPlatform?: SourcePlatformTag;
  onSubmit: (submission: ImportSubmission) => void;
  submitting: boolean;
}) {
  const fieldId = useId();
  const [platform, setPlatform] = useState<SourcePlatformTag>(initialPlatform);
  const [sourceUrl, setSourceUrl] = useState("");
  const [rawText, setRawText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [parsed, setParsed] = useState<{
    comments: Evidence[];
    warnings: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function runParse(raw: string, file: string | null) {
    const result = parseImportedComments(raw, detectImportKind(file, raw));
    if (result.ok) {
      setParsed({ comments: result.comments, warnings: result.warnings });
      setError(null);
    } else {
      setParsed(null);
      setError(result.error);
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    setFileName(file.name);
    setRawText(text);
    runParse(text, file.name);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const trimmedUrl = sourceUrl.trim();
    if (trimmedUrl.length === 0) {
      setError(
        "Add the original video or post link so this import stays traceable to its source.",
      );
      return;
    }
    if (platform === "youtube" && !parseYoutubeUrl(trimmedUrl).ok) {
      setError("For a YouTube source, use a full YouTube video URL.");
      return;
    }
    let normalizedUrl = trimmedUrl;
    try {
      normalizedUrl = new URL(
        /^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`,
      ).toString();
    } catch {
      setError("That source link doesn't look like a URL.");
      return;
    }
    if (!rightsConfirmed) {
      setError(
        "Confirm that you have the right to use these comments before analysis.",
      );
      return;
    }

    const result = parseImportedComments(
      rawText,
      detectImportKind(fileName, rawText),
    );
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setError(null);
    onSubmit({
      comments: result.comments,
      platform,
      rightsConfirmed: true,
      sourceUrl: normalizedUrl,
      fileName: fileName ?? undefined,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="Import comments"
      className="flex flex-col gap-4"
    >
      <fieldset>
        <legend className="text-sm font-medium text-ink">
          Where are these comments from?
        </legend>
        <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup">
          {PLATFORM_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              role="radio"
              aria-checked={platform === tag}
              onClick={() => setPlatform(tag)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                platform === tag
                  ? "bg-signal text-signal-ink"
                  : "bg-surface-raised text-ink-soft hover:text-ink"
              }`}
            >
              <PlatformIcon platform={tag} className="size-3.5" />
              {SOURCE_TAG_LABELS[tag]}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label
          htmlFor={`${fieldId}-url`}
          className="block text-sm font-medium text-ink"
        >
          Link to the original video or post
        </label>
        <p className="mt-0.5 text-xs text-ink-faint">
          Required by this import flow to keep its source visible.
        </p>
        <input
          id={`${fieldId}-url`}
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          value={sourceUrl}
          onChange={(event) => setSourceUrl(event.target.value)}
          placeholder={
            platform === "linkedin"
              ? "https://www.linkedin.com/posts/…"
              : "https://www.youtube.com/watch?v=…"
          }
          className="mt-2 w-full rounded-xl border border-line-strong bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint"
        />
      </div>

      <div>
        <label
          htmlFor={`${fieldId}-file`}
          className="block text-sm font-medium text-ink"
        >
          Comment export file (JSON or CSV)
        </label>
        <input
          id={`${fieldId}-file`}
          type="file"
          accept=".json,.csv,.txt,application/json,text/csv,text/plain"
          onChange={(event) => void handleFile(event.target.files?.[0])}
          className="mt-2 block w-full cursor-pointer text-sm text-ink-soft file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-surface-raised file:px-4 file:py-2 file:text-sm file:font-medium file:text-ink"
        />
      </div>

      <div>
        <label
          htmlFor={`${fieldId}-paste`}
          className="block text-sm font-medium text-ink"
        >
          Or paste comments (one per line, or JSON/CSV)
        </label>
        <textarea
          id={`${fieldId}-paste`}
          rows={4}
          value={rawText}
          onChange={(event) => {
            setRawText(event.target.value);
            setFileName(null);
            if (event.target.value.trim().length > 0) {
              runParse(event.target.value, null);
            } else {
              setParsed(null);
              setError(null);
            }
          }}
          placeholder={"Can you do a beginner version?\nWhat pan are you using?"}
          className="mt-2 w-full resize-y rounded-xl border border-line-strong bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint"
        />
        <p className="mt-1 text-xs leading-5 text-ink-faint">
          Up to 100 comments you have the right to use. Imported text is
          treated as untrusted data — it is analyzed, never executed.
        </p>
      </div>

      {parsed && (
        <div
          role="status"
          className="rounded-xl border border-signal/30 bg-signal/5 px-4 py-3 text-sm"
        >
          <p className="font-medium text-ink">
            {parsed.comments.length}{" "}
            {parsed.comments.length === 1 ? "comment" : "comments"} ready
            {fileName ? ` from ${fileName}` : ""}.
          </p>
          {parsed.warnings.map((warning) => (
            <p key={warning} className="mt-1 text-xs text-warn">
              {warning}
            </p>
          ))}
          <p className="mt-1.5 truncate text-xs italic text-ink-faint">
            First comment: “{parsed.comments[0].text.slice(0, 90)}
            {parsed.comments[0].text.length > 90 ? "…" : ""}”
          </p>
        </div>
      )}

      <label
        htmlFor={`${fieldId}-rights`}
        className="flex items-start gap-2.5 rounded-xl border border-line bg-surface-raised px-4 py-3 text-sm text-ink"
      >
        <input
          id={`${fieldId}-rights`}
          type="checkbox"
          required
          checked={rightsConfirmed}
          onChange={(event) => {
            setRightsConfirmed(event.target.checked);
            if (event.target.checked) setError(null);
          }}
          className="mt-0.5 size-4 shrink-0 accent-signal"
        />
        <span>
          I confirm that I have the right to use these comments for analysis.
        </span>
      </label>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <div>
        <Button
          type="submit"
          loading={submitting}
          loadingLabel="Analyzing imported comments…"
        >
          Analyze imported comments
        </Button>
      </div>
    </form>
  );
}
