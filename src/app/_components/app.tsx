"use client";

import { useEffect, useRef, useState } from "react";

import type {
  AnalyzeResponse,
  AnalyzeSource,
  PreflightResponse,
  ContentPack,
} from "@/contracts";
import {
  ApiClientError,
  createApiClient,
  type ApiMode,
} from "@/app/_lib/api-client";
import { toUiError, type UiError } from "@/app/_lib/errors";
import {
  PUBLIC_RUNTIME,
  fetchRuntimeContext,
  type RuntimeContext,
} from "@/app/_lib/capabilities";
import {
  getOutput,
  type OutputId,
  type SourceDescriptor,
  type SourceOptionId,
} from "@/app/_lib/platforms";
import { DEMO_VIDEO_URL } from "@/app/_demo/fixtures";
import { DestinationScreen } from "@/app/_components/destination-screen";
import { ErrorScreen } from "@/app/_components/error-screen";
import { ExportScreen } from "@/app/_components/export-screen";
import {
  toImportAnalyzeSource,
  type ImportSubmission,
} from "@/app/_components/import-form";
import { JourneyProgress, type JourneyStep } from "@/app/_components/journey";
import { LandingScreen } from "@/app/_components/landing-screen";
import { PreflightScreen } from "@/app/_components/preflight-screen";
import { ProgressScreen } from "@/app/_components/progress-screen";
import { SignalsScreen } from "@/app/_components/signals-screen";
import { StartScreen } from "@/app/_components/start-screen";
import { StudioScreen } from "@/app/_components/studio-screen";
import { Button, ProvenanceBadge, Wordmark } from "@/app/_components/ui";

type Stage =
  | "start"
  | "workspace"
  | "analyzing"
  | "analysis-error"
  | "signals"
  | "destination"
  | "studio"
  | "preflight"
  | "export";

const STAGE_TO_JOURNEY: Record<
  Exclude<Stage, "start" | "workspace">,
  JourneyStep
> = {
  analyzing: "listen",
  "analysis-error": "listen",
  signals: "decide",
  destination: "decide",
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

interface AnalysisRun {
  mode: ApiMode;
  url: string;
  analyzeSource: AnalyzeSource;
  descriptor: SourceDescriptor;
}

export function App() {
  const [stage, setStage] = useState<Stage>("start");
  const [runtime, setRuntime] = useState<RuntimeContext>(PUBLIC_RUNTIME);
  const [run, setRun] = useState<AnalysisRun | null>(null);
  const [startPanel, setStartPanel] = useState<SourceOptionId | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [analysisError, setAnalysisError] = useState<UiError | null>(null);
  const [signalId, setSignalId] = useState<string | null>(null);
  const [outputId, setOutputId] = useState<OutputId>("youtube-short");
  const [packs, setPacks] = useState<Partial<Record<OutputId, ContentPack>>>(
    {},
  );
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
    let cancelled = false;
    void fetchRuntimeContext().then((context) => {
      if (!cancelled) setRuntime(context);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

  async function startAnalyze(nextRun: AnalysisRun) {
    const runId = ++runRef.current;
    setRun(nextRun);
    setAnalysis(null);
    setAnalysisError(null);
    setSignalId(null);
    setPacks({});
    setPreflightResult(null);
    setStage("analyzing");

    const client = createApiClient(nextRun.mode);
    const [settled] = await Promise.allSettled([
      client.analyze({
        youtubeUrl: nextRun.url,
        source: nextRun.analyzeSource,
      }),
      sleep(MIN_ANALYSIS_MS),
    ]);

    if (runId !== runRef.current) return;

    if (settled.status === "fulfilled") {
      setAnalysis(settled.value);
      setStage("signals");
    } else {
      setAnalysisError(asUiError(settled.reason));
      setStage("analysis-error");
    }
  }

  function analyzeYoutube(url: string) {
    void startAnalyze({
      mode: "live",
      url,
      analyzeSource: { type: "youtube" },
      descriptor: { mode: "live", platform: "youtube", url },
    });
  }

  function analyzeImport(submission: ImportSubmission) {
    void startAnalyze({
      mode: "live",
      url: submission.sourceUrl,
      analyzeSource: toImportAnalyzeSource(submission),
      descriptor: {
        mode: "import",
        platform: submission.platform,
        url: submission.sourceUrl,
        fileName: submission.fileName,
        importedCommentCount: submission.comments.length,
      },
    });
  }

  function analyzeDemo() {
    void startAnalyze({
      mode: "demo",
      url: DEMO_VIDEO_URL,
      analyzeSource: { type: "demo" },
      descriptor: { mode: "demo", platform: "youtube", url: DEMO_VIDEO_URL },
    });
  }

  function chooseSignal(id: string) {
    if (!analysis) return;
    if (!analysis.signals.some((item) => item.id === id)) return;
    setSignalId(id);
    setPacks({});
    setGenerateError(null);
    setPreflightResult(null);
    setPreflightError(null);
    setStage("destination");
  }

  /** Takes ids explicitly so it also works before state settles. */
  async function generatePackFor(id: string, output: OutputId) {
    if (!analysis || !run) return;
    const signal = analysis.signals.find((item) => item.id === id);
    const format = getOutput(output).contractFormat;
    if (!signal || !format) return;

    const runId = runRef.current;
    setGenerating(true);
    setGenerateError(null);
    try {
      const pack = await createApiClient(run.mode).generate({
        video: analysis.video,
        signal,
        format,
        provenance: analysis.provenance,
      });
      if (runId !== runRef.current) return;
      setPacks((previous) => ({ ...previous, [output]: pack }));
    } catch (error) {
      if (runId !== runRef.current) return;
      setGenerateError(asUiError(error));
    } finally {
      if (runId === runRef.current) setGenerating(false);
    }
  }

  function selectOutput(output: OutputId) {
    if (getOutput(output).availability !== "available") return;
    setOutputId(output);
    setPreflightResult(null);
    setStage("studio");
    if (!packs[output] && signalId) {
      void generatePackFor(signalId, output);
    }
  }

  function switchOutputInStudio(output: OutputId) {
    if (getOutput(output).availability !== "available") return;
    setOutputId(output);
    setPreflightResult(null);
    if (!packs[output] && signalId) {
      void generatePackFor(signalId, output);
    }
  }

  async function runPreflight() {
    const pack = packs[outputId];
    if (!pack || !run) return;

    const runId = runRef.current;
    setStage("preflight");
    setPreflightRunning(true);
    setPreflightError(null);
    try {
      const result = await createApiClient(run.mode).preflight({
        contentPack: pack,
      });
      if (runId !== runRef.current) return;
      setPreflightResult(result);
    } catch (error) {
      if (runId !== runRef.current) return;
      setPreflightResult(null);
      setPreflightError(asUiError(error));
    } finally {
      if (runId === runRef.current) setPreflightRunning(false);
    }
  }

  function restart(panel: SourceOptionId | null = null) {
    runRef.current += 1;
    setStage(panel ? "workspace" : "start");
    setStartPanel(panel);
    setRun(null);
    setAnalysis(null);
    setAnalysisError(null);
    setSignalId(null);
    setPacks({});
    setOutputId("youtube-short");
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
          {stage !== "start" && stage !== "workspace" && (
            <JourneyProgress current={STAGE_TO_JOURNEY[stage]} />
          )}
          <div className="flex items-center gap-3">
            {runtime.profile === "self_hosted" && (
              <span className="rounded-full border border-line-strong px-3 py-1 text-xs font-medium text-ink-soft">
                Private self-hosted install
              </span>
            )}
            {stage !== "start" &&
              stage !== "workspace" &&
              run?.mode === "demo" &&
              analysis && <ProvenanceBadge provenance={analysis.provenance} />}
            {stage !== "start" && (
              <Button
                variant="ghost"
                onClick={() => restart()}
                className="text-sm"
              >
                Start over
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-10 sm:px-10">
        {stage === "start" &&
          (runtime.profile === "public_demo" ? (
            <LandingScreen
              onDemo={analyzeDemo}
              onWorkspace={() => setStage("workspace")}
            />
          ) : (
            <StartScreen
              key={startPanel ?? "default"}
              runtime={runtime}
              initialPanel={startPanel}
              onAnalyzeYoutube={analyzeYoutube}
              onImport={analyzeImport}
              onDemo={analyzeDemo}
            />
          ))}

        {stage === "workspace" && (
          <StartScreen
            key={startPanel ?? "workspace"}
            runtime={runtime}
            initialPanel={startPanel}
            onAnalyzeYoutube={analyzeYoutube}
            onImport={analyzeImport}
            onDemo={analyzeDemo}
          />
        )}

        {stage === "analyzing" && run && (
          <ProgressScreen sourceUrl={run.url} importMode={run.descriptor.mode === "import"} />
        )}

        {stage === "analysis-error" && analysisError && (
          <ErrorScreen
            error={analysisError}
            onRetry={() => run && void startAnalyze(run)}
            onImport={() => restart("import")}
            onDemo={analyzeDemo}
            onRestart={() => restart()}
          />
        )}

        {stage === "signals" && analysis && run && (
          <SignalsScreen
            analysis={analysis}
            source={run.descriptor}
            onCreate={chooseSignal}
          />
        )}

        {stage === "destination" && selectedSignal && (
          <DestinationScreen
            signal={selectedSignal}
            onSelect={selectOutput}
            onBack={() => setStage("signals")}
          />
        )}

        {stage === "studio" && selectedSignal && (
          <StudioScreen
            signal={selectedSignal}
            packs={packs}
            outputId={outputId}
            generating={generating}
            generateError={generateError}
            onSwitchOutput={switchOutputInStudio}
            onChangeDestination={() => setStage("destination")}
            onRetryGenerate={() => {
              if (signalId) void generatePackFor(signalId, outputId);
            }}
            onPackChange={(output, pack) => {
              setPacks((previous) => ({ ...previous, [output]: pack }));
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

        {stage === "export" && packs[outputId] && run && (
          <ExportScreen
            pack={packs[outputId]}
            outputId={outputId}
            source={run.descriptor}
            onBack={() => setStage("preflight")}
            onRestart={() => restart()}
          />
        )}
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-6 py-5 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <p>
            NextBestContent by Tripods — from audience signals to
            publish-ready content.
          </p>
          <p>No accounts · no stored audience data · synthetic demo clearly labeled</p>
        </div>
      </footer>
    </div>
  );
}
