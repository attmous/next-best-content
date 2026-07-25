/**
 * Typed frontend client for the NextBestContent API.
 *
 * Two transports exist behind one interface:
 *
 * - `live` posts to the real App Router endpoints and parses both success and
 *   error payloads against the shared Zod contracts.
 * - `demo` serves schema-validated synthetic fixtures with realistic latency.
 *
 * Demo mode is only ever entered by an explicit user action; a failed live
 * request is surfaced as its typed error and never silently downgraded to
 * demo data.
 */
import {
  AnalyzeRequestSchema,
  AnalyzeResponseSchema,
  ApiErrorResponseSchema,
  GenerateRequestSchema,
  PreflightRequestSchema,
  PreflightResponseSchema,
  ContentPackSchema,
  type AnalyzeRequest,
  type AnalyzeResponse,
  type ContentPack,
  type GenerateRequest,
  type PreflightRequest,
  type PreflightResponse,
} from "@/contracts";
import { buildDemoContentPack, demoAnalyzeResponse } from "@/app/_demo/fixtures";
import { evaluateDraftPack } from "@/app/_demo/preflight";
import type { UiErrorCode } from "@/app/_lib/errors";

export type ApiMode = "live" | "demo";

export class ApiClientError extends Error {
  readonly code: UiErrorCode;
  readonly retryable: boolean;
  readonly requestId?: string;

  constructor(options: {
    code: UiErrorCode;
    message: string;
    retryable: boolean;
    requestId?: string;
  }) {
    super(options.message);
    this.name = "ApiClientError";
    this.code = options.code;
    this.retryable = options.retryable;
    this.requestId = options.requestId;
  }
}

export interface NextBestContentClient {
  readonly mode: ApiMode;
  analyze(request: AnalyzeRequest): Promise<AnalyzeResponse>;
  generate(request: GenerateRequest): Promise<ContentPack>;
  preflight(request: PreflightRequest): Promise<PreflightResponse>;
}

async function postJson<TResponse>(
  path: string,
  body: unknown,
  parseResponse: (payload: unknown) => TResponse,
): Promise<TResponse> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiClientError({
      code: "NETWORK_ERROR",
      message: "The request never reached the server.",
      retryable: true,
    });
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }

  if (!response.ok) {
    const envelope = ApiErrorResponseSchema.safeParse(payload);
    if (envelope.success) {
      throw new ApiClientError({
        code: envelope.data.error.code,
        message: envelope.data.error.message,
        retryable: envelope.data.error.retryable,
        requestId: envelope.data.error.requestId,
      });
    }
    throw new ApiClientError({
      code: "INTERNAL_ERROR",
      message: `The server answered with status ${response.status}.`,
      retryable: response.status >= 500,
    });
  }

  try {
    return parseResponse(payload);
  } catch {
    throw new ApiClientError({
      code: "INVALID_MODEL_OUTPUT",
      message: "The server's response did not match the expected contract.",
      retryable: true,
    });
  }
}

const liveClient: NextBestContentClient = {
  mode: "live",
  analyze(request) {
    return postJson("/api/analyze", request, (payload) =>
      AnalyzeResponseSchema.parse(payload),
    );
  },
  generate(request) {
    return postJson("/api/generate", request, (payload) =>
      ContentPackSchema.parse(payload),
    );
  },
  preflight(request) {
    return postJson("/api/preflight", request, (payload) =>
      PreflightResponseSchema.parse(payload),
    );
  },
};

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * Latency the demo transport simulates so state transitions read as real
 * work without slowing the two-minute judging path.
 */
const DEMO_LATENCY = {
  analyze: 2_400,
  generate: 900,
  preflight: 650,
} as const;

const demoClient: NextBestContentClient = {
  mode: "demo",
  async analyze(request) {
    AnalyzeRequestSchema.parse(request);
    await sleep(DEMO_LATENCY.analyze);
    return AnalyzeResponseSchema.parse(demoAnalyzeResponse);
  },
  async generate(request) {
    const parsed = GenerateRequestSchema.parse(request);
    await sleep(DEMO_LATENCY.generate);
    return buildDemoContentPack(parsed.signal.id, parsed.format);
  },
  async preflight(request) {
    const parsed = PreflightRequestSchema.parse(request);
    await sleep(DEMO_LATENCY.preflight);
    return evaluateDraftPack(parsed.contentPack);
  },
};

export function createApiClient(mode: ApiMode): NextBestContentClient {
  return mode === "demo" ? demoClient : liveClient;
}
