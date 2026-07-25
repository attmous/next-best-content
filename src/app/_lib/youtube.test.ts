import { describe, expect, it } from "vitest";

import { parseYoutubeUrl } from "./youtube";

describe("parseYoutubeUrl", () => {
  it("parses a standard watch URL", () => {
    const result = parseYoutubeUrl("https://www.youtube.com/watch?v=sjMHLfUwWL0");
    expect(result).toEqual({
      ok: true,
      videoId: "sjMHLfUwWL0",
      normalizedUrl: "https://www.youtube.com/watch?v=sjMHLfUwWL0",
    });
  });

  it("accepts scheme-less and mobile variants", () => {
    for (const input of [
      "youtube.com/watch?v=sjMHLfUwWL0",
      "m.youtube.com/watch?v=sjMHLfUwWL0&t=42s",
      "https://youtu.be/sjMHLfUwWL0",
      "https://www.youtube.com/shorts/sjMHLfUwWL0",
      "https://www.youtube.com/live/sjMHLfUwWL0",
      "https://www.youtube.com/embed/sjMHLfUwWL0",
    ]) {
      const result = parseYoutubeUrl(input);
      expect(result.ok, input).toBe(true);
      if (result.ok) {
        expect(result.videoId).toBe("sjMHLfUwWL0");
      }
    }
  });

  it("rejects empty input", () => {
    expect(parseYoutubeUrl("   ")).toEqual({ ok: false, reason: "empty" });
  });

  it("rejects non-YouTube hosts", () => {
    expect(parseYoutubeUrl("https://vimeo.com/12345")).toEqual({
      ok: false,
      reason: "not_youtube",
    });
  });

  it("rejects YouTube pages without a video", () => {
    expect(parseYoutubeUrl("https://www.youtube.com/@MayaMakesSpace")).toEqual({
      ok: false,
      reason: "no_video",
    });
    expect(parseYoutubeUrl("https://www.youtube.com/watch?v=short")).toEqual({
      ok: false,
      reason: "no_video",
    });
  });

  it("rejects text that is not a URL", () => {
    expect(parseYoutubeUrl("not a url at all").ok).toBe(false);
  });
});
