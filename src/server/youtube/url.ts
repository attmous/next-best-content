import { YoutubeSourceError } from "./errors";

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
]);

const SHORT_HOSTS = new Set(["youtu.be", "www.youtu.be"]);

export interface NormalizedYoutubeUrl {
  videoId: string;
  normalizedUrl: string;
}

function validVideoId(candidate: string | undefined): candidate is string {
  return candidate !== undefined && VIDEO_ID_PATTERN.test(candidate);
}

function pathSegments(url: URL): string[] {
  return url.pathname.split("/").filter(Boolean);
}

function invalidUrl(): never {
  throw new YoutubeSourceError("invalid_url");
}

/**
 * Parses only documented, unambiguous video URL shapes. The returned canonical
 * URL is never used as an upstream request target; the adapter calls the
 * Google API with the extracted video ID.
 */
export function normalizeYoutubeUrl(input: string): NormalizedYoutubeUrl {
  let url: URL;

  try {
    url = new URL(input);
  } catch {
    return invalidUrl();
  }

  if (
    (url.protocol !== "https:" && url.protocol !== "http:") ||
    url.username !== "" ||
    url.password !== "" ||
    url.port !== ""
  ) {
    return invalidUrl();
  }

  const host = url.hostname.toLowerCase();
  let videoId: string | undefined;

  if (SHORT_HOSTS.has(host)) {
    const segments = pathSegments(url);
    if (segments.length !== 1 || url.searchParams.has("v")) {
      return invalidUrl();
    }
    [videoId] = segments;
  } else if (YOUTUBE_HOSTS.has(host)) {
    const segments = pathSegments(url);

    if (segments.length === 1 && segments[0] === "watch") {
      const candidates = url.searchParams.getAll("v");
      if (candidates.length !== 1) {
        return invalidUrl();
      }
      [videoId] = candidates;
    } else if (
      segments.length === 2 &&
      (segments[0] === "shorts" || segments[0] === "embed")
    ) {
      if (url.searchParams.has("v")) {
        return invalidUrl();
      }
      videoId = segments[1];
    } else {
      return invalidUrl();
    }
  } else {
    return invalidUrl();
  }

  if (!validVideoId(videoId)) {
    return invalidUrl();
  }

  return {
    videoId,
    normalizedUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}
