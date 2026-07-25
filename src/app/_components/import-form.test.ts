import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  ImportForm,
  toImportAnalyzeSource,
  type ImportSubmission,
} from "./import-form";

const comments = [
  {
    author: "Audience member",
    text: "Could you show the complete setup?",
    likeCount: 4,
  },
];

function submission(
  platform: ImportSubmission["platform"],
): ImportSubmission {
  return {
    comments,
    platform,
    rightsConfirmed: true,
    sourceUrl: "https://example.com/original",
  };
}

describe("toImportAnalyzeSource", () => {
  it.each([
    ["youtube", "youtube"],
    ["linkedin", "linkedin"],
    ["x", "other"],
    ["facebook", "other"],
    ["other", "other"],
  ] as const)("maps the %s UI tag to contract platform %s", (tag, expected) => {
    expect(toImportAnalyzeSource(submission(tag))).toEqual({
      type: "import",
      platform: expected,
      rightsConfirmed: true,
      comments,
    });
  });
});

describe("ImportForm rights confirmation", () => {
  it("renders an initially unchecked, required, explicitly labelled control", () => {
    const markup = renderToStaticMarkup(
      createElement(ImportForm, {
        onSubmit: () => undefined,
        submitting: false,
      }),
    );
    const checkboxId = markup.match(
      /<input id="([^"]+)" type="checkbox"/,
    )?.[1];

    expect(checkboxId).toBeTruthy();
    expect(markup).toContain(`for="${checkboxId}"`);
    expect(markup).toContain('type="checkbox" required=""');
    expect(markup).not.toContain('type="checkbox" required="" checked=""');
    expect(markup).toContain(
      "I confirm that I have the right to use these comments for analysis.",
    );
  });
});
