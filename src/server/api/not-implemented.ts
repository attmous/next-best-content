import type { ApiErrorResponse } from "@/contracts";
import type { NextResponse } from "next/server";

import { apiErrorResponse } from "./response";

export function notImplementedResponse(
  operation: string,
): NextResponse<ApiErrorResponse> {
  return apiErrorResponse({
    code: "NOT_IMPLEMENTED",
    message: `${operation} is not implemented yet.`,
    retryable: false,
    status: 501,
  });
}
