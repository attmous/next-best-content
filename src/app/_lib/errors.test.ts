import { describe, expect, it } from "vitest";

import { toUiError } from "./errors";

describe("error alternatives", () => {
  it("offers import when it can bypass a disabled YouTube integration", () => {
    expect(toUiError("FEATURE_DISABLED").offerImport).toBe(true);
  });

  it("does not offer import when the shared analysis backend is absent", () => {
    expect(toUiError("NOT_IMPLEMENTED").offerImport).toBe(false);
  });
});
