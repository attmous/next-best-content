import { describe, expect, it } from "vitest";

import {
  PLATFORM_LABELS,
  SOURCE_OPTIONS,
  TARGET_PLATFORMS,
  availableOutputs,
  describeSource,
  getOutput,
  recommendedOutputFor,
} from "./platforms";

describe("platform registry", () => {
  it("keeps X and Facebook as coming-soon targets with no outputs", () => {
    for (const platform of ["x", "facebook"] as const) {
      const entry = TARGET_PLATFORMS.find(
        (candidate) => candidate.platform === platform,
      );
      expect(entry?.availability).toBe("coming_soon");
      expect(entry?.outputs).toHaveLength(0);
      expect(entry?.comingSoonCopy).toBeTruthy();
    }
  });

  it("only exposes contract-expressible outputs as available", () => {
    for (const output of availableOutputs()) {
      expect(output.contractFormat).not.toBeNull();
      expect(["short", "carousel"]).toContain(output.contractFormat);
    }
  });

  it("gates the LinkedIn text post until the contract supports it", () => {
    const textPost = getOutput("linkedin-text");
    expect(textPost.availability).toBe("gated");
    expect(textPost.contractFormat).toBeNull();
    expect(textPost.unavailableReason).toMatch(/contract/i);
  });

  it("gates LinkedIn direct ingestion with an import pointer", () => {
    const linkedinLive = SOURCE_OPTIONS.find(
      (option) => option.id === "linkedin-live",
    );
    expect(linkedinLive?.availability).toBe("gated");
    expect(linkedinLive?.unavailableReason).toMatch(/Import/i);
  });

  it("labels the demo source as demo mode", () => {
    const demo = SOURCE_OPTIONS.find((option) => option.id === "demo");
    expect(demo?.mode).toBe("demo");
    expect(demo?.availability).toBe("available");
  });

  it("maps recommendations: shorts to YouTube, carousels to LinkedIn", () => {
    expect(recommendedOutputFor("short")).toBe("youtube-short");
    expect(recommendedOutputFor("carousel")).toBe("linkedin-document");
    expect(getOutput(recommendedOutputFor("short")).platform).toBe("youtube");
    expect(getOutput(recommendedOutputFor("carousel")).platform).toBe(
      "linkedin",
    );
  });

  it("has a label for every platform", () => {
    for (const entry of TARGET_PLATFORMS) {
      expect(PLATFORM_LABELS[entry.platform]).toBeTruthy();
    }
  });

  it("keeps source and target platforms independent concepts", () => {
    // A LinkedIn-tagged import produces a descriptor that says LinkedIn…
    expect(
      describeSource({ mode: "import", platform: "linkedin" }),
    ).toContain("LinkedIn");
    // …while every registry output remains selectable regardless of source:
    // nothing in the registry keys availability off a source platform.
    for (const output of availableOutputs()) {
      expect(output).not.toHaveProperty("sourcePlatform");
    }
  });

  it("describes each source mode distinctly", () => {
    expect(describeSource({ mode: "live", platform: "youtube" })).toBe(
      "Live YouTube comments",
    );
    expect(describeSource({ mode: "import", platform: "other" })).toBe(
      "Creator-imported Other platform comments",
    );
    expect(describeSource({ mode: "demo", platform: "youtube" })).toContain(
      "Synthetic demo",
    );
  });
});
