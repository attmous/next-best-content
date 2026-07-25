import {
  AnalyzeResponseSchema,
  ApiErrorResponseSchema,
  ContentPackSchema,
  type Evidence,
  type GenerateRequest,
  type Signal,
} from "@/contracts";
import {
  LLMProviderError,
  type LLMProvider,
  type StructuredGenerationRequest,
} from "@/server/llm/provider";
import { YoutubeSourceError } from "@/server/youtube";
import { describe, expect, it, vi } from "vitest";

import { createAnalyzeHandler } from "./analyze/route";
import { createGenerateHandler } from "./generate/route";
import { POST as preflight } from "./preflight/route";

const comments: Evidence[] = [
  {
    author: "Viewer one",
    text: "Please make a complete setup walkthrough.",
    likeCount: 8,
  },
  {
    author: "Viewer two",
    text: "Which tool should a beginner choose?",
    likeCount: 5,
  },
  {
    author: "Viewer three",
    text: "The real example made this click for me.",
    likeCount: 13,
  },
];

const signalDraft = {
  title: "A practical audience opportunity",
  summary: "The audience wants a concrete answer with a worked example.",
  opportunityScore: 82,
  scoreReasons: ["Repeated, specific, and actionable"],
  recommendation: {
    workingTitle: "The complete beginner workflow",
    hook: "Build the workflow with me from an empty project.",
    suggestedFormat: "short" as const,
    rationale: "It directly answers the supplied audience evidence.",
  },
};

const analysisDraft = {
  request: {
    ...signalDraft,
    evidenceIds: ["import-comment-1"],
  },
  unansweredQuestion: {
    ...signalDraft,
    evidenceIds: ["import-comment-2"],
  },
  strongReaction: {
    ...signalDraft,
    evidenceIds: ["import-comment-3"],
  },
};

const generatedDraft = {
  title: "The complete beginner workflow",
  hook: "Start with the one decision that makes everything else easier.",
  angle: "A compact, evidence-backed walkthrough.",
  scenes: Array.from({ length: 6 }, (_, index) => ({
    headline: `Step ${index + 1}`,
    body: "Explain one useful idea clearly.",
    visualDirection: "Use a clean vertical demonstration.",
    voiceover: "Walk through the idea in plain language.",
  })),
  caption: "A practical answer to a question from the audience.",
  cta: "Save this for your next project.",
  hashtags: ["#creatortips"],
};

const selectedSignal: Signal = {
  id: "signal-1",
  category: "request",
  ...signalDraft,
  evidenceCount: 1,
  evidence: [comments[0]],
};

const generateRequest: GenerateRequest = {
  video: {
    id: "video-1",
    title: "A source video",
    channelTitle: "Creator",
    thumbnailUrl: "https://example.com/thumbnail.jpg",
  },
  signal: selectedSignal,
  format: "short",
  target: {
    platform: "youtube",
    output: "short",
  },
};

const selfHostedWithoutModelEnvironment = {
  APP_PROFILE: "self_hosted",
  APP_INSTALLATION: "private",
} as const;

const selfHostedEnvironment = {
  ...selfHostedWithoutModelEnvironment,
  ENABLE_SERVER_LLM_KEY: "true",
  LLM_API_KEY: "test-server-key",
} as const;

const selfHostedYoutubeEnvironment = {
  ...selfHostedEnvironment,
  ENABLE_YOUTUBE_API: "true",
  YOUTUBE_POLICY_APPROVED: "true",
  YOUTUBE_API_KEY: "youtube-key",
} as const;

const publicDemoEnvironment = {
  APP_PROFILE: "public_demo",
  APP_INSTALLATION: "public",
  ENABLE_SERVER_LLM_KEY: "true",
  LLM_API_KEY: "configured-server-secret",
  ENABLE_OPENAI_API: "true",
  OPENAI_API_KEY: "configured-legacy-secret",
  ENABLE_OPENAI_BYOK: "true",
  ENABLE_YOUTUBE_API: "true",
  YOUTUBE_POLICY_APPROVED: "true",
  YOUTUBE_API_KEY: "configured-youtube-secret",
} as const;

class StaticProvider implements LLMProvider {
  lastApiKey: string | undefined;

  constructor(private readonly output: unknown) {}

  async generateStructured<T>(
    request: StructuredGenerationRequest<T>,
  ): Promise<T> {
    this.lastApiKey = request.apiKey;
    return request.schema.parse(this.output);
  }
}

class FailingProvider implements LLMProvider {
  constructor(private readonly error: unknown) {}

  async generateStructured<T>(): Promise<T> {
    throw this.error;
  }
}

function jsonRequest(
  path: string,
  body: unknown,
  headers: HeadersInit = {},
): Request {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function rawRequest(path: string, body: string): Request {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
  });
}

function importAnalyzeBody(commentList: Evidence[] = comments) {
  return {
    source: {
      type: "import" as const,
      platform: "linkedin" as const,
      rightsConfirmed: true as const,
      comments: commentList,
      sourceAsset: {
        platform: "linkedin" as const,
        kind: "post" as const,
        title: "A creator-owned LinkedIn post",
        sampledCommentCount: commentList.length,
      },
    },
  };
}

describe("POST /api/analyze", () => {
  it("rejects every public-demo analysis path before parsing or constructing dependencies", async () => {
    const createProvider = vi.fn(() => new StaticProvider(analysisDraft));
    const createYoutubeSource = vi.fn(() => ({
      getComments: vi.fn(),
    }));
    const analyze = createAnalyzeHandler({
      environment: publicDemoEnvironment,
      createProvider,
      createYoutubeSource,
    });
    const submittedSecret = "submitted-public-secret";
    const forbiddenValues = [
      submittedSecret,
      publicDemoEnvironment.LLM_API_KEY,
      publicDemoEnvironment.OPENAI_API_KEY,
      publicDemoEnvironment.YOUTUBE_API_KEY,
    ];
    const requests = [
      jsonRequest("/api/analyze", {
        ...importAnalyzeBody([
          { ...comments[0], text: submittedSecret },
          ...comments.slice(1),
        ]),
      }),
      jsonRequest("/api/analyze", {
        youtubeUrl: "https://youtu.be/dQw4w9WgXcQ",
        source: { type: "youtube" },
      }),
      jsonRequest("/api/analyze", { source: { type: "demo" } }),
      jsonRequest("/api/analyze", {
        ...importAnalyzeBody(),
        modelApiKey: submittedSecret,
      }),
      rawRequest("/api/analyze", `{"secret":"${submittedSecret}"`),
      rawRequest(
        "/api/analyze",
        `{"secret":"${submittedSecret}${"x".repeat(2 * 1024 * 1024)}"}`,
      ),
      new Request("http://localhost/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
          Origin: "https://attacker.example",
        },
        body: submittedSecret,
      }),
    ];

    const errors = [];
    for (const request of requests) {
      const response = await analyze(request);
      const rawResult = await response.json();
      const result = ApiErrorResponseSchema.parse(rawResult);

      expect(response.status).toBe(503);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(result.error.code).toBe("FEATURE_DISABLED");
      expect(result.error.retryable).toBe(false);
      for (const forbiddenValue of forbiddenValues) {
        expect(JSON.stringify(rawResult)).not.toContain(
          forbiddenValue,
        );
      }
      errors.push(result.error);
    }

    expect(new Set(errors.map((error) => error.requestId)).size).toBe(
      errors.length,
    );
    expect(createProvider).not.toHaveBeenCalled();
    expect(createYoutubeSource).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: "unsupported media type",
      headers: new Headers({ "Content-Type": "text/plain" }),
      status: 415,
      code: "VALIDATION_ERROR",
    },
    {
      name: "cross-origin JSON",
      headers: new Headers({
        "Content-Type": "application/json",
        Origin: "https://attacker.example",
      }),
      status: 403,
      code: "FEATURE_DISABLED",
    },
  ] as const)(
    "rejects $name before reading the analysis body or constructing dependencies",
    async ({ headers, status, code }) => {
      const createProvider = vi.fn(
        () => new StaticProvider(analysisDraft),
      );
      const createYoutubeSource = vi.fn(() => ({
        getComments: vi.fn(),
      }));
      const analyze = createAnalyzeHandler({
        environment: selfHostedYoutubeEnvironment,
        createProvider,
        createYoutubeSource,
      });
      const submittedSecret = "guarded-analysis-secret";
      const response = await analyze(
        new Request("http://localhost/api/analyze", {
          method: "POST",
          headers,
          body: JSON.stringify({
            youtubeUrl: `https://youtu.be/dQw4w9WgXcQ?value=${submittedSecret}`,
            source: { type: "youtube" },
          }),
        }),
      );
      const rawResult = await response.json();
      const result = ApiErrorResponseSchema.parse(rawResult);

      expect(response.status).toBe(status);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(result.error.code).toBe(code);
      expect(result.error.retryable).toBe(false);
      expect(JSON.stringify(rawResult)).not.toContain(submittedSecret);
      expect(createProvider).not.toHaveBeenCalled();
      expect(createYoutubeSource).not.toHaveBeenCalled();
    },
  );

  it("analyzes a creator-owned import and preserves truthful provenance", async () => {
    const analyze = createAnalyzeHandler({
      environment: selfHostedEnvironment,
      createProvider: () => new StaticProvider(analysisDraft),
    });

    const response = await analyze(
      jsonRequest("/api/analyze", importAnalyzeBody(), {
        Origin: "http://localhost",
        "Sec-Fetch-Site": "same-origin",
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");

    const result = AnalyzeResponseSchema.parse(await response.json());
    expect(result.signals.map((signal) => signal.category)).toEqual([
      "request",
      "unanswered_question",
      "strong_reaction",
    ]);
    expect(result.provenance).toEqual({
      source: "import",
      evidence: "creator_supplied",
      platform: "linkedin",
    });
    expect(result.sourceAsset).toMatchObject({
      platform: "linkedin",
      kind: "post",
      sampledCommentCount: 3,
    });
  });

  it("normalizes a live YouTube source before analysis", async () => {
    const getComments = vi.fn(async () => ({
      video: {
        id: "dQw4w9WgXcQ",
        title: "Source video",
        channelTitle: "Creator",
        thumbnailUrl: "https://example.com/youtube.jpg",
      },
      comments: comments.map((comment, index) => ({
        id: `youtube-comment-${index + 1}`,
        ...comment,
      })),
    }));
    const youtubeDraft = {
      request: {
        ...signalDraft,
        evidenceIds: ["youtube-comment-1"],
      },
      unansweredQuestion: {
        ...signalDraft,
        evidenceIds: ["youtube-comment-2"],
      },
      strongReaction: {
        ...signalDraft,
        evidenceIds: ["youtube-comment-3"],
      },
    };
    const analyze = createAnalyzeHandler({
      environment: selfHostedYoutubeEnvironment,
      createProvider: () => new StaticProvider(youtubeDraft),
      createYoutubeSource: () => ({ getComments }),
    });

    const response = await analyze(
      jsonRequest("/api/analyze", {
        youtubeUrl: "https://youtu.be/dQw4w9WgXcQ?t=10",
        source: { type: "youtube" },
      }),
    );

    expect(response.status).toBe(200);
    expect(getComments).toHaveBeenCalledWith(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      expect.objectContaining({ limit: 100 }),
    );

    const result = AnalyzeResponseSchema.parse(await response.json());
    expect(result.provenance).toEqual({
      source: "youtube",
      evidence: "live",
    });
    expect(result.sourceAsset).toMatchObject({
      platform: "youtube",
      kind: "video",
      canonicalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      sampledCommentCount: 3,
    });
  });

  it("returns typed validation errors for malformed and invalid input", async () => {
    const createProvider = vi.fn(() => new StaticProvider(analysisDraft));
    const analyze = createAnalyzeHandler({
      environment: selfHostedEnvironment,
      createProvider,
    });

    const malformed = await analyze(rawRequest("/api/analyze", "{"));
    const invalid = await analyze(
      jsonRequest("/api/analyze", {
        source: {
          ...importAnalyzeBody().source,
          rightsConfirmed: false,
        },
      }),
    );

    for (const response of [malformed, invalid]) {
      expect(response.status).toBe(400);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      const result = ApiErrorResponseSchema.parse(await response.json());
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
    expect(createProvider).not.toHaveBeenCalled();
  });

  it("rejects imports with too little evidence", async () => {
    const analyze = createAnalyzeHandler({
      environment: selfHostedEnvironment,
      createProvider: () => new StaticProvider(analysisDraft),
    });

    const response = await analyze(
      jsonRequest("/api/analyze", importAnalyzeBody(comments.slice(0, 2))),
    );
    const result = ApiErrorResponseSchema.parse(await response.json());

    expect(response.status).toBe(422);
    expect(result.error.code).toBe("TOO_FEW_COMMENTS");
    expect(result.error.retryable).toBe(false);
  });

  it("keeps demo analysis and request-scoped keys explicitly gated", async () => {
    const createProvider = vi.fn(() => new StaticProvider(analysisDraft));
    const analyze = createAnalyzeHandler({
      environment: selfHostedEnvironment,
      createProvider,
    });

    const demoResponse = await analyze(
      jsonRequest("/api/analyze", { source: { type: "demo" } }),
    );
    const byokResponse = await analyze(
      jsonRequest("/api/analyze", {
        ...importAnalyzeBody(),
        modelApiKey: "request-secret",
      }),
    );

    for (const response of [demoResponse, byokResponse]) {
      const result = ApiErrorResponseSchema.parse(await response.json());
      expect(response.status).toBe(503);
      expect(result.error.code).toBe("FEATURE_DISABLED");
      expect(JSON.stringify(result)).not.toContain("request-secret");
    }
    expect(createProvider).not.toHaveBeenCalled();
  });

  it("allows a request-scoped key only when its exact gate is enabled", async () => {
    const provider = new StaticProvider(analysisDraft);
    const analyze = createAnalyzeHandler({
      environment: {
        ...selfHostedEnvironment,
        ENABLE_OPENAI_BYOK: "true",
      },
      createProvider: () => provider,
    });

    const response = await analyze(
      jsonRequest("/api/analyze", {
        ...importAnalyzeBody(),
        modelApiKey: "request-secret",
      }),
    );

    expect(response.status).toBe(200);
    expect(provider.lastApiKey).toBe("request-secret");
  });

  it("fails before spending YouTube quota when OpenAI is unavailable", async () => {
    const createYoutubeSource = vi.fn(() => ({
      getComments: vi.fn(),
    }));
    const analyze = createAnalyzeHandler({
      environment: {
        ...selfHostedWithoutModelEnvironment,
        ENABLE_YOUTUBE_API: "true",
        YOUTUBE_POLICY_APPROVED: "true",
        YOUTUBE_API_KEY: "youtube-key",
      },
      createYoutubeSource,
    });

    const response = await analyze(
      jsonRequest("/api/analyze", {
        youtubeUrl: "https://youtu.be/dQw4w9WgXcQ",
        source: { type: "youtube" },
      }),
    );
    const result = ApiErrorResponseSchema.parse(await response.json());

    expect(response.status).toBe(503);
    expect(result.error.code).toBe("FEATURE_DISABLED");
    expect(createYoutubeSource).not.toHaveBeenCalled();
  });

  it("does not let an injected provider bypass model configuration", async () => {
    const createProvider = vi.fn(() => new StaticProvider(analysisDraft));
    const analyze = createAnalyzeHandler({
      environment: selfHostedWithoutModelEnvironment,
      createProvider,
    });

    const response = await analyze(
      jsonRequest("/api/analyze", importAnalyzeBody()),
    );
    const result = ApiErrorResponseSchema.parse(await response.json());

    expect(response.status).toBe(503);
    expect(result.error.code).toBe("FEATURE_DISABLED");
    expect(result.error.retryable).toBe(false);
    expect(createProvider).not.toHaveBeenCalled();
  });

  it("does not let an injected source bypass self-hosted YouTube policy gates", async () => {
    const createYoutubeSource = vi.fn(() => ({
      getComments: vi.fn(),
    }));
    const analyze = createAnalyzeHandler({
      environment: selfHostedEnvironment,
      createProvider: () => new StaticProvider(analysisDraft),
      createYoutubeSource,
    });

    const response = await analyze(
      jsonRequest("/api/analyze", {
        youtubeUrl: "https://youtu.be/dQw4w9WgXcQ",
        source: { type: "youtube" },
      }),
    );
    const result = ApiErrorResponseSchema.parse(await response.json());

    expect(response.status).toBe(503);
    expect(result.error.code).toBe("FEATURE_DISABLED");
    expect(result.error.retryable).toBe(false);
    expect(createYoutubeSource).not.toHaveBeenCalled();
  });

  it("maps sanitized source and model failures without leaking details", async () => {
    const youtubeFailure = createAnalyzeHandler({
      environment: selfHostedYoutubeEnvironment,
      createProvider: () => new StaticProvider(analysisDraft),
      createYoutubeSource: () => ({
        getComments: async () => {
          throw new YoutubeSourceError("comments_disabled");
        },
      }),
    });
    const modelFailure = createAnalyzeHandler({
      environment: selfHostedEnvironment,
      createProvider: () =>
        new FailingProvider(new LLMProviderError("invalid_output")),
    });

    const sourceResponse = await youtubeFailure(
      jsonRequest("/api/analyze", {
        youtubeUrl: "https://youtu.be/dQw4w9WgXcQ",
        source: { type: "youtube" },
      }),
    );
    const modelResponse = await modelFailure(
      jsonRequest("/api/analyze", importAnalyzeBody()),
    );

    expect(
      ApiErrorResponseSchema.parse(await sourceResponse.json()).error.code,
    ).toBe("COMMENTS_DISABLED");
    expect(
      ApiErrorResponseSchema.parse(await modelResponse.json()).error.code,
    ).toBe("INVALID_MODEL_OUTPUT");
  });

  it("assigns unique request IDs to separate failures", async () => {
    const analyze = createAnalyzeHandler({
      environment: selfHostedEnvironment,
    });
    const first = ApiErrorResponseSchema.parse(
      await (await analyze(rawRequest("/api/analyze", "{"))).json(),
    );
    const second = ApiErrorResponseSchema.parse(
      await (await analyze(rawRequest("/api/analyze", "{"))).json(),
    );

    expect(first.error.requestId).not.toBe(second.error.requestId);
  });
});

describe("POST /api/generate", () => {
  it("rejects every public-demo generation path before parsing or constructing a provider", async () => {
    const createProvider = vi.fn(() => new StaticProvider(generatedDraft));
    const generate = createGenerateHandler({
      environment: publicDemoEnvironment,
      createProvider,
    });
    const submittedSecret = "submitted-generation-secret";
    const requests = [
      jsonRequest("/api/generate", generateRequest),
      jsonRequest("/api/generate", {
        ...generateRequest,
        format: "carousel",
        target: {
          platform: "linkedin",
          output: "document",
        },
      }),
      jsonRequest("/api/generate", {
        ...generateRequest,
        modelApiKey: submittedSecret,
      }),
      rawRequest("/api/generate", `{"secret":"${submittedSecret}"`),
      new Request("http://localhost/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
          Origin: "https://attacker.example",
        },
        body: submittedSecret,
      }),
    ];

    const errors = [];
    for (const request of requests) {
      const response = await generate(request);
      const rawResult = await response.json();
      const result = ApiErrorResponseSchema.parse(rawResult);

      expect(response.status).toBe(503);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(result.error.code).toBe("FEATURE_DISABLED");
      expect(result.error.retryable).toBe(false);
      expect(JSON.stringify(rawResult)).not.toContain(submittedSecret);
      errors.push(result.error);
    }

    expect(new Set(errors.map((error) => error.requestId)).size).toBe(
      errors.length,
    );
    expect(createProvider).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: "unsupported media type",
      headers: new Headers({ "Content-Type": "text/plain" }),
      status: 415,
      code: "VALIDATION_ERROR",
    },
    {
      name: "cross-origin JSON",
      headers: new Headers({
        "Content-Type": "application/json",
        Origin: "https://attacker.example",
      }),
      status: 403,
      code: "FEATURE_DISABLED",
    },
  ] as const)(
    "rejects $name before reading the generation body or constructing a provider",
    async ({ headers, status, code }) => {
      const createProvider = vi.fn(
        () => new StaticProvider(generatedDraft),
      );
      const generate = createGenerateHandler({
        environment: selfHostedEnvironment,
        createProvider,
      });
      const submittedSecret = "guarded-generation-secret";
      const response = await generate(
        new Request("http://localhost/api/generate", {
          method: "POST",
          headers,
          body: JSON.stringify({
            ...generateRequest,
            signal: {
              ...generateRequest.signal,
              summary: submittedSecret,
            },
          }),
        }),
      );
      const rawResult = await response.json();
      const result = ApiErrorResponseSchema.parse(rawResult);

      expect(response.status).toBe(status);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(result.error.code).toBe(code);
      expect(result.error.retryable).toBe(false);
      expect(JSON.stringify(rawResult)).not.toContain(submittedSecret);
      expect(createProvider).not.toHaveBeenCalled();
    },
  );

  it("generates a YouTube Short content pack", async () => {
    const generate = createGenerateHandler({
      environment: selfHostedEnvironment,
      createProvider: () => new StaticProvider(generatedDraft),
    });

    const response = await generate(
      jsonRequest("/api/generate", {
        ...generateRequest,
        provenance: {
          source: "youtube",
          evidence: "live",
        },
      }, {
        Origin: "http://localhost",
        "Sec-Fetch-Site": "same-origin",
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");

    const result = ContentPackSchema.parse(await response.json());
    expect(result.target).toEqual({
      platform: "youtube",
      output: "short",
    });
    expect(result.provenance).toEqual({
      source: "unknown",
      evidence: "unknown",
    });
    expect(
      result.scenes.reduce(
        (duration, scene) => duration + scene.durationSeconds,
        0,
      ),
    ).toBe(36);

    const preflightResponse = await preflight(
      jsonRequest("/api/preflight", {
        contentPack: result,
      }),
    );
    expect(preflightResponse.status).toBe(200);
  });

  it("generates a zero-duration LinkedIn document draft", async () => {
    const generate = createGenerateHandler({
      environment: selfHostedEnvironment,
      createProvider: () => new StaticProvider(generatedDraft),
    });

    const response = await generate(
      jsonRequest("/api/generate", {
        ...generateRequest,
        format: "carousel",
        target: {
          platform: "linkedin",
          output: "document",
        },
      }),
    );

    const result = ContentPackSchema.parse(await response.json());
    expect(result.format).toBe("carousel");
    expect(result.scenes.every((scene) => scene.durationSeconds === 0)).toBe(
      true,
    );
  });

  it("rejects malformed JSON and incompatible targets before generation", async () => {
    const generate = createGenerateHandler({
      environment: selfHostedEnvironment,
      createProvider: () => new StaticProvider(generatedDraft),
    });

    const malformed = await generate(rawRequest("/api/generate", "{"));
    const incompatible = await generate(
      jsonRequest("/api/generate", {
        ...generateRequest,
        target: {
          platform: "linkedin",
          output: "document",
        },
      }),
    );

    expect(
      ApiErrorResponseSchema.parse(await malformed.json()).error.code,
    ).toBe("VALIDATION_ERROR");
    expect(
      ApiErrorResponseSchema.parse(await incompatible.json()).error.code,
    ).toBe("VALIDATION_ERROR");
  });

  it("keeps BYOK disabled unless its explicit gate is enabled", async () => {
    const createProvider = vi.fn(() => new StaticProvider(generatedDraft));
    const generate = createGenerateHandler({
      environment: selfHostedEnvironment,
      createProvider,
    });

    const response = await generate(
      jsonRequest("/api/generate", {
        ...generateRequest,
        modelApiKey: "request-secret",
      }),
    );
    const rawResult = await response.json();
    const result = ApiErrorResponseSchema.parse(rawResult);

    expect(response.status).toBe(503);
    expect(result.error.code).toBe("FEATURE_DISABLED");
    expect(JSON.stringify(rawResult)).not.toContain("request-secret");
    expect(createProvider).not.toHaveBeenCalled();
  });

  it("passes an enabled request-scoped key to generation", async () => {
    const provider = new StaticProvider(generatedDraft);
    const generate = createGenerateHandler({
      environment: {
        ...selfHostedEnvironment,
        ENABLE_OPENAI_BYOK: "true",
      },
      createProvider: () => provider,
    });

    const response = await generate(
      jsonRequest("/api/generate", {
        ...generateRequest,
        modelApiKey: "request-secret",
      }),
    );

    expect(response.status).toBe(200);
    expect(provider.lastApiKey).toBe("request-secret");
  });

  it("does not let an injected provider bypass generation model configuration", async () => {
    const createProvider = vi.fn(
      () => new StaticProvider(generatedDraft),
    );
    const generate = createGenerateHandler({
      environment: selfHostedWithoutModelEnvironment,
      createProvider,
    });

    const response = await generate(
      jsonRequest("/api/generate", generateRequest),
    );
    const result = ApiErrorResponseSchema.parse(await response.json());

    expect(response.status).toBe(503);
    expect(result.error.code).toBe("FEATURE_DISABLED");
    expect(result.error.retryable).toBe(false);
    expect(createProvider).not.toHaveBeenCalled();
  });

  it("maps provider failures to typed, non-cacheable responses", async () => {
    const generate = createGenerateHandler({
      environment: selfHostedEnvironment,
      createProvider: () =>
        new FailingProvider(new LLMProviderError("authentication")),
    });

    const response = await generate(
      jsonRequest("/api/generate", generateRequest),
    );
    const result = ApiErrorResponseSchema.parse(await response.json());

    expect(response.status).toBe(502);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(result.error.code).toBe("MODEL_AUTHENTICATION_FAILED");
    expect(result.error.retryable).toBe(false);
  });
});
