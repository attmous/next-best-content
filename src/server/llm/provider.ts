import type { ZodType } from "zod";

export interface StructuredGenerationRequest<T> {
  schema: ZodType<T>;
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
