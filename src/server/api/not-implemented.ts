import { randomUUID } from "node:crypto";

import type { ApiErrorResponse } from "@/contracts";
import { NextResponse } from "next/server";

export function notImplementedResponse(
  operation: string,
): NextResponse<ApiErrorResponse> {
  const body = {
    error: {
      code: "NOT_IMPLEMENTED",
      message: `${operation} is not implemented yet.`,
      retryable: false,
      requestId: randomUUID(),
    },
  } satisfies ApiErrorResponse;

  return NextResponse.json(body, {
    status: 501,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
