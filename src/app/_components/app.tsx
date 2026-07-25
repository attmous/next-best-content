"use client";

import { useEffect, useRef, useState } from "react";

import type {
  AnalyzeResponse,
  ContentFormat,
  ContentPack,
  PreflightResponse,
} from "@/contracts";
import {
  ApiClientError,
  createApiClient,
  type ApiMode,
} from "@/app/_lib/api-client";
import { toUiError, type UiError } from "@/app/_lib/errors";
import { DEMO_VIDEO_URL } from "@/app/_demo/fixtures";
import { ErrorScreen } from "@/app/_components/error-screen";
import { ExportScreen } from "@/app/_components/export-screen";
import { JourneyProgress, type JourneyStep } from "@/app/_components/journey";
import { PreflightScreen } from "@/app/_components/preflight-screen";
import { ProgressScreen } from "@/app/_components/progress-screen";
import { SignalsScreen } from "@/app/_components/signals-screen";
import { StartScreen } from "@/app/_components/start-screen";
import { StudioScreen } from "@/app/_components/studio-screen";
import { Button, ProvenanceBadge, Wordmark } from "@/app/_components/ui";

type Stage =
  | "start"
  | "analyzing"
  | "analysis-error"
  | "signals"
  | "studio"
  | "preflight"
  | "export";

const STAGE_TO_JOURNEY: Record<Exclude<Stage, "start">, JourneyStep> = {
  analyzing: "listen",
  "analysis-error": "listen",
  signals: "decide",
  studio: "create",
  preflight: "preflight",
  export: "preflight",
};

/** Minimum time the progress steps stay visible before an error takes over. */
const MIN_ANALYSIS_MS = 1_200;

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function asUiError(error: unknown): UiError {
  if (error instanceof ApiClientError) {
    return toUiError(error.code, { requestId: error.requestId });
  }
  return toUiError("INTERNAL_ERROR");
}

export function App() {
  const [stage, setStage] = useState<Stage>("start");
  const [mode, setMode] = useState<ApiMode>("live");
  const [sourceUrl, setSourceUrl] = useState("");
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [analysisError, setAnalysisError] = useState<UiError | null>(null);
  const [signalId, setSignalId] = useState<string | null>(null);
  const [packs, setPacks] = useState<
    Partial<Record<ContentFormat, ContentPack>>
  >({});
  const [activeFormat, setActiveFormat] = useState<ContentFormat>("short");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<UiError | null>(null);
  const [preflightResult, setPreflightResult] =
    useState<PreflightResponse | null>(null);
  const [preflightRunning, setPreflightRunning] = useState(false);
  const [preflightError, setPreflightError] = useState<UiError | null>(null);

  /** Increments on restart so stale async results never land. */
  const runRef = useRef(0);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    const frame = requestAnimationFrame(() => {
      document.getElementById("stage-heading")?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [stage]);

  async function startAnalyze(url: string, nextMode: ApiMode) {
    const run = ++runRef.current;
    setMode(nextMode);
    setSourceUrl(url);
    setAnalysis(null);
    setAnalysisError(null);
    setStage("analyzing");

    const client = createApiClient(nextMode);
    const [settled] = await Promise.allSettled([
      client.analyze({
        youtubeUrl: url,
        source: { type: nextMode === "demo" ? "demo" : "youtube" },
      }),
      sleep(MIN_ANALYSIS_MS),
    ]);

    if (run !== runRef.current) return;

    if (settled.status === "fulfilled") {
      setAnalysis(settled.value);
      setStage("signals");
    } else {
      setAnalysisError(asUiError(settled.reason));
      setStage("analysis-error");
    }
  }

  function chooseSignal(id: string) {
    if (!analysis) return;
    const signal = analysis.signals.find((item) => item.id === id);
    if (!signal) return;
    setSignalId(id);
    setPacks({});
    setGenerateError(null);
    setPreflightResult(null);
    setPreflightError(null);
    const format = signal.recommendation.suggestedFormat;
    setActiveFormat(format);
    setStage("studio");
    void generatePackFor(id, format);
  }

  /** Takes the signal id explicitly so it also works before state settles. */
  async function generatePackFor(id: string, format: ContentFormat) {
    if (!analysis) return;
    const signal = analysis.signals.find((item) => item.id === id);
    if (!signal) return;

    const run = runRef.current;
    setGenerating(true);
    setGenerateError(null);
    try {
      const pack = await createApiClient(mode).generate({
        video: analysis.video,
        signal,
        format,
        provenance: analysis.provenance,
      });
      if (run !== runRef.current) return;
      setPacks((previous) => ({ ...previous, [format]: pack }));
    } catch (error) {
      if (run !== runRef.current) return;
      setGenerateError(asUiError(error));
    } finally {
      if (run === runRef.current) setGenerating(false);
    }
  }

  function selectFormat(format: ContentFormat) {
    setActiveFormat(format);
    setPreflightResult(null);
    if (!packs[format] && signalId) {
      void generatePackFor(signalId, format);
    }
  }

  async function runPreflight() {
    const pack = packs[activeFormat];
    if (!pack) return;

    const run = runRef.current;
    setStage("preflight");
    setPreflightRunning(true);
    setPreflightError(null);
    try {
      const result = await createApiClient(mode).preflight({
        contentPack: pack,
      });
      if (run !== runRef.current) return;
      setPreflightResult(result);
    } catch (error) {
      if (run !== runRef.current) return;
      setPreflightResult(null);
      setPreflightError(asUiError(error));
    } finally {
      if (run === runRef.current) setPreflightRunning(false);
    }
  }

  function restart() {
    runRef.current += 1;
    setStage("start");
    setMode("live");
    setSourceUrl("");
    setAnalysis(null);
    setAnalysisError(null);
    setSignalId(null);
    setPacks({});
    setActiveFormat("short");
    setGenerating(false);
    setGenerateError(null);
    setPreflightResult(null);
    setPreflightRunning(false);
    setPreflightError(null);
  }

  const selectedSignal =
    analysis?.signals.find((item) => item.id === signalId) ?? null;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-4 sm:px-10">
          <Wordmark />
          {stage !== "start" && (
            <>
              <JourneyProgress current={STAGE_TO_JOURNEY[stage]} />
              <div className="flex items-center gap-3">
                {mode === "demo" && analysis && (
                  <ProvenanceBadge provenance={analysis.provenance} />
                )}
                <Button variant="ghost" onClick={restart} className="text-sm">
                  Start over
                </Button>
              </div>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 px-6 py-10 sm:px-10">
        {stage === "start" && (
          <StartScreen
            onAnalyze={(url) => void startAnalyze(url, "live")}
            onDemo={() => void startAnalyze(DEMO_VIDEO_URL, "demo")}
          />
        )}

        {stage === "analyzing" && <ProgressScreen sourceUrl={sourceUrl} />}

        {stage === "analysis-error" && analysisError && (
          <ErrorScreen
            error={analysisError}
            onRetry={() => void startAnalyze(sourceUrl, mode)}
            onDemo={() => void startAnalyze(DEMO_VIDEO_URL, "demo")}
            onRestart={restart}
          />
        )}

        {stage === "signals" && analysis && (
          <SignalsScreen analysis={analysis} onCreate={chooseSignal} />
        )}

        {stage === "studio" && selectedSignal && (
          <StudioScreen
            signal={selectedSignal}
            packs={packs}
            activeFormat={activeFormat}
            generating={generating}
            generateError={generateError}
            onSelectFormat={selectFormat}
            onRetryGenerate={() => {
              if (signalId) void generatePackFor(signalId, activeFormat);
            }}
            onPackChange={(format, pack) => {
              setPacks((previous) => ({ ...previous, [format]: pack }));
              setPreflightResult(null);
            }}
            onBack={() => setStage("signals")}
            onPreflight={() => void runPreflight()}
          />
        )}

        {stage === "preflight" && (
          <PreflightScreen
            result={preflightResult}
            running={preflightRunning}
            error={preflightError}
            onRerun={() => void runPreflight()}
            onEditInStudio={() => setStage("studio")}
            onContinue={() => setStage("export")}
          />
        )}

        {stage === "export" && packs[activeFormat] && (
          <ExportScreen
            pack={packs[activeFormat]}
            onBack={() => setStage("preflight")}
            onRestart={restart}
          />
        )}
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-6 py-5 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <p>NextBestContent by Tripods — from audience signals to publish-ready content.</p>
          <p>No accounts · no stored audience data · synthetic demo clearly labeled</p>
        </div>
      </footer>
    </div>
  );
}
