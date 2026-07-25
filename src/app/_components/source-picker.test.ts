import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SourcePicker } from "./source-picker";
import { PUBLIC_RUNTIME, type RuntimeContext } from "@/app/_lib/capabilities";
import { evaluateCapabilities } from "@/server/capabilities/evaluate";

function markup(runtime: RuntimeContext): string {
  return renderToStaticMarkup(
    createElement(SourcePicker, {
      runtime,
      onAnalyzeYoutube: () => undefined,
      onImport: () => undefined,
      onDemo: () => undefined,
    }),
  );
}

describe("SourcePicker request-scoped credentials", () => {
  it("does not render a credential field in the public demo", () => {
    const html = markup(PUBLIC_RUNTIME);

    expect(html).not.toContain("Request-scoped OpenAI API key");
    expect(html).not.toContain('type="password"');
  });

  it("renders an ephemeral password field only when self-hosted BYOK is allowed", () => {
    const capabilities = evaluateCapabilities({
      APP_PROFILE: "self_hosted",
      APP_INSTALLATION: "private",
      ENABLE_OPENAI_BYOK: "true",
    });
    const html = markup({
      profile: capabilities.profile,
      capabilities,
    });

    expect(html).toContain("Request-scoped OpenAI API key");
    expect(html).toContain('type="password"');
    expect(html).toContain("never saved, cached, logged, returned");
  });
});
