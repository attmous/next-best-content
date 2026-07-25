import { z } from "zod";
import { describe, expect, it, vi } from "vitest";

import type { StructuredGenerationRequest } from "./provider";
import {
  createOpenAIResponsesProviderFromEnv,
  LLMProviderError,
  OpenAIResponsesProvider,
  type FetchLike,
} from "./openai-responses";

const ResultSchema = z.strictObject({
  answer: z.string(),
});

function request(
  overrides: Partial<StructuredGenerationRequest<{ answer: string }>> = {},
): StructuredGenerationRequest<{ answer: string }> {
  return {
    schema: ResultSchema,
    schemaName: "test_result",
    systemPrompt: "Return a safe structured result.",
    userPrompt: "Analyze the supplied input.",
    input: "creator-supplied input",
    maxOutputTokens: 500,
    signal: new AbortController().signal,
    ...overrides,
  };
}

function successfulResponse(value: unknown = { answer: "done" }): Response {
  return Response.json({
    status: "completed",
    output: [
      {
        type: "reasoning",
        id: "reasoning-first",
      },
      {
        type: "message",
        role: "assistant",
        content: [
          {
            type: "output_text",
            text: JSON.stringify(value),
          },
        ],
      },
    ],
  });
}

function providerWithFetch(
  fetch: FetchLike,
  options: Partial<ConstructorParameters<typeof OpenAIResponsesProvider>[0]> = {},
): OpenAIResponsesProvider {
  return new OpenAIResponsesProvider({
    fetch,
    serverEnabled: true,
    serverApiKey: "server-key",
    ...options,
  });
}

async function providerError(
  promise: Promise<unknown>,
): Promise<LLMProviderError> {
  try {
    await promise;
    throw new Error("Expected provider call to fail.");
  } catch (error) {
    expect(error).toBeInstanceOf(LLMProviderError);
    return error as LLMProviderError;
  }
}

describe("OpenAIResponsesProvider", () => {
  it("sends a non-stored strict Responses API request and scans all output items", async () => {
    const fetch = vi.fn<FetchLike>(async () => successfulResponse());
    const provider = createOpenAIResponsesProviderFromEnv(
      {
        APP_PROFILE: "self_hosted",
        ENABLE_SERVER_LLM_KEY: "true",
        LLM_API_KEY: "server-key",
      },
      {
        fetch,
        reasoningEffort: "low",
      },
    );

    await expect(provider.generateStructured(request())).resolves.toEqual({
      answer: "done",
    });
    expect(fetch).toHaveBeenCalledOnce();

    const [endpoint, init] = fetch.mock.calls[0];
    expect(endpoint).toBe("https://api.openai.com/v1/responses");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer server-key",
      "Content-Type": "application/json",
    });

    const body = JSON.parse(String(init?.body));
    expect(body).toMatchObject({
      model: "gpt-5.6-terra",
      store: false,
      instructions: "Return a safe structured result.",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Analyze the supplied input.",
            },
            {
              type: "input_text",
              text: "creator-supplied input",
            },
          ],
        },
      ],
      max_output_tokens: 500,
      reasoning: {
        effort: "low",
      },
      text: {
        format: {
          type: "json_schema",
          name: "test_result",
          strict: true,
          schema: {
            type: "object",
            properties: {
              answer: {
                type: "string",
              },
            },
            required: ["answer"],
            additionalProperties: false,
          },
        },
      },
    });
    expect(body.text.format.schema).not.toHaveProperty("$schema");
    expect(String(init?.body)).not.toContain("server-key");
  });

  it("uses a request-scoped key ahead of server configuration", async () => {
    const fetch = vi.fn<FetchLike>(async () => successfulResponse());
    const provider = new OpenAIResponsesProvider({
      fetch,
      requestScopedEnabled: true,
      serverEnabled: false,
      serverApiKey: "server-key",
    });

    await provider.generateStructured(request({ apiKey: " request-key " }));

    expect(fetch.mock.calls[0][1]?.headers).toMatchObject({
      Authorization: "Bearer request-key",
    });
  });

  it("fails closed when server access is disabled or credentials are missing", async () => {
    const fetch = vi.fn<FetchLike>(async () => successfulResponse());
    const disabled = new OpenAIResponsesProvider({
      fetch,
      serverEnabled: false,
      serverApiKey: "server-key",
    });
    const missing = new OpenAIResponsesProvider({
      fetch,
      serverEnabled: true,
      serverApiKey: " ",
    });
    const requestScopedDisabled = new OpenAIResponsesProvider({
      fetch,
    });

    await expect(
      providerError(disabled.generateStructured(request())),
    ).resolves.toMatchObject({
      kind: "feature_disabled",
      retryable: false,
    });
    await expect(
      providerError(missing.generateStructured(request())),
    ).resolves.toMatchObject({
      kind: "feature_disabled",
      retryable: false,
    });
    await expect(
      providerError(
        requestScopedDisabled.generateStructured(
          request({ apiKey: "request-key" }),
        ),
      ),
    ).resolves.toMatchObject({
      kind: "feature_disabled",
      retryable: false,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: "the exact server-key opt-in is absent",
      environment: {
        APP_PROFILE: "self_hosted",
        LLM_API_KEY: "server-key",
      },
    },
    {
      name: "the server key is absent",
      environment: {
        APP_PROFILE: "self_hosted",
        ENABLE_SERVER_LLM_KEY: "true",
      },
    },
    {
      name: "the server-key opt-in has the wrong case",
      environment: {
        APP_PROFILE: "self_hosted",
        ENABLE_SERVER_LLM_KEY: "TRUE",
        LLM_API_KEY: "server-key",
      },
    },
  ])("fails closed when $name", async ({ environment }) => {
    const fetch = vi.fn<FetchLike>(async () => successfulResponse());
    const provider = createOpenAIResponsesProviderFromEnv(environment, {
      fetch,
    });

    await expect(
      providerError(provider.generateStructured(request())),
    ).resolves.toMatchObject({
      kind: "feature_disabled",
      retryable: false,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("ignores every configured credential in the public profile", async () => {
    const serverKey = "public-server-key-must-be-ignored";
    const requestKey = "public-request-key-must-be-ignored";
    const fetch = vi.fn<FetchLike>(async () => successfulResponse());
    const provider = createOpenAIResponsesProviderFromEnv(
      {
        APP_PROFILE: "public_demo",
        ENABLE_SERVER_LLM_KEY: "true",
        LLM_API_KEY: serverKey,
        ENABLE_OPENAI_BYOK: "true",
      },
      { fetch },
    );

    const serverError = await providerError(
      provider.generateStructured(request()),
    );
    const requestError = await providerError(
      provider.generateStructured(request({ apiKey: requestKey })),
    );
    const serialized = `${String(serverError)} ${serverError.stack ?? ""} ${String(requestError)} ${requestError.stack ?? ""}`;

    expect(serverError.kind).toBe("feature_disabled");
    expect(requestError.kind).toBe("feature_disabled");
    expect(fetch).not.toHaveBeenCalled();
    expect(serialized).not.toContain(serverKey);
    expect(serialized).not.toContain(requestKey);
  });

  it("allows a request-scoped key only behind the exact self-hosted gate", async () => {
    const fetch = vi.fn<FetchLike>(async () => successfulResponse());
    const enabled = createOpenAIResponsesProviderFromEnv(
      {
        APP_PROFILE: "self_hosted",
        ENABLE_OPENAI_BYOK: "true",
      },
      { fetch },
    );

    await expect(
      enabled.generateStructured(request({ apiKey: "request-key" })),
    ).resolves.toEqual({
      answer: "done",
    });
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0][1]?.headers).toMatchObject({
      Authorization: "Bearer request-key",
    });

    for (const gate of [undefined, "false", "TRUE"]) {
      const blockedFetch = vi.fn<FetchLike>(async () =>
        successfulResponse(),
      );
      const blocked = createOpenAIResponsesProviderFromEnv(
        {
          APP_PROFILE: "self_hosted",
          ENABLE_OPENAI_BYOK: gate,
        },
        { fetch: blockedFetch },
      );

      await expect(
        providerError(
          blocked.generateStructured(request({ apiKey: "request-key" })),
        ),
      ).resolves.toMatchObject({
        kind: "feature_disabled",
        retryable: false,
      });
      expect(blockedFetch).not.toHaveBeenCalled();
    }
  });

  it("does not recognize the legacy OpenAI server credential pair", async () => {
    const fetch = vi.fn<FetchLike>(async () => successfulResponse());
    const provider = createOpenAIResponsesProviderFromEnv(
      {
        APP_PROFILE: "self_hosted",
        ENABLE_OPENAI_API: "true",
        OPENAI_API_KEY: "legacy-server-key",
      },
      { fetch },
    );

    await expect(
      providerError(provider.generateStructured(request())),
    ).resolves.toMatchObject({
      kind: "feature_disabled",
      retryable: false,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects oversized input before making a request", async () => {
    const fetch = vi.fn<FetchLike>(async () => successfulResponse());
    const provider = providerWithFetch(fetch, { maxInputChars: 4 });

    const error = await providerError(
      provider.generateStructured(request({ input: "12345" })),
    );

    expect(error.kind).toBe("feature_disabled");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("maps refusals and incomplete responses to invalid_output", async () => {
    const refusalFetch = vi.fn<FetchLike>(async () =>
      Response.json({
        status: "completed",
        output: [
          {
            type: "message",
            content: [
              {
                type: "refusal",
                refusal: "sensitive refusal body",
              },
            ],
          },
        ],
      }),
    );
    const incompleteFetch = vi.fn<FetchLike>(async () =>
      Response.json({
        status: "incomplete",
        incomplete_details: {
          reason: "max_output_tokens",
        },
        output: [],
      }),
    );

    await expect(
      providerError(
        providerWithFetch(refusalFetch).generateStructured(request()),
      ),
    ).resolves.toMatchObject({
      kind: "invalid_output",
      message: "OpenAI returned an invalid structured response.",
    });
    await expect(
      providerError(
        providerWithFetch(incompleteFetch).generateStructured(request()),
      ),
    ).resolves.toMatchObject({
      kind: "invalid_output",
    });
  });

  it.each([
    {
      name: "missing text",
      response: () =>
        Response.json({
          status: "completed",
          output: [{ type: "reasoning" }],
        }),
    },
    {
      name: "invalid JSON",
      response: () =>
        Response.json({
          status: "completed",
          output: [
            {
              type: "message",
              content: [{ type: "output_text", text: "not-json" }],
            },
          ],
        }),
    },
    {
      name: "schema-invalid JSON",
      response: () => successfulResponse({ answer: 42 }),
    },
  ])("rejects $name as invalid_output", async ({ response }) => {
    const fetch = vi.fn<FetchLike>(async () => response());

    const error = await providerError(
      providerWithFetch(fetch).generateStructured(request()),
    );

    expect(error.kind).toBe("invalid_output");
  });

  it("maps authentication failures without exposing an upstream body", async () => {
    const fetch = vi.fn<FetchLike>(async () =>
      Response.json(
        {
          error: {
            message: "upstream included secret-key",
          },
        },
        { status: 401 },
      ),
    );

    const error = await providerError(
      providerWithFetch(fetch).generateStructured(request()),
    );

    expect(error).toMatchObject({
      kind: "authentication",
      retryable: false,
      message: "OpenAI authentication failed.",
    });
    expect(String(error)).not.toContain("secret-key");
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("treats permanent 4xx request failures as non-retryable", async () => {
    const fetch = vi.fn<FetchLike>(async () =>
      Response.json(
        {
          error: {
            message: "unsupported private configuration detail",
          },
        },
        { status: 400 },
      ),
    );

    const error = await providerError(
      providerWithFetch(fetch).generateStructured(request()),
    );

    expect(error).toMatchObject({
      kind: "invalid_request",
      retryable: false,
      message: "OpenAI rejected the configured request.",
    });
    expect(String(error)).not.toContain("private configuration detail");
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("retries a rate limit once, then returns a typed rate_limit error", async () => {
    const fetch = vi.fn<FetchLike>(async () =>
      Response.json({ error: { message: "retry" } }, { status: 429 }),
    );

    const error = await providerError(
      providerWithFetch(fetch).generateStructured(request()),
    );

    expect(error).toMatchObject({
      kind: "rate_limit",
      retryable: true,
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("retries one 5xx response and can return the successful retry", async () => {
    const fetch = vi
      .fn<FetchLike>()
      .mockResolvedValueOnce(
        Response.json({ error: { message: "temporary" } }, { status: 503 }),
      )
      .mockResolvedValueOnce(successfulResponse());

    await expect(
      providerWithFetch(fetch).generateStructured(request()),
    ).resolves.toEqual({
      answer: "done",
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("aborts a hanging request at the configured timeout", async () => {
    const fetch = vi.fn<FetchLike>(
      async (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(init.signal?.reason),
            { once: true },
          );
        }),
    );
    const provider = providerWithFetch(fetch, { timeoutMs: 10 });

    const error = await providerError(
      provider.generateStructured(request()),
    );

    expect(error).toMatchObject({
      kind: "timeout",
      retryable: true,
    });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("propagates caller cancellation without wrapping or retrying it", async () => {
    const controller = new AbortController();
    const reason = new DOMException("caller cancelled", "AbortError");
    const fetch = vi.fn<FetchLike>(
      async (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(init.signal?.reason),
            { once: true },
          );
        }),
    );
    const result = providerWithFetch(fetch).generateStructured(
      request({ signal: controller.signal }),
    );

    controller.abort(reason);

    await expect(result).rejects.toBe(reason);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("redacts keys, prompts, input, and upstream errors from failures", async () => {
    const apiKey = "sk-request-super-secret";
    const systemPrompt = "private-system-prompt";
    const userPrompt = "private-user-prompt";
    const input = "private-submitted-data";
    const fetch = vi.fn<FetchLike>(async () => {
      throw new Error(`${apiKey} ${systemPrompt} ${userPrompt} ${input}`);
    });

    const error = await providerError(
      providerWithFetch(fetch, {
        requestScopedEnabled: true,
      }).generateStructured(
        request({
          apiKey,
          systemPrompt,
          userPrompt,
          input,
        }),
      ),
    );
    const serialized = `${String(error)} ${error.stack ?? ""} ${JSON.stringify(error)}`;

    expect(error).toMatchObject({
      kind: "upstream",
      message: "OpenAI request failed.",
    });
    expect(serialized).not.toContain(apiKey);
    expect(serialized).not.toContain(systemPrompt);
    expect(serialized).not.toContain(userPrompt);
    expect(serialized).not.toContain(input);
  });
});
