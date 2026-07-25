import { describe, expect, it } from "vitest";

import {
  ApplicationProfileSchema,
  AnalyzeRequestSchema,
  AnalyzeResponseSchema,
  ApiErrorResponseSchema,
  CapabilityAvailabilitySchema,
  CapabilitiesResponseSchema,
  ContentPackSchema,
  ContentTargetSchema,
  GenerateRequestSchema,
  IMPORT_THUMBNAIL_PLACEHOLDER,
  InstallationSchema,
  PreflightRequestSchema,
  SourceAssetSchema,
  SourcePlatformSchema,
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

const sourceAsset = {
  platform: "linkedin" as const,
  kind: "post" as const,
  id: "urn:li:activity:123",
  title: "A creator workflow post",
  creatorName: "Example Creator",
  thumbnailUrl: "https://example.com/workflow-thumbnail.jpg",
  canonicalUrl: "https://www.linkedin.com/posts/example-creator_workflow-123",
  sampledCommentCount: 1,
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
  it("requires a YouTube URL only for live YouTube sources", () => {
    expect(
      AnalyzeRequestSchema.safeParse({
        youtubeUrl: "https://www.youtube.com/watch?v=sjMHLfUwWL0",
        source: { type: "youtube" },
      }).success,
    ).toBe(true);
    expect(
      AnalyzeRequestSchema.safeParse({
        source: { type: "youtube" },
      }).success,
    ).toBe(false);
    expect(
      AnalyzeRequestSchema.safeParse({
        youtubeUrl: "not-a-url",
        source: { type: "youtube" },
      }).success,
    ).toBe(false);
    expect(
      AnalyzeRequestSchema.safeParse({
        modelApiKey: "request-scoped-key",
        source: {
          type: "import",
          platform: "linkedin",
          rightsConfirmed: true,
          comments: [evidence],
          video,
          sourceAsset,
        },
      }).success,
    ).toBe(true);
    expect(
      AnalyzeRequestSchema.safeParse({
        source: { type: "demo" },
      }).success,
    ).toBe(true);
  });

  it("requires imports to identify their platform and confirm usage rights", () => {
    const validImport = {
      source: {
        type: "import" as const,
        platform: "other" as const,
        rightsConfirmed: true as const,
        comments: [evidence],
      },
    };

    expect(AnalyzeRequestSchema.safeParse(validImport).success).toBe(true);
    expect(
      AnalyzeRequestSchema.safeParse({
        source: {
          type: "import",
          rightsConfirmed: true,
          comments: [evidence],
        },
      }).success,
    ).toBe(false);
    expect(
      AnalyzeRequestSchema.safeParse({
        source: {
          type: "import",
          platform: "linkedin",
          rightsConfirmed: false,
          comments: [evidence],
        },
      }).success,
    ).toBe(false);
    expect(
      AnalyzeRequestSchema.safeParse({
        source: {
          type: "import",
          platform: "linkedin",
          comments: [evidence],
        },
      }).success,
    ).toBe(false);
  });

  it("rejects unknown request fields and more than 100 imported comments", () => {
    const base = {
      youtubeUrl: "https://www.youtube.com/watch?v=sjMHLfUwWL0",
    };

    expect(
      AnalyzeRequestSchema.safeParse({
        ...base,
        source: { type: "youtube" },
        unexpected: true,
      }).success,
    ).toBe(false);
    expect(
      AnalyzeRequestSchema.safeParse({
        source: {
          type: "import",
          platform: "other",
          rightsConfirmed: true,
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

  it("accepts optional source context and requires a platform on import provenance", () => {
    const response = {
      video,
      signals: [signal("one"), signal("two"), signal("three")],
      provenance: {
        source: "import",
        evidence: "creator_supplied",
        platform: "linkedin",
      },
      sourceAsset,
    };

    expect(AnalyzeResponseSchema.safeParse(response).success).toBe(true);
    expect(
      AnalyzeResponseSchema.safeParse({
        ...response,
        provenance: {
          source: "import",
          evidence: "creator_supplied",
        },
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
  it("keeps existing six-scene packs valid without platform metadata", () => {
    expect(ContentPackSchema.safeParse(contentPack).success).toBe(true);
  });

  it("accepts additive source context and target metadata", () => {
    expect(
      ContentPackSchema.safeParse({
        ...contentPack,
        sourceAsset: {
          ...sourceAsset,
          platform: "youtube",
          kind: "video",
        },
        target: {
          platform: "youtube",
          output: "short",
        },
      }).success,
    ).toBe(true);
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

describe("platform-neutral source and target schemas", () => {
  it("accepts the supported source platforms and rejects unknown ones", () => {
    for (const platform of ["youtube", "linkedin", "other"]) {
      expect(SourcePlatformSchema.safeParse(platform).success).toBe(true);
    }
    expect(SourcePlatformSchema.safeParse("tiktok").success).toBe(false);
  });

  it("accepts bounded source context and preserves strict object validation", () => {
    expect(SourceAssetSchema.safeParse(sourceAsset).success).toBe(true);
    expect(
      SourceAssetSchema.safeParse({
        ...sourceAsset,
        sampledCommentCount: 101,
      }).success,
    ).toBe(false);
    expect(
      SourceAssetSchema.safeParse({
        ...sourceAsset,
        unexpected: true,
      }).success,
    ).toBe(false);
    expect(
      SourceAssetSchema.safeParse({
        ...sourceAsset,
        canonicalUrl: "javascript:alert(1)",
      }).success,
    ).toBe(false);
    expect(
      SourceAssetSchema.safeParse({
        ...sourceAsset,
        canonicalUrl: "not-a-url",
      }).success,
    ).toBe(false);
    expect(
      SourceAssetSchema.safeParse({
        ...sourceAsset,
        thumbnailUrl: "data:image/svg+xml,<svg></svg>",
      }).success,
    ).toBe(false);
    expect(
      SourceAssetSchema.safeParse({
        ...sourceAsset,
        thumbnailUrl: IMPORT_THUMBNAIL_PLACEHOLDER,
      }).success,
    ).toBe(true);
  });

  it("accepts only the supported platform and output target pairs", () => {
    expect(
      ContentTargetSchema.safeParse({
        platform: "youtube",
        output: "short",
      }).success,
    ).toBe(true);
    expect(
      ContentTargetSchema.safeParse({
        platform: "linkedin",
        output: "document",
      }).success,
    ).toBe(true);
    expect(
      ContentTargetSchema.safeParse({
        platform: "linkedin",
        output: "short",
      }).success,
    ).toBe(false);
  });

  it("accepts additive context and target metadata on generation requests", () => {
    expect(
      GenerateRequestSchema.safeParse({
        video,
        signal: signal("signal-1"),
        format: "carousel",
        provenance: {
          source: "import",
          evidence: "creator_supplied",
          platform: "linkedin",
        },
        sourceAsset,
        target: {
          platform: "linkedin",
          output: "document",
        },
      }).success,
    ).toBe(true);
    expect(
      GenerateRequestSchema.safeParse({
        video,
        signal: signal("signal-1"),
        format: "short",
        target: {
          platform: "linkedin",
          output: "document",
        },
      }).success,
    ).toBe(false);
  });
});

describe("CapabilitiesResponseSchema", () => {
  const capabilities = {
    profile: "self_hosted",
    installation: "private",
    availability: {
      demo: { available: true },
      modelBackedWorkflows: {
        available: false,
        reason: "configuration_missing",
      },
      requestScopedModelKey: {
        available: false,
        reason: "operator_disabled",
      },
      openai: {
        available: false,
        reason: "configuration_missing",
      },
      import: {
        available: false,
        reason: "configuration_missing",
      },
      youtubeLive: {
        available: false,
        reason: "policy_approval_required",
      },
      linkedinImport: {
        available: false,
        reason: "configuration_missing",
      },
      linkedinDirectRead: {
        available: false,
        reason: "access_not_available",
      },
      youtubeShort: { available: false, reason: "configuration_missing" },
      linkedinDocument: {
        available: false,
        reason: "configuration_missing",
      },
      linkedinPublish: { available: false, reason: "not_implemented" },
    },
    targets: [
      {
        platform: "youtube",
        format: "short",
        output: "short",
        generation: {
          available: false,
          reason: "configuration_missing",
        },
      },
      {
        platform: "linkedin",
        format: "carousel",
        output: "document",
        generation: {
          available: false,
          reason: "configuration_missing",
        },
      },
    ],
  } as const;

  it("accepts the complete response and every orthogonal profile/installation combination", () => {
    expect(CapabilitiesResponseSchema.safeParse(capabilities).success).toBe(
      true,
    );

    for (const profile of ApplicationProfileSchema.options) {
      for (const installation of InstallationSchema.options) {
        expect(
          CapabilitiesResponseSchema.safeParse({
            ...capabilities,
            profile,
            installation,
          }).success,
        ).toBe(true);
      }
    }
  });

  it("requires all declared availability entries", () => {
    const incompleteAvailability = Object.fromEntries(
      Object.entries(capabilities.availability).filter(
        ([name]) => name !== "linkedinPublish",
      ),
    );

    expect(
      CapabilitiesResponseSchema.safeParse({
        ...capabilities,
        availability: incompleteAvailability,
      }).success,
    ).toBe(false);
  });

  it("rejects unknown capability reasons and entries", () => {
    expect(
      CapabilitiesResponseSchema.safeParse({
        ...capabilities,
        availability: {
          ...capabilities.availability,
          openai: { available: false, reason: "temporarily_unavailable" },
        },
      }).success,
    ).toBe(false);
    expect(
      CapabilitiesResponseSchema.safeParse({
        ...capabilities,
        availability: {
          ...capabilities.availability,
          extraProvider: { available: true },
        },
      }).success,
    ).toBe(false);
  });

  it("requires unavailable reasons and forbids reasons on available capabilities", () => {
    expect(
      CapabilityAvailabilitySchema.safeParse({
        available: false,
      }).success,
    ).toBe(false);
    expect(
      CapabilityAvailabilitySchema.safeParse({
        available: true,
        reason: "operator_disabled",
      }).success,
    ).toBe(false);
    expect(
      CapabilityAvailabilitySchema.safeParse({
        available: false,
        reason: "enabled",
      }).success,
    ).toBe(false);
    expect(
      CapabilityAvailabilitySchema.safeParse({
        available: true,
      }).success,
    ).toBe(true);
  });

  it("requires the exact ordered target descriptors", () => {
    expect(
      CapabilitiesResponseSchema.safeParse({
        ...capabilities,
        targets: [...capabilities.targets].reverse(),
      }).success,
    ).toBe(false);
    expect(
      CapabilitiesResponseSchema.safeParse({
        ...capabilities,
        targets: [
          {
            ...capabilities.targets[0],
            output: "document",
          },
          capabilities.targets[1],
        ],
      }).success,
    ).toBe(false);
  });

  it("enforces capability aliases and target-generation invariants", () => {
    expect(
      CapabilitiesResponseSchema.safeParse({
        ...capabilities,
        availability: {
          ...capabilities.availability,
          openai: {
            available: false,
            reason: "operator_disabled",
          },
        },
      }).success,
    ).toBe(false);

    expect(
      CapabilitiesResponseSchema.safeParse({
        ...capabilities,
        availability: {
          ...capabilities.availability,
          youtubeShort: {
            available: false,
            reason: "operator_disabled",
          },
        },
      }).success,
    ).toBe(false);

    expect(
      CapabilitiesResponseSchema.safeParse({
        ...capabilities,
        targets: [
          capabilities.targets[0],
          {
            ...capabilities.targets[1],
            generation: {
              available: false,
              reason: "operator_disabled",
            },
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("does not accept the removed credential-presence object", () => {
    expect(
      CapabilitiesResponseSchema.safeParse({
        ...capabilities,
        openaiCredentials: {
          serverManaged: true,
          requestScoped: false,
        },
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

  it("accepts the platform metadata returned by live generation", () => {
    expect(
      PreflightRequestSchema.safeParse({
        contentPack: {
          ...contentPack,
          sourceAsset,
          target: {
            platform: "youtube",
            output: "short",
          },
        },
      }).success,
    ).toBe(true);
  });

  it("rejects a target that conflicts with the draft format", () => {
    expect(
      PreflightRequestSchema.safeParse({
        contentPack: {
          format: "short",
          title: "Draft",
          hook: "A useful hook for the audience",
          angle: "A focused angle",
          scenes: Array.from({ length: 6 }, (_, index) =>
            scene(index + 1, 6),
          ),
          caption: "A concise caption",
          cta: "Save this",
          hashtags: [],
          target: {
            platform: "linkedin",
            output: "document",
          },
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
