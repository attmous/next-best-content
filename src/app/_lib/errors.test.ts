import { describe, expect, it } from "vitest";

import { toUiError } from "./errors";

describe("error alternatives", () => {
  it("does not assume import can bypass an unavailable shared capability", () => {
    expect(toUiError("FEATURE_DISABLED").offerImport).toBe(false);
  });

  it("does not offer import when an optional integration is absent", () => {
    expect(toUiError("NOT_IMPLEMENTED").offerImport).toBe(false);
  });

  it("explains both request-scoped and server-managed credential failures", () => {
    const error = toUiError("MODEL_AUTHENTICATION_FAILED");

    expect(error.description).toContain("request-scoped API key");
    expect(error.description).toContain("server-managed credential");
  });
});
