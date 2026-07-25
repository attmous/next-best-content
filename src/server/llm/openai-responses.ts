import { toJSONSchema } from "zod";

import type {
  LLMProvider,
  StructuredGenerationRequest,
} from "./provider";
import { LLMProviderError } from "./provider";
import { resolveApplicationRuntime } from "../runtime/application-profile";

export {
  LLMProviderError,
  type LLMProviderErrorKind,
} from "./provider";

export const DEFAULT_OPENAI_RESPONSES_ENDPOINT =
  "https://api.openai.com/v1/responses";
export const DEFAULT_OPENAI_MODEL = "gpt-5.6-terra";

const DEFAULT_TIMEOUT_MS = 45_000;
const MAX_TIMEOUT_MS = 45_000;
const DEFAULT_MAX_INPUT_CHARS = 600_000;
const MAX_INPUT_CHARS = 1_000_000;
const MAX_OUTPUT_TOKENS = 128_000;

export type OpenAIReasoningEffort =
  | "none"
  | "low"
  | "medium"
  | "high"
  | "xhigh"
  | "max";

export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export interface OpenAIResponsesProviderOptions {
  fetch?: FetchLike;
  model?: string;
  requestScopedEnabled?: boolean;
  serverApiKey?: string;
  serverEnabled?: boolean;
  timeoutMs?: number;
  reasoningEffort?: OpenAIReasoningEffort;
  maxInputChars?: number;
  maxRetries?: 0 | 1;
}

export interface OpenAIResponsesEnvironmentOverrides {
  fetch?: FetchLike;
  timeoutMs?: number;
  reasoningEffort?: OpenAIReasoningEffort;
  maxInputChars?: number;
  maxRetries?: 0 | 1;
}

type Environment = Record<string, string | undefined>;
type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedInteger(
  value: number | undefined,
  fallback: number,
  maximum: number,
): number {
  if (!Number.isInteger(value) || value === undefined || value <= 0) {
    return fallback;
  }

  return Math.min(value, maximum);
}

function parseEnvironmentInteger(value: string | undefined): number | undefined {
  if (value === undefined || value.trim().length === 0) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

function parseReasoningEffort(
  value: string | undefined,
): OpenAIReasoningEffort | undefined {
  switch (value?.trim().toLowerCase()) {
    case "none":
    case "low":
    case "medium":
    case "high":
    case "xhigh":
    case "max":
      return value.trim().toLowerCase() as OpenAIReasoningEffort;
    default:
      return undefined;
  }
}

function callerAbortReason(signal: AbortSignal): unknown {
  return (
    signal.reason ??
    new DOMException("The operation was aborted.", "AbortError")
  );
}

function normalizeConfiguredValue(
  value: string | undefined,
  fallback: string,
): string {
  const normalized = value?.trim();
  return normalized ? normalized : fallback;
}

function collectOutputText(payload: JsonRecord): string {
  const output = payload.output;
  if (!Array.isArray(output)) {
    throw new LLMProviderError("invalid_output");
  }

  const textParts: string[] = [];
  let refused = false;

  for (const outputItem of output) {
    if (!isRecord(outputItem)) {
      continue;
    }

    if (outputItem.type === "refusal") {
      refused = true;
      continue;
    }

    if (outputItem.type !== "message" || !Array.isArray(outputItem.content)) {
      continue;
    }

    for (const contentItem of outputItem.content) {
      if (!isRecord(contentItem)) {
        continue;
      }

      if (contentItem.type === "refusal") {
        refused = true;
        continue;
      }

      if (
        contentItem.type === "output_text" &&
        typeof contentItem.text === "string"
      ) {
        textParts.push(contentItem.text);
      }
    }
  }

  if (refused || textParts.length === 0) {
    throw new LLMProviderError("invalid_output");
  }

  const text = textParts.join("");
  if (text.trim().length === 0) {
    throw new LLMProviderError("invalid_output");
  }

  return text;
}

export class OpenAIResponsesProvider implements LLMProvider {
  private readonly fetch: FetchLike;
  private readonly model: string;
  private readonly requestScopedEnabled: boolean;
  private readonly serverApiKey?: string;
  private readonly serverEnabled: boolean;
  private readonly timeoutMs: number;
  private readonly reasoningEffort: OpenAIReasoningEffort;
  private readonly maxInputChars: number;
  private readonly maxRetries: 0 | 1;

  constructor(options: OpenAIResponsesProviderOptions = {}) {
    this.fetch = options.fetch ?? globalThis.fetch;
    this.model = normalizeConfiguredValue(
      options.model,
      DEFAULT_OPENAI_MODEL,
    );
    this.requestScopedEnabled = options.requestScopedEnabled === true;
    this.serverEnabled = options.serverEnabled === true;
    this.serverApiKey = this.serverEnabled
      ? options.serverApiKey
      : undefined;
    this.timeoutMs = boundedInteger(
      options.timeoutMs,
      DEFAULT_TIMEOUT_MS,
      MAX_TIMEOUT_MS,
    );
    this.reasoningEffort = options.reasoningEffort ?? "medium";
    this.maxInputChars = boundedInteger(
      options.maxInputChars,
      DEFAULT_MAX_INPUT_CHARS,
      MAX_INPUT_CHARS,
    );
    this.maxRetries = options.maxRetries === 0 ? 0 : 1;
  }

  async generateStructured<T>(
    request: StructuredGenerationRequest<T>,
  ): Promise<T> {
    if (request.signal.aborted) {
      throw callerAbortReason(request.signal);
    }

    const apiKey = this.resolveApiKey(request.apiKey);
    const body = this.createRequestBody(request);
    const controller = new AbortController();
    let timedOut = false;

    const onCallerAbort = () => {
      controller.abort(callerAbortReason(request.signal));
    };
    request.signal.addEventListener("abort", onCallerAbort, { once: true });

    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort(
        new DOMException("The operation timed out.", "TimeoutError"),
      );
    }, this.timeoutMs);

    try {
      for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
        if (request.signal.aborted) {
          throw callerAbortReason(request.signal);
        }
        if (timedOut) {
          throw new LLMProviderError("timeout");
        }

        let response: Response;
        try {
          response = await this.fetch(DEFAULT_OPENAI_RESPONSES_ENDPOINT, {
            method: "POST",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body,
            signal: controller.signal,
          });
        } catch {
          if (request.signal.aborted) {
            throw callerAbortReason(request.signal);
          }
          if (timedOut) {
            throw new LLMProviderError("timeout");
          }
          throw new LLMProviderError("upstream");
        }

        const retryableStatus =
          response.status === 429 || response.status >= 500;
        if (retryableStatus && attempt < this.maxRetries) {
          continue;
        }

        if (response.status === 401 || response.status === 403) {
          throw new LLMProviderError("authentication");
        }
        if (response.status === 429) {
          throw new LLMProviderError("rate_limit");
        }
        if (response.status >= 400 && response.status < 500) {
          throw new LLMProviderError("invalid_request");
        }
        if (!response.ok) {
          throw new LLMProviderError("upstream");
        }

        let payload: unknown;
        try {
          payload = await response.json();
        } catch {
          if (request.signal.aborted) {
            throw callerAbortReason(request.signal);
          }
          if (timedOut) {
            throw new LLMProviderError("timeout");
          }
          throw new LLMProviderError("invalid_output");
        }

        if (request.signal.aborted) {
          throw callerAbortReason(request.signal);
        }
        if (timedOut) {
          throw new LLMProviderError("timeout");
        }

        return this.parsePayload(payload, request);
      }

      throw new LLMProviderError("upstream");
    } finally {
      clearTimeout(timeout);
      request.signal.removeEventListener("abort", onCallerAbort);
    }
  }

  private resolveApiKey(requestApiKey: string | undefined): string {
    const requestKey = requestApiKey?.trim();
    if (requestKey) {
      if (!this.requestScopedEnabled) {
        throw new LLMProviderError("feature_disabled");
      }

      return requestKey;
    }

    const serverKey = this.serverApiKey?.trim();
    if (!this.serverEnabled || !serverKey) {
      throw new LLMProviderError("feature_disabled");
    }

    return serverKey;
  }

  private createRequestBody<T>(
    request: StructuredGenerationRequest<T>,
  ): string {
    const schemaName = request.schemaName.trim();
    if (
      !/^[A-Za-z0-9_-]{1,64}$/.test(schemaName) ||
      request.input.length > this.maxInputChars ||
      !Number.isInteger(request.maxOutputTokens) ||
      request.maxOutputTokens <= 0 ||
      request.maxOutputTokens > MAX_OUTPUT_TOKENS
    ) {
      throw new LLMProviderError("feature_disabled");
    }

    let jsonSchema: unknown;
    try {
      jsonSchema = toJSONSchema(request.schema, {
        target: "draft-07",
        unrepresentable: "throw",
        cycles: "throw",
        reused: "inline",
      });
    } catch {
      throw new LLMProviderError("feature_disabled");
    }

    if (isRecord(jsonSchema)) {
      delete jsonSchema.$schema;
    }

    return JSON.stringify({
      model: this.model,
      store: false,
      instructions: request.systemPrompt,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: request.userPrompt,
            },
            {
              type: "input_text",
              text: request.input,
            },
          ],
        },
      ],
      max_output_tokens: request.maxOutputTokens,
      reasoning: {
        effort: this.reasoningEffort,
      },
      text: {
        format: {
          type: "json_schema",
          name: schemaName,
          strict: true,
          schema: jsonSchema,
        },
      },
    });
  }

  private parsePayload<T>(
    payload: unknown,
    request: StructuredGenerationRequest<T>,
  ): T {
    if (!isRecord(payload)) {
      throw new LLMProviderError("invalid_output");
    }

    if (payload.error !== undefined && payload.error !== null) {
      throw new LLMProviderError("upstream");
    }

    if (
      payload.status === "incomplete" ||
      (typeof payload.status === "string" &&
        payload.status !== "completed")
    ) {
      throw new LLMProviderError("invalid_output");
    }

    const outputText = collectOutputText(payload);
    let decoded: unknown;
    try {
      decoded = JSON.parse(outputText);
    } catch {
      throw new LLMProviderError("invalid_output");
    }

    const parsed = request.schema.safeParse(decoded);
    if (!parsed.success) {
      throw new LLMProviderError("invalid_output");
    }

    return parsed.data;
  }
}

export function createOpenAIResponsesProviderFromEnv(
  environment: Environment = process.env,
  overrides: OpenAIResponsesEnvironmentOverrides = {},
): OpenAIResponsesProvider {
  const runtime = resolveApplicationRuntime(environment);

  return new OpenAIResponsesProvider({
    fetch: overrides.fetch,
    model: environment.OPENAI_MODEL,
    requestScopedEnabled: runtime.requestScopedModelKeyAllowed,
    serverApiKey: runtime.serverModelAvailable
      ? environment.LLM_API_KEY
      : undefined,
    serverEnabled: runtime.serverModelAvailable,
    timeoutMs:
      overrides.timeoutMs ??
      parseEnvironmentInteger(environment.OPENAI_TIMEOUT_MS),
    reasoningEffort:
      overrides.reasoningEffort ??
      parseReasoningEffort(environment.OPENAI_REASONING_EFFORT),
    maxInputChars:
      overrides.maxInputChars ??
      parseEnvironmentInteger(environment.OPENAI_MAX_INPUT_CHARS),
    maxRetries: overrides.maxRetries,
  });
}
