import type { UiError } from "@/app/_lib/errors";
import { Button, SectionLabel } from "@/app/_components/ui";

export function ErrorScreen({
  error,
  onRetry,
  onDemo,
  onRestart,
}: {
  error: UiError;
  onRetry: () => void;
  onDemo: () => void;
  onRestart: () => void;
}) {
  return (
    <div className="stage-enter mx-auto w-full max-w-xl py-10 lg:py-20">
      <SectionLabel>Analysis stopped</SectionLabel>
      <h1
        id="stage-heading"
        tabIndex={-1}
        className="mt-3 font-display text-3xl font-bold tracking-tight text-ink outline-none"
      >
        {error.title}
      </h1>
      <p className="mt-4 text-base leading-7 text-ink-soft">
        {error.description}
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        {error.retryable && <Button onClick={onRetry}>Try again</Button>}
        {error.offerDemo && (
          <Button
            variant={error.retryable ? "secondary" : "primary"}
            onClick={onDemo}
          >
            Try the synthetic demo instead
          </Button>
        )}
        <Button variant="ghost" onClick={onRestart}>
          Start over
        </Button>
      </div>

      {error.offerDemo && (
        <p className="mt-4 max-w-md text-xs leading-5 text-ink-faint">
          The demo runs the identical journey on clearly labeled fictional
          data — nothing is fetched from YouTube.
        </p>
      )}

      <dl className="mt-10 flex gap-6 border-t border-line pt-4 text-xs text-ink-faint">
        <div>
          <dt className="inline">Error code: </dt>
          <dd className="inline font-mono">{error.code}</dd>
        </div>
        {error.requestId && (
          <div>
            <dt className="inline">Request ID: </dt>
            <dd className="inline font-mono">{error.requestId}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
