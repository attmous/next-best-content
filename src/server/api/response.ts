import { randomUUID } from "node:crypto";

import type {
  ApiErrorCode,
  ApiErrorResponse,
} from "@/contracts";
import { NextResponse } from "next/server";

const MAX_VALIDATION_DIAGNOSTICS = 20;

type JsonResponseInit = Omit<ResponseInit, "headers"> & {
  headers?: HeadersInit;
};

export interface ApiErrorResponseOptions {
  code: ApiErrorCode;
  message: string;
  retryable: boolean;
  status: number;
  details?: Record<string, unknown>;
}

export interface ValidationIssue {
  path: readonly PropertyKey[];
  code: string;
  message: string;
}

function serializablePath(path: readonly PropertyKey[]): Array<string | number> {
  return path.map((segment) =>
    typeof segment === "symbol" ? segment.toString() : segment,
  );
}

function safeValidationMessage(issue: ValidationIssue): string {
  if (issue.code === "unrecognized_keys") {
    return "Request contains unrecognized fields.";
  }

  return issue.message;
}

export function jsonResponse<T>(
  body: T,
  init: JsonResponseInit = {},
): NextResponse<T> {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store");

  return NextResponse.json(body, {
    ...init,
    headers,
  });
}

export function apiErrorResponse({
  code,
  message,
  retryable,
  status,
  details,
}: ApiErrorResponseOptions): NextResponse<ApiErrorResponse> {
  const body = {
    error: {
      code,
      message,
      retryable,
      requestId: randomUUID(),
      ...(details === undefined ? {} : { details }),
    },
  } satisfies ApiErrorResponse;

  return jsonResponse(body, { status });
}

export function validationErrorResponse(
  issues: readonly ValidationIssue[],
): NextResponse<ApiErrorResponse> {
  const diagnostics = issues
    .slice(0, MAX_VALIDATION_DIAGNOSTICS)
    .map((issue) => ({
      path: serializablePath(issue.path),
      code: issue.code,
      message: safeValidationMessage(issue),
    }));

  return apiErrorResponse({
    code: "VALIDATION_ERROR",
    message: "Request validation failed.",
    retryable: false,
    status: 400,
    details: {
      issues: diagnostics,
      issueCount: issues.length,
      truncated: issues.length > diagnostics.length,
    },
  });
}

export function internalErrorResponse(): NextResponse<ApiErrorResponse> {
  return apiErrorResponse({
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred.",
    retryable: true,
    status: 500,
  });
}
