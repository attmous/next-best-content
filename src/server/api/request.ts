import type { ApiErrorResponse } from "@/contracts";
import type { NextResponse } from "next/server";
import type { ZodType } from "zod";

import {
  apiErrorResponse,
  internalErrorResponse,
  validationErrorResponse,
} from "./response";

export const MAX_JSON_REQUEST_BYTES = 2 * 1024 * 1024;

class RequestBodyTooLargeError extends Error {
  constructor() {
    super("Request body exceeds the configured limit.");
    this.name = "RequestBodyTooLargeError";
  }
}

export type JsonRequestResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      response: NextResponse<ApiErrorResponse>;
    };

function declaredBodySize(request: Request): number | undefined {
  const contentLength = request.headers.get("Content-Length");
  if (contentLength === null || !/^\d+$/.test(contentLength)) {
    return undefined;
  }

  const parsed = Number(contentLength);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

async function readBoundedBody(request: Request): Promise<string> {
  const declaredSize = declaredBodySize(request);
  if (
    declaredSize !== undefined &&
    declaredSize > MAX_JSON_REQUEST_BYTES
  ) {
    throw new RequestBodyTooLargeError();
  }

  if (request.body === null) {
    return "";
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let byteCount = 0;
  let body = "";

  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) {
        break;
      }

      byteCount += chunk.value.byteLength;
      if (byteCount > MAX_JSON_REQUEST_BYTES) {
        await reader.cancel();
        throw new RequestBodyTooLargeError();
      }

      body += decoder.decode(chunk.value, { stream: true });
    }

    body += decoder.decode();
    return body;
  } finally {
    reader.releaseLock();
  }
}

export async function parseJsonRequest<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<JsonRequestResult<T>> {
  let input: unknown;

  try {
    input = JSON.parse(await readBoundedBody(request));
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return {
        ok: false,
        response: apiErrorResponse({
          code: "VALIDATION_ERROR",
          message: "Request body is too large.",
          retryable: false,
          status: 413,
        }),
      };
    }

    return {
      ok: false,
      response: validationErrorResponse([
        {
          path: [],
          code: "invalid_json",
          message: "Request body must contain valid JSON.",
        },
      ]),
    };
  }

  let result;
  try {
    result = await schema.safeParseAsync(input);
  } catch {
    return {
      ok: false,
      response: internalErrorResponse(),
    };
  }

  if (!result.success) {
    return {
      ok: false,
      response: validationErrorResponse(result.error.issues),
    };
  }

  return {
    ok: true,
    data: result.data,
  };
}
