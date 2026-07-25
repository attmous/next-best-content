import type { LLMProvider } from "@/server/llm/provider";
import { describe, expect, it, vi } from "vitest";

import {
  analyzeComments,
  type AnalysisComment,
} from "./service";

const video = {
  id: "import-1",
  title: "Imported LinkedIn comments",
  channelTitle: "Creator-supplied import",
  thumbnailUrl:
    "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
  commentCount: 3,
};

const comments: AnalysisComment[] = [
  {
    id: "comment-1",
    author: "One",
    text: "Can you show the complete workflow?",
    likeCount: 5,
  },
  {
    id: "comment-2",
    author: "Two",
    text: "Which tool should a beginner use?",
    likeCount: 2,
  },
  {
    id: "comment-3",
    author: "Three",
    text: "The before and after was incredibly useful.",
    likeCount: 8,
  },
];

function draft(
  evidenceIds: string[],
  suggestedFormat: "short" | "carousel",
) {
  return {
    title: "A source-backed opportunity",
    summary: "The audience repeatedly asks for a practical explanation.",
    opportunityScore: 82,
    scoreReasons: ["Clear audience intent"],
    evidenceIds,
    recommendation: {
      workingTitle: "Show the workflow",
      hook: "Here is the step most people skip.",
      suggestedFormat,
      rationale: "A practical walkthrough answers the audience directly.",
    },
  };
}

function providerReturning(value: unknown): LLMProvider {
  return {
    generateStructured: vi.fn(async ({ schema }) => schema.parse(value)),
  };
}

describe("analyzeComments", () => {
  it("returns exactly one signal per category and reattaches original evidence", async () => {
    const provider = providerReturning({
      request: draft(["comment-1", "comment-1"], "short"),
      unansweredQuestion: draft(["comment-2"], "carousel"),
      strongReaction: draft(["comment-3"], "short"),
    });
    const ids = ["signal-request", "signal-question", "signal-reaction"];

    const result = await analyzeComments(
      {
        video,
        comments,
        provenance: {
          source: "import",
          evidence: "creator_supplied",
          platform: "linkedin",
        },
        signal: new AbortController().signal,
      },
      provider,
      () => ids.shift() ?? "unexpected",
    );

    expect(result.signals.map((signal) => signal.category)).toEqual([
      "request",
      "unanswered_question",
      "strong_reaction",
    ]);
    expect(result.signals[0].evidenceCount).toBe(1);
    expect(result.signals[0].evidence).toEqual([
      {
        author: "One",
        text: "Can you show the complete workflow?",
        likeCount: 5,
      },
    ]);
  });

  it("sends only opaque IDs and text to the model input", async () => {
    const generateStructured = vi.fn(async ({ schema, input }) => {
      expect(input).not.toContain("One");
      expect(input).not.toContain("likeCount");
      expect(input).toContain("comment-1");
      return schema.parse({
        request: draft(["comment-1"], "short"),
        unansweredQuestion: draft(["comment-2"], "carousel"),
        strongReaction: draft(["comment-3"], "short"),
      });
    });

    await analyzeComments(
      {
        video,
        comments,
        provenance: {
          source: "import",
          evidence: "creator_supplied",
          platform: "youtube",
        },
        signal: new AbortController().signal,
      },
      { generateStructured },
    );

    expect(generateStructured).toHaveBeenCalledOnce();
  });

  it("rejects undersized samples before calling the provider", async () => {
    const provider = providerReturning({});

    await expect(
      analyzeComments(
        {
          video,
          comments: comments.slice(0, 2),
          provenance: {
            source: "import",
            evidence: "creator_supplied",
            platform: "other",
          },
          signal: new AbortController().signal,
        },
        provider,
      ),
    ).rejects.toMatchObject({
      kind: "too_few_comments",
    });
    expect(provider.generateStructured).not.toHaveBeenCalled();
  });

  it("rejects duplicate source IDs before model analysis", async () => {
    const provider = providerReturning({});

    await expect(
      analyzeComments(
        {
          video,
          comments: [
            comments[0],
            { ...comments[1], id: "comment-1" },
            comments[2],
          ],
          provenance: {
            source: "import",
            evidence: "creator_supplied",
            platform: "other",
          },
          signal: new AbortController().signal,
        },
        provider,
      ),
    ).rejects.toMatchObject({
      kind: "invalid_evidence",
    });
  });

  it("filters contract-invalid live comments before any model call", async () => {
    const provider = providerReturning({});

    await expect(
      analyzeComments(
        {
          video,
          comments: [
            comments[0],
            comments[1],
            {
              ...comments[2],
              text: "x".repeat(5_001),
            },
          ],
          provenance: {
            source: "youtube",
            evidence: "live",
          },
          signal: new AbortController().signal,
        },
        provider,
      ),
    ).rejects.toMatchObject({
      kind: "too_few_comments",
    });
    expect(provider.generateStructured).not.toHaveBeenCalled();
  });
});
