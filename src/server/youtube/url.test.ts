import { describe, expect, it } from "vitest";

import { YoutubeSourceError } from "./errors";
import { normalizeYoutubeUrl } from "./url";

const VIDEO_ID = "dQw4w9WgXcQ";
const CANONICAL_URL = `https://www.youtube.com/watch?v=${VIDEO_ID}`;

describe("normalizeYoutubeUrl", () => {
  it.each([
    `https://www.youtube.com/watch?v=${VIDEO_ID}`,
    `https://youtube.com/watch?v=${VIDEO_ID}&feature=share`,
    `http://m.youtube.com/watch?v=${VIDEO_ID}`,
    `https://youtu.be/${VIDEO_ID}?t=15`,
    `https://www.youtu.be/${VIDEO_ID}`,
    `https://youtube.com/shorts/${VIDEO_ID}`,
    `https://www.youtube.com/embed/${VIDEO_ID}`,
  ])("normalizes a supported URL shape: %s", (input) => {
    expect(normalizeYoutubeUrl(input)).toEqual({
      videoId: VIDEO_ID,
      normalizedUrl: CANONICAL_URL,
    });
  });

  it.each([
    "",
    "not a url",
    `https://example.com/watch?v=${VIDEO_ID}`,
    `https://youtube.com.evil.test/watch?v=${VIDEO_ID}`,
    "https://www.youtube.com/watch",
    `https://www.youtube.com/watch?v=${VIDEO_ID}&v=aaaaaaaaaaa`,
    `https://www.youtube.com/playlist?v=${VIDEO_ID}`,
    `https://youtu.be/${VIDEO_ID}/extra`,
    `https://youtu.be/${VIDEO_ID}?v=aaaaaaaaaaa`,
    `https://youtube.com/shorts/${VIDEO_ID}/extra`,
    `https://youtube.com/shorts/${VIDEO_ID}?v=aaaaaaaaaaa`,
    `https://youtube.com/embed/${VIDEO_ID}/extra`,
    `https://youtube.com/embed/${VIDEO_ID}?v=aaaaaaaaaaa`,
    "https://youtube.com/watch?v=too-short",
    `https://user@youtube.com/watch?v=${VIDEO_ID}`,
    `https://youtube.com:8443/watch?v=${VIDEO_ID}`,
  ])("rejects an invalid or ambiguous URL without echoing it: %s", (input) => {
    let thrown: unknown;

    try {
      normalizeYoutubeUrl(input);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(YoutubeSourceError);
    expect(thrown).toMatchObject({
      kind: "invalid_url",
      message: "The YouTube video URL is invalid.",
      retryable: false,
    });
    if (input !== "") {
      expect((thrown as Error).message).not.toContain(input);
    }
  });
});
