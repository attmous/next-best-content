import { apiErrorResponse } from "./response";

function requestMediaType(request: Request): string | undefined {
  return request.headers
    .get("Content-Type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
}

export function validateMutationRequest(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  const submittedOrigin = request.headers.get("Origin");
  const fetchSite = request.headers
    .get("Sec-Fetch-Site")
    ?.trim()
    .toLowerCase();

  if (
    fetchSite === "cross-site" ||
    (submittedOrigin !== null && submittedOrigin !== requestOrigin)
  ) {
    return apiErrorResponse({
      code: "FEATURE_DISABLED",
      message: "Cross-site requests are disabled.",
      retryable: false,
      status: 403,
    });
  }

  if (requestMediaType(request) !== "application/json") {
    return apiErrorResponse({
      code: "VALIDATION_ERROR",
      message: "Content-Type must be application/json.",
      retryable: false,
      status: 415,
    });
  }

  return undefined;
}
