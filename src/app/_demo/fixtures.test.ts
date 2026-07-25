import { describe, expect, it } from "vitest";

import {
  AnalyzeResponseSchema,
  ContentPackSchema,
  GenerateRequestSchema,
  CONTRACT_LIMITS,
} from "@/contracts";
import {
  DEMO_SIGNAL_IDS,
  DEMO_VIDEO_URL,
  buildDemoContentPack,
  demoAnalyzeResponse,
} from "./fixtures";

describe("demo analyze fixture", () => {
  it("validates against the shared analyze response schema", () => {
    expect(() => AnalyzeResponseSchema.parse(demoAnalyzeResponse)).not.toThrow();
  });

  it("returns exactly three signals in card order", () => {
    expect(demoAnalyzeResponse.signals).toHaveLength(CONTRACT_LIMITS.signals);
    expect(demoAnalyzeResponse.signals.map((signal) => signal.category)).toEqual(
      ["request", "unanswered_question", "strong_reaction"],
    );
  });

  it("is explicitly labeled as synthetic demo data", () => {
    expect(demoAnalyzeResponse.provenance).toMatchObject({
      source: "demo",
      evidence: "synthetic",
    });
  });

  it("targets the agreed demo video", () => {
    expect(DEMO_VIDEO_URL).toBe("https://www.youtube.com/watch?v=sjMHLfUwWL0");
    expect(demoAnalyzeResponse.video.id).toBe("sjMHLfUwWL0");
    expect(demoAnalyzeResponse.video.channelTitle).toBe("ChaosAdam13");
  });

  it("carries at least two evidence previews per signal", () => {
    for (const signal of demoAnalyzeResponse.signals) {
      expect(signal.evidence.length).toBeGreaterThanOrEqual(2);
      expect(signal.evidenceCount).toBeGreaterThanOrEqual(
        signal.evidence.length,
      );
    }
  });
});

describe("demo content packs", () => {
  it("builds a schema-valid pack for every signal in both formats", () => {
    for (const signalId of DEMO_SIGNAL_IDS) {
      for (const format of ["short", "carousel"] as const) {
        const pack = buildDemoContentPack(signalId, format);
        expect(() => ContentPackSchema.parse(pack)).not.toThrow();
        expect(pack.scenes).toHaveLength(CONTRACT_LIMITS.scenes);
      }
    }
  });

  it("keeps Short runtimes inside the 30–45s contract window", () => {
    for (const signalId of DEMO_SIGNAL_IDS) {
      const pack = buildDemoContentPack(signalId, "short");
      const total = pack.scenes.reduce(
        (sum, scene) => sum + scene.durationSeconds,
        0,
      );
      expect(total).toBeGreaterThanOrEqual(30);
      expect(total).toBeLessThanOrEqual(45);
    }
  });

  it("zeroes carousel slide durations", () => {
    for (const signalId of DEMO_SIGNAL_IDS) {
      const pack = buildDemoContentPack(signalId, "carousel");
      expect(pack.scenes.every((scene) => scene.durationSeconds === 0)).toBe(
        true,
      );
    }
  });

  it("produces packs usable as generate-request round trips", () => {
    const signal = demoAnalyzeResponse.signals[0];
    const request = {
      video: demoAnalyzeResponse.video,
      signal,
      format: "short" as const,
      provenance: demoAnalyzeResponse.provenance,
    };
    expect(() => GenerateRequestSchema.parse(request)).not.toThrow();
  });

  it("rejects unknown signals instead of inventing content", () => {
    expect(() => buildDemoContentPack("sig-unknown", "short")).toThrow();
  });
});
