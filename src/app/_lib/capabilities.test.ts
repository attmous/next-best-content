import { describe, expect, it } from "vitest";

import {
  PUBLIC_RUNTIME,
  deriveProfile,
  sourceOptionState,
  type Capabilities,
  type RuntimeContext,
} from "./capabilities";
import { SOURCE_OPTIONS } from "./platforms";

function option(id: string) {
  const found = SOURCE_OPTIONS.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`unknown option ${id}`);
  return found;
}

function selfHosted(availability: Capabilities["availability"]): RuntimeContext {
  return { profile: "self_hosted", capabilities: { availability } };
}

describe("deriveProfile", () => {
  it("defaults to the public demo when no capabilities are readable", () => {
    expect(deriveProfile(null)).toBe("public_demo");
    expect(deriveProfile({})).toBe("public_demo");
  });

  it("stays public when the backend affirms nothing", () => {
    expect(
      deriveProfile({
        availability: {
          openai: { available: false, reason: "configuration_missing" },
          import: { available: false },
          youtubeLive: { available: false },
        },
      }),
    ).toBe("public_demo");
  });

  it("recognizes a self-hosted install from any affirmed capability", () => {
    expect(
      deriveProfile({ availability: { openai: { available: true } } }),
    ).toBe("self_hosted");
    expect(
      deriveProfile({ availability: { import: { available: true } } }),
    ).toBe("self_hosted");
    expect(
      deriveProfile({ availability: { youtubeLive: { available: true } } }),
    ).toBe("self_hosted");
  });

  it("tolerates unknown fields from newer backends", () => {
    expect(
      deriveProfile({
        availability: { import: { available: true } },
      }),
    ).toBe("self_hosted");
  });
});

describe("sourceOptionState", () => {
  it("keeps the synthetic demo interactive in every profile", () => {
    expect(sourceOptionState(option("demo"), PUBLIC_RUNTIME).interactive).toBe(
      true,
    );
    expect(
      sourceOptionState(option("demo"), selfHosted({})).interactive,
    ).toBe(true);
  });

  it("public profile: external sources are informational and cannot call APIs", () => {
    for (const id of ["youtube-live", "import"] as const) {
      const state = sourceOptionState(option(id), PUBLIC_RUNTIME);
      expect(state.interactive).toBe(false);
      expect(state.reason).toMatch(/hosted demo/i);
    }
  });

  it("public profile: never exposes a credential path", () => {
    const state = sourceOptionState(option("youtube-live"), PUBLIC_RUNTIME);
    expect(state.reason).toMatch(/own key/i);
    expect(state.reason).not.toMatch(/enter|paste your key/i);
  });

  it("self-hosted: options follow the backend capability response", () => {
    const enabled = selfHosted({
      import: { available: true },
      youtubeLive: { available: false, reason: "configuration_missing" },
    });
    expect(sourceOptionState(option("import"), enabled).interactive).toBe(true);
    const youtube = sourceOptionState(option("youtube-live"), enabled);
    expect(youtube.interactive).toBe(false);
    expect(youtube.reason).toMatch(/container environment/i);
  });

  it("LinkedIn direct reads stay unavailable in every profile", () => {
    const fullyEnabled = selfHosted({
      import: { available: true },
      youtubeLive: { available: true },
      linkedinDirectRead: { available: true },
    });
    expect(
      sourceOptionState(option("linkedin-live"), fullyEnabled).interactive,
    ).toBe(false);
    expect(
      sourceOptionState(option("linkedin-live"), PUBLIC_RUNTIME).interactive,
    ).toBe(false);
  });
});
