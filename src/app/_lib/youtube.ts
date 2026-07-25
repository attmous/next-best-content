const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
]);

const PATH_PREFIXES = ["/shorts/", "/live/", "/embed/", "/v/"];

export type YoutubeUrlParseResult =
  | { ok: true; videoId: string; normalizedUrl: string }
  | { ok: false; reason: "empty" | "not_a_url" | "not_youtube" | "no_video" };

/**
 * Accepts standard watch URLs, youtu.be short links, Shorts, live, and embed
 * paths. Returns a canonical watch URL so the backend always receives one
 * predictable shape.
 */
export function parseYoutubeUrl(rawInput: string): YoutubeUrlParseResult {
  const input = rawInput.trim();

  if (input.length === 0) {
    return { ok: false, reason: "empty" };
  }

  const withScheme = /^https?:\/\//i.test(input) ? input : `https://${input}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return { ok: false, reason: "not_a_url" };
  }

  const host = url.hostname.toLowerCase();

  if (host === "youtu.be") {
    const candidate = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return toResult(candidate);
  }

  if (!YOUTUBE_HOSTS.has(host)) {
    return { ok: false, reason: "not_youtube" };
  }

  if (url.pathname === "/watch") {
    return toResult(url.searchParams.get("v") ?? "");
  }

  for (const prefix of PATH_PREFIXES) {
    if (url.pathname.startsWith(prefix)) {
      const candidate = url.pathname.slice(prefix.length).split("/")[0] ?? "";
      return toResult(candidate);
    }
  }

  return { ok: false, reason: "no_video" };
}

function toResult(candidate: string): YoutubeUrlParseResult {
  if (!VIDEO_ID_PATTERN.test(candidate)) {
    return { ok: false, reason: "no_video" };
  }

  return {
    ok: true,
    videoId: candidate,
    normalizedUrl: `https://www.youtube.com/watch?v=${candidate}`,
  };
}
