import {
  AnalyzeRequestSchema,
  AnalyzeResponseSchema,
  type AnalyzeRequest,
} from "@/contracts";
import { normalizeImportSource } from "@/server/analyze/import-source";
import { analyzeComments } from "@/server/analyze/service";
import { validateMutationRequest } from "@/server/api/mutation-request";
import { profileDisabledResponse } from "@/server/api/profile-disabled";
import { parseJsonRequest } from "@/server/api/request";
import {
  apiErrorResponse,
  jsonResponse,
} from "@/server/api/response";
import { serviceErrorResponse } from "@/server/api/service-error";
import {
  createOpenAIResponsesProviderFromEnv,
  type OpenAIResponsesProvider,
} from "@/server/llm/openai-responses";
import type { LLMProvider } from "@/server/llm/provider";
import { resolveApplicationRuntime } from "@/server/runtime/application-profile";
import {
  createYoutubeCommentSource,
  normalizeYoutubeUrl,
  type CommentSource,
} from "@/server/youtube";

export const runtime = "nodejs";
export const maxDuration = 60;

type RuntimeEnvironment = Record<string, string | undefined>;

export interface AnalyzeRouteDependencies {
  environment?: RuntimeEnvironment;
  createProvider?: (
    environment: RuntimeEnvironment,
  ) => LLMProvider | OpenAIResponsesProvider;
  createYoutubeSource?: (
    environment: RuntimeEnvironment,
  ) => CommentSource;
}

function byokDisabledResponse() {
  return apiErrorResponse({
    code: "FEATURE_DISABLED",
    message: "Request-scoped model keys are disabled.",
    retryable: false,
    status: 503,
  });
}

function demoDisabledResponse() {
  return apiErrorResponse({
    code: "FEATURE_DISABLED",
    message: "The synthetic demo is available only through the local demo flow.",
    retryable: false,
    status: 503,
  });
}

function modelDisabledResponse() {
  return apiErrorResponse({
    code: "FEATURE_DISABLED",
    message: "Model-backed analysis is disabled.",
    retryable: false,
    status: 503,
  });
}

function youtubeDisabledResponse() {
  return apiErrorResponse({
    code: "FEATURE_DISABLED",
    message: "Live YouTube analysis is disabled.",
    retryable: false,
    status: 503,
  });
}

function defaultProvider(
  environment: RuntimeEnvironment,
): OpenAIResponsesProvider {
  return createOpenAIResponsesProviderFromEnv(environment);
}

function defaultYoutubeSource(
  environment: RuntimeEnvironment,
): CommentSource {
  return createYoutubeCommentSource({ environment });
}

function requestAllowsByok(
  request: AnalyzeRequest,
  requestScopedModelKeyAllowed: boolean,
): boolean {
  return (
    request.modelApiKey === undefined ||
    requestScopedModelKeyAllowed
  );
}

function modelIsAvailable(
  request: AnalyzeRequest,
  serverModelAvailable: boolean,
  requestScopedModelKeyAllowed: boolean,
): boolean {
  if (request.modelApiKey !== undefined) {
    return requestScopedModelKeyAllowed;
  }

  return serverModelAvailable;
}

export function createAnalyzeHandler(
  dependencies: AnalyzeRouteDependencies = {},
) {
  return async function analyzeRoute(request: Request) {
    const environment = dependencies.environment ?? process.env;
    const applicationRuntime =
      resolveApplicationRuntime(environment);
    if (applicationRuntime.profile !== "self_hosted") {
      return profileDisabledResponse();
    }

    const invalidMutation = validateMutationRequest(request);
    if (invalidMutation !== undefined) {
      return invalidMutation;
    }

    const parsedRequest = await parseJsonRequest(
      request,
      AnalyzeRequestSchema,
    );

    if (!parsedRequest.ok) {
      return parsedRequest.response;
    }

    if (
      !requestAllowsByok(
        parsedRequest.data,
        applicationRuntime.requestScopedModelKeyAllowed,
      )
    ) {
      return byokDisabledResponse();
    }

    if (parsedRequest.data.source.type === "demo") {
      return demoDisabledResponse();
    }

    if (
      !modelIsAvailable(
        parsedRequest.data,
        applicationRuntime.serverModelAvailable,
        applicationRuntime.requestScopedModelKeyAllowed,
      )
    ) {
      return modelDisabledResponse();
    }

    if (
      parsedRequest.data.source.type === "youtube" &&
      !applicationRuntime.youtubeSourceAvailable
    ) {
      return youtubeDisabledResponse();
    }

    try {
      let analysisInput;

      if (parsedRequest.data.source.type === "import") {
        analysisInput = normalizeImportSource(parsedRequest.data.source);
      } else {
        const youtubeUrl = parsedRequest.data.youtubeUrl;
        if (youtubeUrl === undefined) {
          return serviceErrorResponse(
            new TypeError("Validated YouTube request is missing its URL."),
          );
        }

        const normalizedUrl = normalizeYoutubeUrl(youtubeUrl).normalizedUrl;
        const source = await (
          dependencies.createYoutubeSource ?? defaultYoutubeSource
        )(environment).getComments(normalizedUrl, {
          limit: 100,
          signal: request.signal,
        });

        analysisInput = {
          ...source,
          provenance: {
            source: "youtube" as const,
            evidence: "live" as const,
          },
          sourceAsset: {
            platform: "youtube" as const,
            kind: "video" as const,
            id: source.video.id,
            title: source.video.title,
            creatorName: source.video.channelTitle,
            thumbnailUrl: source.video.thumbnailUrl,
            canonicalUrl: normalizedUrl,
            sampledCommentCount: source.comments.length,
          },
        };
      }

      const result = await analyzeComments(
        {
          ...analysisInput,
          modelApiKey: parsedRequest.data.modelApiKey,
          signal: request.signal,
        },
        (dependencies.createProvider ?? defaultProvider)(environment),
      );

      return jsonResponse(AnalyzeResponseSchema.parse(result));
    } catch (error) {
      return serviceErrorResponse(error);
    }
  };
}

export const POST = createAnalyzeHandler();
