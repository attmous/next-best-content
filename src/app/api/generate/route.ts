import {
  ContentPackSchema,
  GenerateRequestSchema,
} from "@/contracts";
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
  environment: RuntimeEnvironment,
  hasInjectedProvider: boolean,
): boolean {
  if (hasInjectedProvider) {
    return true;
  }

  if (modelApiKey !== undefined) {
    return environment.ENABLE_OPENAI_BYOK === "true";
  }

  return (
    environment.ENABLE_OPENAI_API === "true" &&
    (environment.OPENAI_API_KEY?.trim().length ?? 0) > 0
  );
}

export function createGenerateHandler(
  dependencies: GenerateRouteDependencies = {},
) {
  return async function generateRoute(request: Request) {
    const parsedRequest = await parseJsonRequest(
      request,
      GenerateRequestSchema,
    );

    if (!parsedRequest.ok) {
      return parsedRequest.response;
    }

    const environment = dependencies.environment ?? process.env;
    if (
      parsedRequest.data.modelApiKey !== undefined &&
      environment.ENABLE_OPENAI_BYOK !== "true"
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
        environment,
        dependencies.createProvider !== undefined,
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
