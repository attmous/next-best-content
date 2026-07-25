import { notImplementedResponse } from "@/server/api/not-implemented";

export const runtime = "nodejs";
export const maxDuration = 60;

export function POST() {
  return notImplementedResponse("Generate");
}
