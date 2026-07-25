import { describe, expect, it } from "vitest";

import {
  GITHUB_SETUP_URL,
  LANDING_CTA_PRIMARY,
  LANDING_CTA_SECONDARY,
  LANDING_HEADLINE,
  TRUST_POINTS,
} from "./landing";

describe("landing content", () => {
  it("leads with the interactive demo", () => {
    expect(LANDING_CTA_PRIMARY).toBe("Try the interactive demo");
  });

  it("offers the private self-hosted path", () => {
    expect(LANDING_CTA_SECONDARY).toBe("Run privately with your own key");
    expect(GITHUB_SETUP_URL).toContain(
      "github.com/attmous/next-best-content",
    );
  });

  it("uses the outcome-driven headline", () => {
    expect(LANDING_HEADLINE).toBe(
      "From audience signals to publish-ready content.",
    );
  });

  it("covers all four trust commitments honestly", () => {
    expect(TRUST_POINTS).toHaveLength(4);
    const combined = TRUST_POINTS.map(
      (point) => `${point.title} ${point.detail}`,
    )
      .join(" ")
      .toLowerCase();
    expect(combined).toContain("synthetic");
    expect(combined).toContain("no account");
    expect(combined).toContain("published");
    expect(combined).toMatch(/request-scoped keys are never stored/);
  });

  it("never promises reach, virality, or automatic publishing", () => {
    const combined = JSON.stringify(TRUST_POINTS).toLowerCase();
    expect(combined).not.toMatch(/viral|guarantee|auto-?publish(es|ing)? for you/);
  });
});
