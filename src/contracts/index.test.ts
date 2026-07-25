import { describe, expect, it } from "vitest";

import {
  AnalyzeRequestSchema,
  AnalyzeResponseSchema,
  ApiErrorResponseSchema,
  ContentPackSchema,
  PreflightRequestSchema,
} from "./index";

const video = {
  id: "sjMHLfUwWL0",
  title: "A creator workflow",
  channelTitle: "ChaosAdam13",
  thumbnailUrl: "https://i.ytimg.com/vi/sjMHLfUwWL0/hqdefault.jpg",
  commentCount: 42,
};

const evidence = {
  author: "Viewer",
  text: "Could you show the process step by step?",
  likeCount: 8,
};

const signal = (id: string) => ({
  id,
  category: "request" as const,
  title: "Show the complete workflow",
  summary: "Viewers want a practical walkthrough.",
  opportunityScore: 91,
  scoreReasons: ["Repeated request", "Clear audience intent"],
  evidenceCount: 8,
  evidence: [evidence],
  recommendation: {
    workingTitle: "The workflow in six steps",
    hook: "Here is the part most tutorials skip.",
    suggestedFormat: "short" as const,
    rationale: "A concise visual walkthrough directly answers the request.",
  },
});

const scene = (index: number, durationSeconds = 5) => ({
  index,
  headline: `Step ${index}`,
  body: "Explain one concrete part of the workflow.",
  visualDirection: "Show the creator working through this step.",
  voiceover: "Walk through this part clearly and concisely.",
  durationSeconds,
});

const contentPack = {
  id: "pack-1",
  format: "short" as const,
  title: "The workflow in six steps",
  hook: "Here is the part most tutorials skip.",
  angle: "Turn the audience request into a practical walkthrough.",
  scenes: Array.from({ length: 6 }, (_, index) => scene(index + 1)),
  caption: "A practical response to a real audience request.",
  cta: "What should we unpack next?",
  hashtags: ["#creatortips"],
  sourceEvidence: [evidence],
  sourceSignal: signal("signal-1"),
  provenance: {
    source: "youtube" as const,
    evidence: "live" as const,
  },
};

describe("AnalyzeRequestSchema", () => {
  it("accepts live, imported, and demo sources while preserving the base request", () => {
    const base = {
      youtubeUrl: "https://www.youtube.com/watch?v=sjMHLfUwWL0",
      modelApiKey: "request-scoped-key",
    };

    expect(
      AnalyzeRequestSchema.safeParse({
        ...base,
        source: { type: "youtube" },
      }).success,
    ).toBe(true);
    expect(
      AnalyzeRequestSchema.safeParse({
        ...base,
        source: { type: "import", comments: [evidence], video },
      }).success,
    ).toBe(true);
    expect(
      AnalyzeRequestSchema.safeParse({
        ...base,
        source: { type: "demo" },
      }).success,
    ).toBe(true);
  });

  it("rejects unknown request fields and more than 100 imported comments", () => {
    expect(
      AnalyzeRequestSchema.safeParse({
        youtubeUrl: "https://www.youtube.com/watch?v=sjMHLfUwWL0",
        source: { type: "youtube" },
        unexpected: true,
      }).success,
    ).toBe(false);
    expect(
      AnalyzeRequestSchema.safeParse({
        youtubeUrl: "https://www.youtube.com/watch?v=sjMHLfUwWL0",
        source: {
          type: "import",
          comments: Array.from({ length: 101 }, () => evidence),
        },
      }).success,
    ).toBe(false);
  });
});

describe("AnalyzeResponseSchema", () => {
  it("requires exactly three audience signals", () => {
    const response = {
      video,
      signals: [signal("one"), signal("two"), signal("three")],
      provenance: { source: "youtube", evidence: "live" },
    };

    expect(AnalyzeResponseSchema.safeParse(response).success).toBe(true);
    expect(
      AnalyzeResponseSchema.safeParse({
        ...response,
        signals: response.signals.slice(0, 2),
      }).success,
    ).toBe(false);
  });

  it("requires demo provenance to identify synthetic fixture data", () => {
    expect(
      AnalyzeResponseSchema.safeParse({
        video,
        signals: [signal("one"), signal("two"), signal("three")],
        provenance: {
          source: "demo",
          evidence: "synthetic",
          fixtureId: "adam-vagovic-v1",
        },
      }).success,
    ).toBe(true);
    expect(
      AnalyzeResponseSchema.safeParse({
        video,
        signals: [signal("one"), signal("two"), signal("three")],
        provenance: { source: "demo", evidence: "synthetic" },
      }).success,
    ).toBe(false);
  });
});

describe("ContentPackSchema", () => {
  it("accepts a six-scene Short totaling 30 to 45 seconds", () => {
    expect(ContentPackSchema.safeParse(contentPack).success).toBe(true);
  });

  it("rejects the wrong scene count and out-of-range Short timing", () => {
    expect(
      ContentPackSchema.safeParse({
        ...contentPack,
        scenes: contentPack.scenes.slice(0, 5),
      }).success,
    ).toBe(false);
    expect(
      ContentPackSchema.safeParse({
        ...contentPack,
        scenes: Array.from({ length: 6 }, (_, index) => scene(index + 1, 4)),
      }).success,
    ).toBe(false);
  });

  it("requires every carousel duration to be zero", () => {
    const carousel = {
      ...contentPack,
      format: "carousel",
      scenes: Array.from({ length: 6 }, (_, index) => scene(index + 1, 0)),
    };

    expect(ContentPackSchema.safeParse(carousel).success).toBe(true);
    expect(
      ContentPackSchema.safeParse({
        ...carousel,
        scenes: carousel.scenes.map((item, index) =>
          index === 0 ? { ...item, durationSeconds: 1 } : item,
        ),
      }).success,
    ).toBe(false);
  });
});

describe("PreflightRequestSchema", () => {
  it("accepts a bounded draft with malformed count, timing, and no evidence", () => {
    const result = PreflightRequestSchema.safeParse({
      contentPack: {
        format: "short",
        title: "Draft",
        hook: "",
        angle: "A rough angle",
        scenes: Array.from({ length: 5 }, (_, index) =>
          scene(index + 1, 60),
        ),
        caption: "",
        cta: "",
        hashtags: [],
      },
    });

    expect(result.success).toBe(true);
  });

  it("still enforces draft payload bounds", () => {
    expect(
      PreflightRequestSchema.safeParse({
        contentPack: {
          format: "short",
          title: "Draft",
          hook: "",
          angle: "",
          scenes: Array.from({ length: 13 }, (_, index) =>
            scene(index + 1),
          ),
          caption: "",
          cta: "",
          hashtags: [],
        },
      }).success,
    ).toBe(false);
  });
});

describe("ApiErrorResponseSchema", () => {
  it("accepts a typed not-implemented error with a request id", () => {
    expect(
      ApiErrorResponseSchema.safeParse({
        error: {
          code: "NOT_IMPLEMENTED",
          message: "This endpoint is part of a later integration slice.",
          retryable: false,
          requestId: "request-123",
        },
      }).success,
    ).toBe(true);
  });
});
