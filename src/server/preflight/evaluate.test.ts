import { describe, expect, it } from "vitest";

import {
  PreflightResponseSchema,
  type Evidence,
  type PreflightCheckName,
  type PreflightDraftContentPack,
  type Signal,
} from "@/contracts";
import { evaluatePreflight } from "./evaluate";

const CHECK_ORDER: PreflightCheckName[] = [
  "hook",
  "audience_fit",
  "evidence",
  "clarity",
  "format",
  "cta",
  "brand_safety",
];

const evidence: Evidence[] = Array.from({ length: 3 }, (_, index) => ({
  author: `Viewer ${index + 1}`,
  text: "Please show the practical creator workflow step by step.",
  likeCount: index,
}));

const signal: Signal = {
  id: "signal-1",
  category: "request",
  title: "Creator workflow audience strategy",
  summary: "Practical tutorial planning framework",
  opportunityScore: 91,
  scoreReasons: ["Repeated audience request"],
  evidenceCount: evidence.length,
  evidence,
  recommendation: {
    workingTitle: "A practical creator workflow",
    hook: "Plan a useful tutorial from audience evidence.",
    suggestedFormat: "short",
    rationale: "The audience asked for a concrete planning framework.",
  },
};

function makeDraft(): PreflightDraftContentPack {
  return {
    id: "pack-1",
    format: "short",
    title: "Creator workflow audience strategy",
    hook: "A practical tutorial planning framework for creator strategy.",
    angle: "Turn audience evidence into a clear tutorial.",
    scenes: Array.from({ length: 6 }, (_, index) => ({
      index,
      headline: `Workflow step ${index + 1}`,
      body: "Explain one concrete part of the framework.",
      visualDirection: "Show the creator completing this step.",
      voiceover: "Walk through the practical planning choice.",
      durationSeconds: 5,
    })),
    caption: "Use this audience framework to plan the workflow.",
    cta: "Save this workflow for later.",
    hashtags: ["#creatortips"],
    sourceEvidence: evidence.map((item) => ({ ...item })),
    sourceSignal: {
      ...signal,
      evidence: signal.evidence.map((item) => ({ ...item })),
    },
    provenance: {
      source: "demo",
      evidence: "synthetic",
      fixtureId: "server-preflight-test",
    },
  };
}

function getCheck(
  result: ReturnType<typeof evaluatePreflight>,
  name: PreflightCheckName,
) {
  return result.checks.find((check) => check.name === name);
}

describe("evaluatePreflight", () => {
  it("returns a schema-valid ready response with seven checks in contract order", () => {
    const result = evaluatePreflight(makeDraft());

    expect(() => PreflightResponseSchema.parse(result)).not.toThrow();
    expect(result.checks.map((check) => check.name)).toEqual(CHECK_ORDER);
    expect(result.checks.map((check) => check.score)).toEqual([
      91, 86, 92, 90, 92, 90, 96,
    ]);
    expect(result.overallScore).toBe(91);
    expect(result.verdict).toBe("ready");
    expect(result.blockingIssues).toEqual([]);
  });

  it("applies the hook thresholds and exact scores", () => {
    const empty = makeDraft();
    empty.hook = " ";
    expect(getCheck(evaluatePreflight(empty), "hook")).toMatchObject({
      score: 10,
      status: "fail",
      explanation:
        "The pack has no hook. Without an opening line there is nothing to stop the scroll.",
    });

    const short = makeDraft();
    short.hook = "Short promise";
    expect(getCheck(evaluatePreflight(short), "hook")).toMatchObject({
      score: 55,
      status: "warning",
      explanation:
        "The hook is only 13 characters — too thin to set up the promise.",
    });

    const long = makeDraft();
    long.hook = "x".repeat(161);
    expect(getCheck(evaluatePreflight(long), "hook")).toMatchObject({
      score: 62,
      status: "warning",
      suggestedFix: "Tighten the hook under 160 characters.",
    });
  });

  it("measures audience fit from significant signal vocabulary", () => {
    const noSignal = makeDraft();
    delete noSignal.sourceSignal;
    expect(getCheck(evaluatePreflight(noSignal), "audience_fit")).toMatchObject({
      score: 50,
      status: "warning",
    });

    const drifted = makeDraft();
    drifted.sourceSignal = {
      ...signal,
      title: "Bananas oranges peaches",
      summary: "Mangoes cherries apricots",
    };
    expect(getCheck(evaluatePreflight(drifted), "audience_fit")).toMatchObject({
      score: 30,
      status: "fail",
    });

    const partial = makeDraft();
    partial.sourceSignal = {
      ...signal,
      title: "Creator workflow bananas",
      summary: "Oranges peaches mangoes",
    };
    expect(getCheck(evaluatePreflight(partial), "audience_fit")).toMatchObject({
      score: 60,
      status: "warning",
      explanation:
        "Only 2 of 6 signal terms survive in the draft — the content is drifting from what the audience asked for.",
    });
  });

  it("scores evidence by the number of attached comments", () => {
    const none = makeDraft();
    delete none.sourceEvidence;
    expect(getCheck(evaluatePreflight(none), "evidence")).toMatchObject({
      score: 15,
      status: "fail",
    });

    const one = makeDraft();
    one.sourceEvidence = evidence.slice(0, 1);
    expect(getCheck(evaluatePreflight(one), "evidence")).toMatchObject({
      score: 60,
      status: "warning",
      explanation:
        "Only 1 supporting comment is attached — a thin base for the claim.",
    });

    const four = makeDraft();
    four.sourceEvidence = [...evidence, { ...evidence[0], author: "Viewer 4" }];
    expect(getCheck(evaluatePreflight(four), "evidence")).toMatchObject({
      score: 95,
      status: "pass",
    });
  });

  it("fails empty scene copy before warning about long body copy", () => {
    const draft = makeDraft();
    draft.scenes[1].headline = "";
    draft.scenes[3].body = "x".repeat(161);

    expect(getCheck(evaluatePreflight(draft), "clarity")).toMatchObject({
      score: 30,
      status: "fail",
      explanation:
        "Scene 2 is missing a headline or body, leaving a hole in the storyline.",
    });
  });

  it("warns for long on-screen scene copy", () => {
    const draft = makeDraft();
    draft.scenes[1].body = "x".repeat(161);
    draft.scenes[3].body = "y".repeat(180);

    expect(getCheck(evaluatePreflight(draft), "clarity")).toMatchObject({
      score: 64,
      status: "warning",
      explanation:
        "Scenes 2, 4 run past 160 characters of on-screen text — hard to read at watch speed.",
      suggestedFix:
        "Trim the body copy of scene 2 and 4 under 160 characters in the studio.",
    });
  });

  it("requires exactly six scenes before evaluating format timing", () => {
    const draft = makeDraft();
    draft.scenes = draft.scenes.slice(0, 5);

    expect(getCheck(evaluatePreflight(draft), "format")).toMatchObject({
      score: 20,
      status: "fail",
      explanation:
        "The pack has 5 scenes; the Short format requires exactly six.",
    });
  });

  it("evaluates Short and carousel timing rules", () => {
    const short = makeDraft();
    short.scenes = short.scenes.map((scene) => ({
      ...scene,
      durationSeconds: 2,
    }));
    expect(getCheck(evaluatePreflight(short), "format")).toMatchObject({
      score: 55,
      status: "warning",
      explanation:
        "The six scenes total 12s; Shorts work best between 30 and 45 seconds.",
    });

    const carousel = makeDraft();
    carousel.format = "carousel";
    expect(getCheck(evaluatePreflight(carousel), "format")).toMatchObject({
      score: 60,
      status: "warning",
    });

    carousel.scenes = carousel.scenes.map((scene) => ({
      ...scene,
      durationSeconds: 0,
    }));
    expect(getCheck(evaluatePreflight(carousel), "format")).toMatchObject({
      score: 92,
      status: "pass",
    });
  });

  it("applies the CTA thresholds and exact scores", () => {
    const empty = makeDraft();
    empty.cta = " ";
    expect(getCheck(evaluatePreflight(empty), "cta")).toMatchObject({
      score: 15,
      status: "fail",
    });

    const long = makeDraft();
    long.cta = "x".repeat(81);
    expect(getCheck(evaluatePreflight(long), "cta")).toMatchObject({
      score: 62,
      status: "warning",
      explanation:
        "The call to action is 81 characters — long enough to blur the ask.",
    });
  });

  it("fails all configured risky claim patterns in deterministic order", () => {
    const draft = makeDraft();
    draft.caption =
      "Guarantee you go viral, get rich, find overnight success, hack the algorithm, see 100% works, and discover a miracle.";

    expect(getCheck(evaluatePreflight(draft), "brand_safety")).toEqual({
      name: "brand_safety",
      score: 25,
      status: "fail",
      explanation:
        'The copy makes promises it can\'t keep: "guarantee", "go viral", "get rich", "overnight success", "hack the algorithm", "100% success", "miracle".',
      suggestedFix:
        "Remove performance promises — let the audience evidence carry the claim instead.",
    });
  });

  it("rounds the average, prioritizes blocked, and derives issues from failed checks", () => {
    const draft = makeDraft();
    draft.hook = "";
    draft.cta = "";
    draft.caption = "This is guaranteed to go viral.";
    draft.scenes[0].body = "x".repeat(161);

    const result = evaluatePreflight(draft);
    const failedExplanations = result.checks
      .filter((check) => check.status === "fail")
      .map((check) => check.explanation);

    expect(result.checks.map((check) => check.score)).toEqual([
      10, 85, 92, 64, 92, 15, 25,
    ]);
    expect(result.overallScore).toBe(55);
    expect(result.verdict).toBe("blocked");
    expect(result.blockingIssues).toEqual(failedExplanations);
  });

  it("returns needs_changes when warnings exist without failures", () => {
    const draft = makeDraft();
    draft.hook = "Short promise";

    const result = evaluatePreflight(draft);

    expect(result.verdict).toBe("needs_changes");
    expect(result.blockingIssues).toEqual([]);
  });
});
