import {
  PreflightRequestSchema,
  PreflightResponseSchema,
} from "@/contracts";
import { parseJsonRequest } from "@/server/api/request";
import {
  internalErrorResponse,
  jsonResponse,
} from "@/server/api/response";
import { evaluatePreflight } from "@/server/preflight/evaluate";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const parsedRequest = await parseJsonRequest(
      request,
      PreflightRequestSchema,
    );

    if (!parsedRequest.ok) {
      return parsedRequest.response;
    }

    const result = PreflightResponseSchema.parse(
      evaluatePreflight(parsedRequest.data.contentPack),
    );

    return jsonResponse(result);
  } catch {
    return internalErrorResponse();
  }
}
