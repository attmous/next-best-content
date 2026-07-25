import type { ZodType } from "zod";

export type LLMProviderErrorKind =
  | "authentication"
  | "rate_limit"
  | "timeout"
  | "invalid_output"
  | "invalid_request"
  | "upstream"
  | "feature_disabled";

const ERROR_MESSAGES: Record<LLMProviderErrorKind, string> = {
  authentication: "OpenAI authentication failed.",
  rate_limit: "OpenAI rate limit exceeded.",
  timeout: "OpenAI request timed out.",
  invalid_output: "OpenAI returned an invalid structured response.",
  invalid_request: "OpenAI rejected the configured request.",
  upstream: "OpenAI request failed.",
  feature_disabled: "OpenAI generation is not available.",
};

export class LLMProviderError extends Error {
  readonly retryable: boolean;

  constructor(readonly kind: LLMProviderErrorKind) {
    super(ERROR_MESSAGES[kind]);
    this.name = "LLMProviderError";
    this.retryable =
      kind === "rate_limit" || kind === "timeout" || kind === "upstream";
  }
}

export interface StructuredGenerationRequest<T> {
  schema: ZodType<T>;
  schemaName: string;
  apiKey?: string;
  systemPrompt: string;
  userPrompt: string;
  input: string;
  maxOutputTokens: number;
  signal: AbortSignal;
}

export interface LLMProvider {
  generateStructured<T>(
    request: StructuredGenerationRequest<T>,
  ): Promise<T>;
}
