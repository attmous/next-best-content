import type { ApiErrorResponse } from "@/contracts";
import type { NextResponse } from "next/server";
import type { ZodType } from "zod";

import { validationErrorResponse } from "./response";

export type JsonRequestResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      response: NextResponse<ApiErrorResponse>;
    };

export async function parseJsonRequest<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<JsonRequestResult<T>> {
  let input: unknown;

  try {
    input = await request.json();
  } catch {
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

  const result = await schema.safeParseAsync(input);

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
