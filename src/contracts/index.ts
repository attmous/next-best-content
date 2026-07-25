import { z } from "zod";

export const CONTRACT_LIMITS = {
  url: 2_048,
  apiKey: 4_096,
  comments: 100,
  signals: 3,
  scenes: 6,
  preflightScenes: 12,
} as const;

const IdentifierSchema = z.string().trim().min(1).max(128);
const ShortTextSchema = z.string().trim().min(1).max(500);
const LongTextSchema = z.string().trim().min(1).max(5_000);

function usesProtocol(value: string, protocols: readonly string[]): boolean {
  try {
    return protocols.includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

const RequestUrlSchema = z
  .string()
  .url()
  .max(CONTRACT_LIMITS.url)
  .refine(
    (value) => usesProtocol(value, ["https:", "http:"]),
    "URL must use HTTP or HTTPS",
  );
const HttpsUrlSchema = z
  .string()
  .url()
  .max(CONTRACT_LIMITS.url)
  .refine(
    (value) => usesProtocol(value, ["https:"]),
    "URL must use HTTPS",
  );
export const IMPORT_THUMBNAIL_PLACEHOLDER =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
const ThumbnailUrlSchema = z.union([
  HttpsUrlSchema,
  z.literal(IMPORT_THUMBNAIL_PLACEHOLDER),
]);
const ScoreSchema = z.number().int().min(0).max(100);
const ModelApiKeySchema = z
  .string()
  .min(1)
  .max(CONTRACT_LIMITS.apiKey)
  .refine((value) => value.trim().length > 0, "API key cannot be blank");

export const ContentFormatSchema = z.enum(["short", "carousel"]);
export type ContentFormat = z.infer<typeof ContentFormatSchema>;

export const SourcePlatformSchema = z.enum([
  "youtube",
  "linkedin",
  "other",
]);
export type SourcePlatform = z.infer<typeof SourcePlatformSchema>;

export const SourceAssetSchema = z.strictObject({
  platform: SourcePlatformSchema,
  kind: z.enum(["video", "post", "import"]),
  id: IdentifierSchema.optional(),
  title: ShortTextSchema.optional(),
  creatorName: ShortTextSchema.optional(),
  thumbnailUrl: ThumbnailUrlSchema.optional(),
  canonicalUrl: HttpsUrlSchema.optional(),
  sampledCommentCount: z
    .number()
    .int()
    .nonnegative()
    .max(CONTRACT_LIMITS.comments),
});
export type SourceAsset = z.infer<typeof SourceAssetSchema>;

const YoutubeContentTargetSchema = z.strictObject({
  platform: z.literal("youtube"),
  output: z.literal("short"),
});

const LinkedinContentTargetSchema = z.strictObject({
  platform: z.literal("linkedin"),
  output: z.literal("document"),
});

export const ContentTargetSchema = z.discriminatedUnion("platform", [
  YoutubeContentTargetSchema,
  LinkedinContentTargetSchema,
]);
export type ContentTarget = z.infer<typeof ContentTargetSchema>;

function targetMatchesFormat(
  format: ContentFormat,
  target: ContentTarget | undefined,
): boolean {
  return (
    target === undefined ||
    (format === "short" &&
      target.platform === "youtube" &&
      target.output === "short") ||
    (format === "carousel" &&
      target.platform === "linkedin" &&
      target.output === "document")
  );
}

function addTargetFormatIssue(
  value: {
    format: ContentFormat;
    target?: ContentTarget;
  },
  context: z.RefinementCtx,
): void {
  if (!targetMatchesFormat(value.format, value.target)) {
    context.addIssue({
      code: "custom",
      message: "Content target is incompatible with the content format",
      path: ["target"],
    });
  }
}

export const VideoMetadataSchema = z.strictObject({
  id: IdentifierSchema,
  title: ShortTextSchema,
  channelTitle: ShortTextSchema,
  thumbnailUrl: ThumbnailUrlSchema,
  commentCount: z.number().int().nonnegative().optional(),
});
export type VideoMetadata = z.infer<typeof VideoMetadataSchema>;

export const EvidenceSchema = z.strictObject({
  author: ShortTextSchema,
  text: LongTextSchema,
  likeCount: z.number().int().nonnegative(),
});
export type Evidence = z.infer<typeof EvidenceSchema>;

export const RecommendationSchema = z.strictObject({
  workingTitle: ShortTextSchema,
  hook: LongTextSchema,
  suggestedFormat: ContentFormatSchema,
  rationale: LongTextSchema,
});
export type Recommendation = z.infer<typeof RecommendationSchema>;

export const SignalCategorySchema = z.enum([
  "request",
  "unanswered_question",
  "strong_reaction",
]);
export type SignalCategory = z.infer<typeof SignalCategorySchema>;

export const SignalSchema = z.strictObject({
  id: IdentifierSchema,
  category: SignalCategorySchema,
  title: ShortTextSchema,
  summary: LongTextSchema,
  opportunityScore: ScoreSchema,
  scoreReasons: z.array(ShortTextSchema).max(10),
  evidenceCount: z.number().int().nonnegative(),
  evidence: z.array(EvidenceSchema).min(1).max(CONTRACT_LIMITS.comments),
  recommendation: RecommendationSchema,
});
export type Signal = z.infer<typeof SignalSchema>;

const YoutubeProvenanceSchema = z.strictObject({
  source: z.literal("youtube"),
  evidence: z.literal("live"),
});

const ImportProvenanceSchema = z.strictObject({
  source: z.literal("import"),
  evidence: z.literal("creator_supplied"),
  platform: SourcePlatformSchema,
});

const DemoProvenanceSchema = z.strictObject({
  source: z.literal("demo"),
  evidence: z.literal("synthetic"),
  fixtureId: IdentifierSchema,
});

const UnknownProvenanceSchema = z.strictObject({
  source: z.literal("unknown"),
  evidence: z.literal("unknown"),
});

export const ProvenanceSchema = z.discriminatedUnion("source", [
  YoutubeProvenanceSchema,
  ImportProvenanceSchema,
  DemoProvenanceSchema,
  UnknownProvenanceSchema,
]);
export type Provenance = z.infer<typeof ProvenanceSchema>;

const YoutubeAnalyzeSourceSchema = z.strictObject({
  type: z.literal("youtube"),
});

const ImportAnalyzeSourceSchema = z.strictObject({
  type: z.literal("import"),
  platform: SourcePlatformSchema,
  rightsConfirmed: z.literal(true),
  comments: z.array(EvidenceSchema).max(CONTRACT_LIMITS.comments),
  video: VideoMetadataSchema.optional(),
  sourceAsset: SourceAssetSchema.optional(),
});

const DemoAnalyzeSourceSchema = z.strictObject({
  type: z.literal("demo"),
});

export const AnalyzeSourceSchema = z.discriminatedUnion("type", [
  YoutubeAnalyzeSourceSchema,
  ImportAnalyzeSourceSchema,
  DemoAnalyzeSourceSchema,
]);
export type AnalyzeSource = z.infer<typeof AnalyzeSourceSchema>;

export const AnalyzeRequestSchema = z
  .strictObject({
    youtubeUrl: RequestUrlSchema.optional(),
    modelApiKey: ModelApiKeySchema.optional(),
    source: AnalyzeSourceSchema,
  })
  .superRefine((request, context) => {
    if (request.source.type === "youtube" && request.youtubeUrl === undefined) {
      context.addIssue({
        code: "custom",
        message: "A YouTube URL is required for YouTube analysis",
        path: ["youtubeUrl"],
      });
    }
  });
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export const AnalyzeResponseSchema = z.strictObject({
  video: VideoMetadataSchema,
  signals: z.array(SignalSchema).length(CONTRACT_LIMITS.signals),
  provenance: ProvenanceSchema,
  sourceAsset: SourceAssetSchema.optional(),
});
export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;

export const GenerateRequestSchema = z
  .strictObject({
    video: VideoMetadataSchema,
    signal: SignalSchema,
    format: ContentFormatSchema,
    modelApiKey: ModelApiKeySchema.optional(),
    provenance: ProvenanceSchema.optional(),
    sourceAsset: SourceAssetSchema.optional(),
    target: ContentTargetSchema.optional(),
  })
  .superRefine(addTargetFormatIssue);
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

export const SceneSchema = z.strictObject({
  index: z.number().int().nonnegative(),
  headline: ShortTextSchema,
  body: LongTextSchema,
  visualDirection: LongTextSchema,
  voiceover: LongTextSchema,
  durationSeconds: z.number().finite().nonnegative().max(45),
});
export type Scene = z.infer<typeof SceneSchema>;

export const ContentPackSchema = z
  .strictObject({
    id: IdentifierSchema,
    format: ContentFormatSchema,
    title: ShortTextSchema,
    hook: LongTextSchema,
    angle: LongTextSchema,
    scenes: z.array(SceneSchema).length(CONTRACT_LIMITS.scenes),
    caption: LongTextSchema,
    cta: ShortTextSchema,
    hashtags: z.array(ShortTextSchema).max(30),
    sourceEvidence: z
      .array(EvidenceSchema)
      .min(1)
      .max(CONTRACT_LIMITS.comments),
    sourceSignal: SignalSchema,
    provenance: ProvenanceSchema,
    sourceAsset: SourceAssetSchema.optional(),
    target: ContentTargetSchema.optional(),
  })
  .superRefine((contentPack, context) => {
    addTargetFormatIssue(contentPack, context);

    if (contentPack.format === "short") {
      const totalDuration = contentPack.scenes.reduce(
        (total, scene) => total + scene.durationSeconds,
        0,
      );

      if (totalDuration < 30 || totalDuration > 45) {
        context.addIssue({
          code: "custom",
          message: "Short scenes must total between 30 and 45 seconds",
          path: ["scenes"],
        });
      }
    }

    if (
      contentPack.format === "carousel" &&
      contentPack.scenes.some((scene) => scene.durationSeconds !== 0)
    ) {
      context.addIssue({
        code: "custom",
        message: "Carousel scene durations must be 0",
        path: ["scenes"],
      });
    }
  });
export type ContentPack = z.infer<typeof ContentPackSchema>;

const DraftTextSchema = z.string().max(5_000);

export const PreflightDraftSceneSchema = z.strictObject({
  index: z.number().int().min(0).max(100),
  headline: DraftTextSchema,
  body: DraftTextSchema,
  visualDirection: DraftTextSchema,
  voiceover: DraftTextSchema,
  durationSeconds: z.number().finite().min(0).max(300),
});
export type PreflightDraftScene = z.infer<
  typeof PreflightDraftSceneSchema
>;

export const PreflightDraftContentPackSchema = z
  .strictObject({
    id: IdentifierSchema.optional(),
    format: ContentFormatSchema,
    title: DraftTextSchema,
    hook: DraftTextSchema,
    angle: DraftTextSchema,
    scenes: z
      .array(PreflightDraftSceneSchema)
      .max(CONTRACT_LIMITS.preflightScenes),
    caption: DraftTextSchema,
    cta: DraftTextSchema,
    hashtags: z.array(DraftTextSchema).max(30),
    sourceEvidence: z
      .array(EvidenceSchema)
      .max(CONTRACT_LIMITS.comments)
      .optional(),
    sourceSignal: SignalSchema.optional(),
    provenance: ProvenanceSchema.optional(),
    sourceAsset: SourceAssetSchema.optional(),
    target: ContentTargetSchema.optional(),
  })
  .superRefine(addTargetFormatIssue);
export type PreflightDraftContentPack = z.infer<
  typeof PreflightDraftContentPackSchema
>;

export const PreflightRequestSchema = z.strictObject({
  contentPack: PreflightDraftContentPackSchema,
});
export type PreflightRequest = z.infer<typeof PreflightRequestSchema>;

export const PreflightCheckNameSchema = z.enum([
  "hook",
  "audience_fit",
  "evidence",
  "clarity",
  "format",
  "cta",
  "brand_safety",
]);
export type PreflightCheckName = z.infer<typeof PreflightCheckNameSchema>;

export const PreflightCheckStatusSchema = z.enum([
  "pass",
  "warning",
  "fail",
]);
export type PreflightCheckStatus = z.infer<
  typeof PreflightCheckStatusSchema
>;

export const PreflightCheckSchema = z.strictObject({
  name: PreflightCheckNameSchema,
  score: ScoreSchema,
  status: PreflightCheckStatusSchema,
  explanation: LongTextSchema,
  suggestedFix: LongTextSchema.optional(),
});
export type PreflightCheck = z.infer<typeof PreflightCheckSchema>;

export const PreflightResponseSchema = z.strictObject({
  overallScore: ScoreSchema,
  verdict: z.enum(["ready", "needs_changes", "blocked"]),
  checks: z.array(PreflightCheckSchema).max(7),
  blockingIssues: z.array(LongTextSchema).max(20),
});
export type PreflightResponse = z.infer<typeof PreflightResponseSchema>;

export const CapabilityAvailabilityReasonSchema = z.enum([
  "configuration_missing",
  "policy_approval_required",
  "access_not_available",
  "not_implemented",
  "profile_restricted",
  "operator_disabled",
]);
export type CapabilityAvailabilityReason = z.infer<
  typeof CapabilityAvailabilityReasonSchema
>;

export const CapabilityAvailabilitySchema = z.discriminatedUnion(
  "available",
  [
    z.strictObject({
      available: z.literal(true),
    }),
    z.strictObject({
      available: z.literal(false),
      reason: CapabilityAvailabilityReasonSchema,
    }),
  ],
);
export type CapabilityAvailability = z.infer<
  typeof CapabilityAvailabilitySchema
>;

/**
 * The application profile enforces server behavior. Installation is an
 * operator-declared, advisory deployment fact and is never an access-control
 * signal. Every profile/installation combination is intentionally valid.
 */
export const ApplicationProfileSchema = z.enum([
  "public_demo",
  "self_hosted",
]);
export type ApplicationProfile = z.infer<
  typeof ApplicationProfileSchema
>;

export const InstallationSchema = z.enum(["public", "private"]);
export type Installation = z.infer<typeof InstallationSchema>;

const YoutubeCapabilityTargetSchema = z.strictObject({
  platform: z.literal("youtube"),
  format: z.literal("short"),
  output: z.literal("short"),
  generation: CapabilityAvailabilitySchema,
});

const LinkedinCapabilityTargetSchema = z.strictObject({
  platform: z.literal("linkedin"),
  format: z.literal("carousel"),
  output: z.literal("document"),
  generation: CapabilityAvailabilitySchema,
});

export const CapabilityTargetsSchema = z.tuple([
  YoutubeCapabilityTargetSchema,
  LinkedinCapabilityTargetSchema,
]);
export type CapabilityTargets = z.infer<
  typeof CapabilityTargetsSchema
>;

function sameAvailability(
  left: CapabilityAvailability,
  right: CapabilityAvailability,
): boolean {
  return (
    left.available === right.available &&
    (left.available ||
      (!right.available && left.reason === right.reason))
  );
}

export const CapabilitiesResponseSchema = z
  .strictObject({
    profile: ApplicationProfileSchema,
    installation: InstallationSchema,
    availability: z.strictObject({
      demo: CapabilityAvailabilitySchema,
      modelBackedWorkflows: CapabilityAvailabilitySchema,
      requestScopedModelKey: CapabilityAvailabilitySchema,
      /**
       * Deprecated exact alias of modelBackedWorkflows. Retained during the
       * atomic consumer migration only.
       */
      openai: CapabilityAvailabilitySchema,
      /** Creator-owned, rights-confirmed import processing. */
      import: CapabilityAvailabilitySchema,
      youtubeLive: CapabilityAvailabilitySchema,
      /** LinkedIn-labeled creator import, not a direct LinkedIn read. */
      linkedinImport: CapabilityAvailabilitySchema,
      linkedinDirectRead: CapabilityAvailabilitySchema,
      youtubeShort: CapabilityAvailabilitySchema,
      linkedinDocument: CapabilityAvailabilitySchema,
      linkedinPublish: CapabilityAvailabilitySchema,
    }),
    targets: CapabilityTargetsSchema,
  })
  .superRefine((capabilities, context) => {
    const invariants = [
      {
        matches: sameAvailability(
          capabilities.availability.openai,
          capabilities.availability.modelBackedWorkflows,
        ),
        path: ["availability", "openai"],
        message:
          "openai must exactly match modelBackedWorkflows",
      },
      {
        matches: sameAvailability(
          capabilities.availability.youtubeShort,
          capabilities.targets[0].generation,
        ),
        path: ["availability", "youtubeShort"],
        message:
          "youtubeShort must exactly match the YouTube target generation capability",
      },
      {
        matches: sameAvailability(
          capabilities.availability.linkedinDocument,
          capabilities.targets[1].generation,
        ),
        path: ["availability", "linkedinDocument"],
        message:
          "linkedinDocument must exactly match the LinkedIn target generation capability",
      },
    ] as const;

    for (const invariant of invariants) {
      if (!invariant.matches) {
        context.addIssue({
          code: "custom",
          message: invariant.message,
          path: [...invariant.path],
        });
      }
    }
  });
export type CapabilitiesResponse = z.infer<
  typeof CapabilitiesResponseSchema
>;

export const ApiErrorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "INVALID_YOUTUBE_URL",
  "COMMENTS_DISABLED",
  "TOO_FEW_COMMENTS",
  "YOUTUBE_QUOTA_EXCEEDED",
  "MODEL_AUTHENTICATION_FAILED",
  "INVALID_MODEL_OUTPUT",
  "EXTERNAL_SERVICE_TIMEOUT",
  "FEATURE_DISABLED",
  "NOT_IMPLEMENTED",
  "INTERNAL_ERROR",
]);
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;

export const ApiErrorResponseSchema = z.strictObject({
  error: z.strictObject({
    code: ApiErrorCodeSchema,
    message: LongTextSchema,
    retryable: z.boolean(),
    requestId: IdentifierSchema,
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
