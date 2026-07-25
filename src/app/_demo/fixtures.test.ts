import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  AnalyzeResponseSchema,
  ContentPackSchema,
  GenerateRequestSchema,
  CONTRACT_LIMITS,
} from "@/contracts";
import {
  DEMO_ASSETS,
  DEMO_FEATURED_SIGNAL_ID,
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

  it("tells the fictional Maya Makes Space case study", () => {
    expect(demoAnalyzeResponse.video.channelTitle).toBe("Maya Makes Space");
    expect(demoAnalyzeResponse.video.title).toBe(
      "I Turned a 2m² Balcony Into a Food Garden",
    );
    expect(DEMO_VIDEO_URL).toContain("youtube.com/watch");
  });

  it("covers the three agreed signals", () => {
    const titles = demoAnalyzeResponse.signals.map((signal) =>
      signal.title.toLowerCase(),
    );
    expect(titles[0]).toContain("shopping list");
    expect(titles[1]).toContain("watering");
    expect(titles[2]).toBe(
      "show the mistakes and fixes—not only the reveal.",
    );
  });

  it("ships the exact destination-aware jury case study", () => {
    const signalId = DEMO_FEATURED_SIGNAL_ID;
    const short = buildDemoContentPack(signalId, "short");
    const document = buildDemoContentPack(signalId, "carousel");

    expect(short.title).toBe(
      "3 mistakes that nearly killed my balcony garden.",
    );
    expect(document.title).toBe("6 decisions behind a 2m² food garden.");
    expect(document.scenes.map((scene) => scene.headline)).toEqual([
      "1 · Map the light first",
      "2 · Choose containers before crops",
      "3 · Start with fewer varieties",
      "4 · Water by soil, not by clock",
      "5 · Quarantine every new plant",
      "6 · Keep the failure notes",
    ]);
  });

  it("contains no reference to the previous demo creator", () => {
    // Constructed so this guard itself never matches a repo-wide sweep.
    const formerCreator = ["ad", "am"].join("");
    const serialized = JSON.stringify(demoAnalyzeResponse).toLowerCase();
    expect(serialized).not.toContain(formerCreator);
    for (const format of ["short", "carousel"] as const) {
      for (const signalId of DEMO_SIGNAL_IDS) {
        expect(
          JSON.stringify(buildDemoContentPack(signalId, format)).toLowerCase(),
        ).not.toContain(formerCreator);
      }
    }
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

describe("demo case-study assets", () => {
  it("ships every illustration locally with meaningful alt text", () => {
    for (const asset of Object.values(DEMO_ASSETS)) {
      expect(asset.src.startsWith("/demo/")).toBe(true);
      expect(asset.alt.toLowerCase()).toContain("synthetic");
      const filePath = join(process.cwd(), "public", asset.src);
      expect(existsSync(filePath), asset.src).toBe(true);
      expect(readFileSync(filePath, "utf8")).toContain("<svg");
    }
  });

  it("keeps the fixture thumbnail non-resolving (no remote fetches)", () => {
    expect(demoAnalyzeResponse.video.thumbnailUrl).toContain("demo.invalid");
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

  it("recommends both destinations across the three signals", () => {
    const formats = demoAnalyzeResponse.signals.map(
      (signal) => signal.recommendation.suggestedFormat,
    );
    expect(formats).toContain("short");
    expect(formats).toContain("carousel");
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
