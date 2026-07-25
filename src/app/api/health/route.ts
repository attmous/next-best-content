import { jsonResponse } from "@/server/api/response";
import {
  resolveApplicationRuntime,
  type RuntimeEnvironment,
} from "@/server/runtime/application-profile";

export const runtime = "nodejs";

interface HealthEnvironment extends RuntimeEnvironment {
  readonly NODE_ENV?: string;
}

export function createHealthHandler(
  environment: HealthEnvironment = process.env,
) {
  return function healthRoute() {
    const applicationRuntime =
      resolveApplicationRuntime(environment);
    const configurationReady =
      applicationRuntime.profileConfigured &&
      applicationRuntime.installationConfigured;

    if (
      environment.NODE_ENV === "production" &&
      !configurationReady
    ) {
      return jsonResponse(
        { status: "unavailable" as const },
        { status: 503 },
      );
    }

    return jsonResponse({ status: "ok" as const });
  };
}

export const GET = createHealthHandler();
