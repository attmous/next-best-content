import { jsonResponse } from "@/server/api/response";
import { evaluateCapabilities } from "@/server/capabilities/evaluate";

export const runtime = "nodejs";

export function GET() {
  return jsonResponse(evaluateCapabilities());
}
