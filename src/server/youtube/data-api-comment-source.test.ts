import { describe, expect, it, vi } from "vitest";

import {
  createYoutubeCommentSource,
  type FetchLike,
  type YoutubeSourceEnvironment,
} from "./data-api-comment-source";
import { YoutubeSourceError } from "./errors";

const VIDEO_ID = "dQw4w9WgXcQ";
const VIDEO_URL = `https://www.youtube.com/watch?v=${VIDEO_ID}`;
const API_KEY = "youtube-secret-key";

const ENABLED_ENVIRONMENT: YoutubeSourceEnvironment = {
  APP_PROFILE: "self_hosted",
  ENABLE_YOUTUBE_API: "true",
  YOUTUBE_POLICY_APPROVED: "true",
  YOUTUBE_API_KEY: API_KEY,
};

interface RecordedFetchCall {
  init: RequestInit | undefined;
  url: URL;
}

function responseJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function videoResponse(
  privacyStatus: "private" | "public" | "unlisted" = "public",
) {
  return responseJson({
    items: [
      {
        id: VIDEO_ID,
        snippet: {
          title: "A useful creator video",
          channelTitle: "Creator",
          thumbnails: {
            default: {
              url: `https://i.ytimg.com/vi/${VIDEO_ID}/default.jpg`,
            },
            high: {
              url: `https://i.ytimg.com/vi/${VIDEO_ID}/hqdefault.jpg`,
            },
          },
        },
        status: {
          privacyStatus,
        },
      },
    ],
  });
}

function commentThread(
  id: string,
  options: {
    author?: string;
    likeCount?: number;
    text?: string;
  } = {},
) {
  return {
    snippet: {
      topLevelComment: {
        id,
        snippet: {
          authorDisplayName: options.author ?? `Author ${id}`,
          textDisplay: options.text ?? `Comment ${id}`,
          likeCount: options.likeCount ?? 0,
        },
      },
    },
  };
}

function commentsResponse(
  ids: string[],
  nextPageToken?: string,
): Response {
  return responseJson({
    items: ids.map((id) => commentThread(id)),
    ...(nextPageToken === undefined ? {} : { nextPageToken }),
  });
}

function youtubeError(reason: string, status: number): Response {
  return responseJson(
    {
      error: {
        errors: [
          {
            reason,
            message: "Untrusted upstream detail.",
          },
        ],
        message: "Untrusted upstream detail.",
      },
    },
    status,
  );
}

function asUrl(input: RequestInfo | URL): URL {
  if (input instanceof URL) {
    return new URL(input);
  }

  if (typeof input === "string") {
    return new URL(input);
  }

  return new URL(input.url);
}

function sequenceFetch(responses: Response[]): {
  calls: RecordedFetchCall[];
  fetch: FetchLike;
} {
  const calls: RecordedFetchCall[] = [];
  let responseIndex = 0;

  return {
    calls,
    fetch: vi.fn(async (input, init) => {
      calls.push({
        url: asUrl(input),
        init,
      });

      const response = responses[responseIndex];
      responseIndex += 1;
      if (response === undefined) {
        throw new Error("Unexpected fake fetch call.");
      }

      return response;
    }),
  };
}

function getCommentsOptions(
  limit = 100,
  signal = new AbortController().signal,
) {
  return {
    limit,
    signal,
  };
}

describe("createYoutubeCommentSource", () => {
  it.each([
    {
      APP_PROFILE: "self_hosted",
      ENABLE_YOUTUBE_API: "false",
      YOUTUBE_POLICY_APPROVED: "true",
      YOUTUBE_API_KEY: API_KEY,
    },
    {
      APP_PROFILE: "self_hosted",
      ENABLE_YOUTUBE_API: "true",
      YOUTUBE_POLICY_APPROVED: "false",
      YOUTUBE_API_KEY: API_KEY,
    },
    {
      APP_PROFILE: "self_hosted",
      ENABLE_YOUTUBE_API: "true",
      YOUTUBE_POLICY_APPROVED: "true",
      YOUTUBE_API_KEY: "   ",
    },
  ])(
    "fails locally without making a request when a required gate is closed",
    async (environment) => {
      const fetch = vi.fn<FetchLike>();
      const source = createYoutubeCommentSource({
        environment,
        fetch,
      });

      await expect(
        source.getComments(VIDEO_URL, getCommentsOptions()),
      ).rejects.toMatchObject({
        kind: "feature_disabled",
        message: "YouTube access is disabled.",
        retryable: false,
      });
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("ignores a fully configured YouTube credential in the public profile", async () => {
    const fetch = vi.fn<FetchLike>();
    const source = createYoutubeCommentSource({
      environment: {
        APP_PROFILE: "public_demo",
        ENABLE_YOUTUBE_API: "true",
        YOUTUBE_POLICY_APPROVED: "true",
        YOUTUBE_API_KEY: API_KEY,
      },
      fetch,
    });

    let thrown: unknown;
    try {
      await source.getComments(VIDEO_URL, getCommentsOptions());
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(YoutubeSourceError);
    expect(thrown).toMatchObject({
      kind: "feature_disabled",
      message: "YouTube access is disabled.",
      retryable: false,
    });
    expect(String(thrown)).not.toContain(API_KEY);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fetches public metadata and published top-level comments", async () => {
    const fake = sequenceFetch([
      videoResponse(),
      responseJson({
        items: [
          commentThread("comment-1", {
            author: "Viewer",
            text: "Please make a step-by-step follow-up.",
            likeCount: 42,
          }),
        ],
      }),
    ]);
    const source = createYoutubeCommentSource({
      environment: ENABLED_ENVIRONMENT,
      fetch: fake.fetch,
    });

    const result = await source.getComments(
      VIDEO_URL,
      getCommentsOptions(),
    );

    expect(result).toEqual({
      video: {
        id: VIDEO_ID,
        title: "A useful creator video",
        channelTitle: "Creator",
        thumbnailUrl: `https://i.ytimg.com/vi/${VIDEO_ID}/hqdefault.jpg`,
      },
      comments: [
        {
          id: "comment-1",
          author: "Viewer",
          text: "Please make a step-by-step follow-up.",
          likeCount: 42,
        },
      ],
    });
    expect(result.video).not.toHaveProperty("commentCount");
    expect(fake.calls).toHaveLength(2);

    const [videoCall, commentsCall] = fake.calls;
    expect(videoCall.url.pathname).toBe("/youtube/v3/videos");
    expect(videoCall.url.searchParams.get("part")).toBe("snippet,status");
    expect(videoCall.url.searchParams.get("id")).toBe(VIDEO_ID);
    expect(commentsCall.url.pathname).toBe(
      "/youtube/v3/commentThreads",
    );
    expect(commentsCall.url.searchParams.get("part")).toBe("snippet");
    expect(commentsCall.url.searchParams.get("videoId")).toBe(VIDEO_ID);
    expect(commentsCall.url.searchParams.get("maxResults")).toBe("100");
    expect(commentsCall.url.searchParams.get("order")).toBe("relevance");
    expect(commentsCall.url.searchParams.get("textFormat")).toBe(
      "plainText",
    );

    for (const call of fake.calls) {
      expect(call.url.toString()).not.toContain(API_KEY);
      expect(call.url.searchParams.has("key")).toBe(false);
      expect(new Headers(call.init?.headers).get("X-Goog-Api-Key")).toBe(
        API_KEY,
      );
      expect(call.init?.cache).toBe("no-store");
      expect(call.init?.method).toBe("GET");
    }
  });

  it("rejects an invalid URL before making a request", async () => {
    const fetch = vi.fn<FetchLike>();
    const source = createYoutubeCommentSource({
      environment: ENABLED_ENVIRONMENT,
      fetch,
    });

    await expect(
      source.getComments(
        `https://youtube.com.evil.test/watch?v=${VIDEO_ID}`,
        getCommentsOptions(),
      ),
    ).rejects.toMatchObject({
      kind: "invalid_url",
      message: "The YouTube video URL is invalid.",
      retryable: false,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("supports an accessible unlisted video", async () => {
    const fake = sequenceFetch([
      videoResponse("unlisted"),
      commentsResponse(["comment-1"]),
    ]);
    const source = createYoutubeCommentSource({
      environment: ENABLED_ENVIRONMENT,
      fetch: fake.fetch,
    });

    await expect(
      source.getComments(VIDEO_URL, getCommentsOptions()),
    ).resolves.toMatchObject({
      video: {
        id: VIDEO_ID,
      },
      comments: [
        {
          id: "comment-1",
        },
      ],
    });
  });

  it("follows page tokens only until the requested cap", async () => {
    const fake = sequenceFetch([
      videoResponse(),
      commentsResponse(["comment-1", "comment-2"], "page-2"),
      commentsResponse(["comment-3", "comment-4"], "page-3"),
    ]);
    const source = createYoutubeCommentSource({
      environment: ENABLED_ENVIRONMENT,
      fetch: fake.fetch,
    });

    const result = await source.getComments(
      VIDEO_URL,
      getCommentsOptions(3),
    );

    expect(result.comments.map((comment) => comment.id)).toEqual([
      "comment-1",
      "comment-2",
      "comment-3",
    ]);
    expect(fake.calls).toHaveLength(3);
    expect(fake.calls[1].url.searchParams.has("pageToken")).toBe(false);
    expect(fake.calls[2].url.searchParams.get("pageToken")).toBe("page-2");
  });

  it("maps disabled comments to a sanitized source error", async () => {
    const fake = sequenceFetch([
      videoResponse(),
      youtubeError("commentsDisabled", 403),
    ]);
    const source = createYoutubeCommentSource({
      environment: ENABLED_ENVIRONMENT,
      fetch: fake.fetch,
    });

    await expect(
      source.getComments(VIDEO_URL, getCommentsOptions()),
    ).rejects.toMatchObject({
      kind: "comments_disabled",
      message: "Comments are unavailable for this video.",
      retryable: false,
    });
  });

  it.each([
    {
      name: "an empty video result",
      responses: [responseJson({ items: [] })],
    },
    {
      name: "a private video result",
      responses: [videoResponse("private")],
    },
    {
      name: "a not-found upstream error",
      responses: [youtubeError("videoNotFound", 404)],
    },
  ])("maps $name to inaccessible", async ({ responses }) => {
    const fake = sequenceFetch(responses);
    const source = createYoutubeCommentSource({
      environment: ENABLED_ENVIRONMENT,
      fetch: fake.fetch,
    });

    await expect(
      source.getComments(VIDEO_URL, getCommentsOptions()),
    ).rejects.toMatchObject({
      kind: "inaccessible",
      message: "The YouTube video is unavailable.",
      retryable: false,
    });
  });

  it.each(["quotaExceeded", "dailyLimitExceeded"])(
    "maps %s to daily quota exhaustion",
    async (reason) => {
      const fake = sequenceFetch([youtubeError(reason, 403)]);
      const source = createYoutubeCommentSource({
        environment: ENABLED_ENVIRONMENT,
        fetch: fake.fetch,
      });

      await expect(
        source.getComments(VIDEO_URL, getCommentsOptions()),
      ).rejects.toMatchObject({
        kind: "quota_exceeded",
        message: "YouTube quota is unavailable.",
        retryable: true,
      });
    },
  );

  it.each([
    {
      name: "an invalid key",
      responses: [youtubeError("keyInvalid", 400)],
    },
    {
      name: "an unauthorized response",
      responses: [youtubeError("authError", 401)],
    },
    {
      name: "a forbidden response",
      responses: [
        videoResponse(),
        youtubeError("forbidden", 403),
      ],
    },
  ])("maps $name to a non-retryable configuration error", async ({
    responses,
  }) => {
    const fake = sequenceFetch(responses);
    const source = createYoutubeCommentSource({
      environment: ENABLED_ENVIRONMENT,
      fetch: fake.fetch,
    });

    await expect(
      source.getComments(VIDEO_URL, getCommentsOptions()),
    ).rejects.toMatchObject({
      kind: "authentication",
      message: "YouTube rejected its API credentials or configuration.",
      retryable: false,
    });
  });

  it.each([
    {
      response: youtubeError("rateLimitExceeded", 403),
      name: "a rate-limit reason",
    },
    {
      response: youtubeError("unknown", 429),
      name: "HTTP 429",
    },
  ])("maps $name to a retryable rate limit", async ({ response }) => {
    const fake = sequenceFetch([response]);
    const source = createYoutubeCommentSource({
      environment: ENABLED_ENVIRONMENT,
      fetch: fake.fetch,
    });

    await expect(
      source.getComments(VIDEO_URL, getCommentsOptions()),
    ).rejects.toMatchObject({
      kind: "rate_limited",
      message: "YouTube is temporarily rate limiting requests.",
      retryable: true,
    });
  });

  it.each([
    {
      name: "malformed video data",
      responses: [
        responseJson({
          items: [
            {
              id: VIDEO_ID,
              snippet: {},
              status: { privacyStatus: "public" },
            },
          ],
        }),
      ],
    },
    {
      name: "malformed comment data",
      responses: [
        videoResponse(),
        responseJson({
          items: [
            {
              snippet: {
                topLevelComment: {
                  id: "comment-1",
                  snippet: {
                    authorDisplayName: "Viewer",
                    textDisplay: "Comment",
                    likeCount: "not-a-number",
                  },
                },
              },
            },
          ],
        }),
      ],
    },
    {
      name: "an upstream service failure",
      responses: [youtubeError("backendError", 503)],
    },
  ])("maps $name to a generic upstream error", async ({ responses }) => {
    const fake = sequenceFetch(responses);
    const source = createYoutubeCommentSource({
      environment: ENABLED_ENVIRONMENT,
      fetch: fake.fetch,
    });

    await expect(
      source.getComments(VIDEO_URL, getCommentsOptions()),
    ).rejects.toMatchObject({
      kind: "upstream",
      message: "YouTube returned an unexpected response.",
      retryable: true,
    });
  });

  it("honors an operation-wide timeout", async () => {
    const fetch = vi.fn<FetchLike>(
      async (_input, init) =>
        await new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal;
          signal?.addEventListener(
            "abort",
            () => {
              reject(new DOMException("Aborted", "AbortError"));
            },
            { once: true },
          );
        }),
    );
    const source = createYoutubeCommentSource({
      environment: ENABLED_ENVIRONMENT,
      fetch,
      timeoutMs: 5,
    });

    await expect(
      source.getComments(VIDEO_URL, getCommentsOptions()),
    ).rejects.toMatchObject({
      kind: "timeout",
      message: "YouTube did not respond in time.",
      retryable: true,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("honors caller cancellation without making a request", async () => {
    const fetch = vi.fn<FetchLike>();
    const controller = new AbortController();
    controller.abort();
    const source = createYoutubeCommentSource({
      environment: ENABLED_ENVIRONMENT,
      fetch,
    });

    await expect(
      source.getComments(
        VIDEO_URL,
        getCommentsOptions(100, controller.signal),
      ),
    ).rejects.toMatchObject({
      kind: "cancelled",
      message: "The YouTube request was cancelled.",
      retryable: false,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("never exposes the API key through URLs or sanitized errors", async () => {
    const fake = sequenceFetch([
      responseJson(
        {
          error: {
            errors: [
              {
                reason: "keyInvalid",
                message: `Rejected credential ${API_KEY}`,
              },
            ],
            message: `Rejected credential ${API_KEY}`,
          },
        },
        400,
      ),
    ]);
    const source = createYoutubeCommentSource({
      environment: ENABLED_ENVIRONMENT,
      fetch: fake.fetch,
    });

    let thrown: unknown;
    try {
      await source.getComments(VIDEO_URL, getCommentsOptions());
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(YoutubeSourceError);
    expect(thrown).toMatchObject({
      kind: "authentication",
      message: "YouTube rejected its API credentials or configuration.",
    });
    expect((thrown as Error).message).not.toContain(API_KEY);
    expect(fake.calls[0].url.toString()).not.toContain(API_KEY);
  });
});
