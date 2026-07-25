import { describe, expect, it } from "vitest";

import {
  PreflightResponseSchema,
  type PreflightDraftContentPack,
} from "@/contracts";
import { buildDemoContentPack, DEMO_SIGNAL_IDS } from "./fixtures";
import { evaluateDraftPack } from "./preflight";

const CHECK_ORDER = [
  "hook",
  "audience_fit",
  "evidence",
  "clarity",
  "format",
  "cta",
  "brand_safety",
] as const;

function draftFrom(signalId: string, format: "short" | "carousel") {
  // ContentPack is structurally a valid preflight draft.
  return buildDemoContentPack(signalId, format) as PreflightDraftContentPack;
}

describe("demo preflight evaluator", () => {
  it("returns a schema-valid response with all seven checks in order", () => {
    const result = evaluateDraftPack(draftFrom(DEMO_SIGNAL_IDS[0], "short"));
    expect(() => PreflightResponseSchema.parse(result)).not.toThrow();
    expect(result.checks.map((check) => check.name)).toEqual([...CHECK_ORDER]);
  });

  it("flags the deliberately long scene body in the primary demo pack", () => {
    const result = evaluateDraftPack(draftFrom("sig-request-beginner-menu", "short"));
    const clarity = result.checks.find((check) => check.name === "clarity");
    expect(clarity?.status).toBe("warning");
    expect(clarity?.suggestedFix).toBeDefined();
    expect(result.verdict).toBe("needs_changes");
  });

  it("returns ready after the flagged copy is tightened", () => {
    const draft = draftFrom("sig-request-beginner-menu", "short");
    draft.scenes = draft.scenes.map((scene) =>
      scene.body.length > 160
        ? { ...scene, body: "Medium-low heat, keep stirring, stop when it coats the spoon." }
        : scene,
    );
    const result = evaluateDraftPack(draft);
    expect(result.verdict).toBe("ready");
    expect(result.blockingIssues).toHaveLength(0);
  });

  it("passes the untouched carousel pack as ready", () => {
    const result = evaluateDraftPack(draftFrom("sig-question-heat-setup", "carousel"));
    expect(result.verdict).toBe("ready");
    expect(result.checks.every((check) => check.status === "pass")).toBe(true);
  });

  it("blocks when the hook is deleted", () => {
    const draft = draftFrom("sig-question-heat-setup", "carousel");
    draft.hook = "";
    const result = evaluateDraftPack(draft);
    expect(result.verdict).toBe("blocked");
    const hook = result.checks.find((check) => check.name === "hook");
    expect(hook?.status).toBe("fail");
    expect(result.blockingIssues.length).toBeGreaterThan(0);
  });

  it("blocks emptied scene copy through the clarity check", () => {
    const draft = draftFrom("sig-reaction-sauce-save", "short");
    draft.scenes = draft.scenes.map((scene, index) =>
      index === 2 ? { ...scene, headline: "" } : scene,
    );
    const result = evaluateDraftPack(draft);
    const clarity = result.checks.find((check) => check.name === "clarity");
    expect(clarity?.status).toBe("fail");
    expect(clarity?.explanation).toContain("3");
    expect(result.verdict).toBe("blocked");
  });

  it("fails brand safety on performance promises", () => {
    const draft = draftFrom("sig-reaction-sauce-save", "short");
    draft.caption = `${draft.caption} This is guaranteed to go viral.`;
    const result = evaluateDraftPack(draft);
    const safety = result.checks.find((check) => check.name === "brand_safety");
    expect(safety?.status).toBe("fail");
    expect(result.verdict).toBe("blocked");
  });

  it("warns when Short durations drift outside the 30–45s window", () => {
    const draft = draftFrom("sig-reaction-sauce-save", "short");
    draft.scenes = draft.scenes.map((scene) => ({
      ...scene,
      durationSeconds: 2,
    }));
    const result = evaluateDraftPack(draft);
    const format = result.checks.find((check) => check.name === "format");
    expect(format?.status).toBe("warning");
  });

  it("flags a draft with no attached evidence", () => {
    const draft = draftFrom("sig-request-beginner-menu", "short");
    delete (draft as { sourceEvidence?: unknown }).sourceEvidence;
    const result = evaluateDraftPack(draft);
    const evidence = result.checks.find((check) => check.name === "evidence");
    expect(evidence?.status).toBe("fail");
  });
});
