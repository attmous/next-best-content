import type { GenerateRequest } from "@/contracts";
import type { LLMProvider } from "@/server/llm/provider";
import { describe, expect, it, vi } from "vitest";

import {
  generateContentPack,
} from "./service";

const evidence = {
  author: "Viewer",
  text: "Please show the process step by step.",
  likeCount: 7,
};

const baseRequest = {
  video: {
    id: "video-1",
    title: "A creator workflow",
    channelTitle: "Example creator",
    thumbnailUrl: "https://example.com/thumbnail.jpg",
  },
  signal: {
    id: "signal-1",
    category: "request" as const,
    title: "Show the process",
    summary: "Viewers want a complete walkthrough.",
    opportunityScore: 88,
    scoreReasons: ["Repeated audience request"],
    evidenceCount: 1,
    evidence: [evidence],
    recommendation: {
      workingTitle: "The complete workflow",
      hook: "Here is the step most people skip.",
      suggestedFormat: "short" as const,
      rationale: "A walkthrough directly answers the request.",
    },
  },
  provenance: {
    source: "import" as const,
    evidence: "creator_supplied" as const,
    platform: "linkedin" as const,
  },
};

const generated = {
  title: "The complete workflow",
  hook: "Here is the step most people skip.",
  angle: "A practical walkthrough grounded in the audience request.",
  scenes: Array.from({ length: 6 }, (_, index) => ({
    headline: `Step ${index + 1}`,
    body: "Explain one concrete step.",
    visualDirection: "Show the step clearly.",
    voiceover: "Walk through the step in plain language.",
  })),
  caption: "The full process, one step at a time.",
  cta: "Save this for your next project.",
  hashtags: ["#creatortips"],
};

function provider(): LLMProvider {
  return {
    generateStructured: vi.fn(async ({ schema }) =>
      schema.parse(generated),
    ),
  };
}

describe("generateContentPack", () => {
  it("builds a six-scene 36-second YouTube Short", async () => {
    const result = await generateContentPack(
      {
        ...baseRequest,
        format: "short",
        target: { platform: "youtube", output: "short" },
      },
      provider(),
      new AbortController().signal,
      () => "pack-short",
    );

    expect(result.id).toBe("pack-short");
    expect(result.target).toEqual({
      platform: "youtube",
      output: "short",
    });
    expect(result.scenes).toHaveLength(6);
    expect(
      result.scenes.reduce(
        (total, scene) => total + scene.durationSeconds,
        0,
      ),
    ).toBe(36);
  });

  it("builds a six-page LinkedIn document with zero durations", async () => {
    const result = await generateContentPack(
      {
        ...baseRequest,
        format: "carousel",
        target: { platform: "linkedin", output: "document" },
      },
      provider(),
      new AbortController().signal,
      () => "pack-document",
    );

    expect(result.target).toEqual({
      platform: "linkedin",
      output: "document",
    });
    expect(result.scenes.every((scene) => scene.durationSeconds === 0)).toBe(
      true,
    );
    expect(result.sourceEvidence).toEqual([evidence]);
    expect(result.provenance).toEqual(baseRequest.provenance);
  });

  it("does not send authors or like counts in model input", async () => {
    const generateStructured = vi.fn(async ({ schema, input }) => {
      expect(input).not.toContain('"author"');
      expect(input).not.toContain("likeCount");
      expect(input).toContain(evidence.text);
      return schema.parse(generated);
    });

    await generateContentPack(
      {
        ...baseRequest,
        format: "short",
      },
      { generateStructured },
      new AbortController().signal,
    );

    expect(generateStructured).toHaveBeenCalledOnce();
  });

  it("rejects a target that conflicts with the requested format", async () => {
    const request = {
      ...baseRequest,
      format: "short",
      target: { platform: "linkedin", output: "document" },
    } as unknown as GenerateRequest;

    await expect(
      generateContentPack(
        request,
        provider(),
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({
      kind: "target_format_mismatch",
    });
  });
});
