import {
  ContentPackSchema,
  GenerateRequestSchema,
} from "@/contracts";
import { validateMutationRequest } from "@/server/api/mutation-request";
import { profileDisabledResponse } from "@/server/api/profile-disabled";
import { parseJsonRequest } from "@/server/api/request";
import {
  apiErrorResponse,
  jsonResponse,
} from "@/server/api/response";
import { serviceErrorResponse } from "@/server/api/service-error";
import { generateContentPack } from "@/server/generate/service";
import {
  createOpenAIResponsesProviderFromEnv,
  type OpenAIResponsesProvider,
} from "@/server/llm/openai-responses";
import type { LLMProvider } from "@/server/llm/provider";
import { resolveApplicationRuntime } from "@/server/runtime/application-profile";

export const runtime = "nodejs";
export const maxDuration = 60;

type RuntimeEnvironment = Record<string, string | undefined>;

export interface GenerateRouteDependencies {
  environment?: RuntimeEnvironment;
  createProvider?: (
    environment: RuntimeEnvironment,
  ) => LLMProvider | OpenAIResponsesProvider;
}

function defaultProvider(
  environment: RuntimeEnvironment,
): OpenAIResponsesProvider {
  return createOpenAIResponsesProviderFromEnv(environment);
}

function modelIsAvailable(
  modelApiKey: string | undefined,
  serverModelAvailable: boolean,
  requestScopedModelKeyAllowed: boolean,
): boolean {
  if (modelApiKey !== undefined) {
    return requestScopedModelKeyAllowed;
  }

  return serverModelAvailable;
}

export function createGenerateHandler(
  dependencies: GenerateRouteDependencies = {},
) {
  return async function generateRoute(request: Request) {
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
      GenerateRequestSchema,
    );

    if (!parsedRequest.ok) {
      return parsedRequest.response;
    }

    if (
      parsedRequest.data.modelApiKey !== undefined &&
      !applicationRuntime.requestScopedModelKeyAllowed
    ) {
      return apiErrorResponse({
        code: "FEATURE_DISABLED",
        message: "Request-scoped model keys are disabled.",
        retryable: false,
        status: 503,
      });
    }

    if (
      !modelIsAvailable(
        parsedRequest.data.modelApiKey,
        applicationRuntime.serverModelAvailable,
        applicationRuntime.requestScopedModelKeyAllowed,
      )
    ) {
      return apiErrorResponse({
        code: "FEATURE_DISABLED",
        message: "Model-backed generation is disabled.",
        retryable: false,
        status: 503,
      });
    }

    try {
      const result = await generateContentPack(
        {
          ...parsedRequest.data,
          provenance: {
            source: "unknown",
            evidence: "unknown",
          },
        },
        (dependencies.createProvider ?? defaultProvider)(environment),
        request.signal,
      );

      return jsonResponse(ContentPackSchema.parse(result));
    } catch (error) {
      return serviceErrorResponse(error);
    }
  };
}

export const POST = createGenerateHandler();
