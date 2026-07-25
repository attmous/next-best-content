import { apiErrorResponse } from "./response";

export function profileDisabledResponse() {
  return apiErrorResponse({
    code: "FEATURE_DISABLED",
    message:
      "This operation is unavailable in the active application profile.",
    retryable: false,
    status: 503,
  });
}
