import { describe, expect, it } from "vitest";

import { normalizeImportSource } from "./import-source";

const comments = [
  {
    author: "Viewer",
    text: "Please make a complete walkthrough.",
    likeCount: 3,
  },
  {
    author: "Another viewer",
    text: "Which tool should a beginner use?",
    likeCount: 1,
  },
  {
    author: "Third viewer",
    text: "The practical example was the best part.",
    likeCount: 5,
  },
];

describe("normalizeImportSource", () => {
  it("creates truthful generic metadata without pretending an import is live", () => {
    const result = normalizeImportSource(
      {
        type: "import",
        platform: "linkedin",
        rightsConfirmed: true,
        comments,
        sourceAsset: {
          platform: "linkedin",
          kind: "post",
          title: "A LinkedIn workflow post",
          sampledCommentCount: 1,
        },
      },
      () => "source-id",
    );

    expect(result.video).toMatchObject({
      id: "import-source-id",
      title: "A LinkedIn workflow post",
      channelTitle: "Creator-supplied audience data",
      commentCount: 3,
    });
    expect(result.sourceAsset).toMatchObject({
      platform: "linkedin",
      kind: "post",
      sampledCommentCount: 3,
    });
    expect(result.provenance).toEqual({
      source: "import",
      evidence: "creator_supplied",
      platform: "linkedin",
    });
    expect(result.comments.map((comment) => comment.id)).toEqual([
      "import-comment-1",
      "import-comment-2",
      "import-comment-3",
    ]);
  });

  it("preserves creator-supplied video metadata when present", () => {
    const video = {
      id: "video-1",
      title: "Existing video",
      channelTitle: "Creator",
      thumbnailUrl: "https://example.com/thumbnail.jpg",
      commentCount: 99,
    };

    const result = normalizeImportSource({
      type: "import",
      platform: "youtube",
      rightsConfirmed: true,
      comments,
      video,
    });

    expect(result.video).toEqual(video);
    expect(result.sourceAsset).toEqual({
      platform: "youtube",
      kind: "import",
      sampledCommentCount: 3,
    });
  });
});
