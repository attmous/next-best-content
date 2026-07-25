import {
  PreflightResponseSchema,
  type PreflightCheck,
  type PreflightDraftContentPack,
  type PreflightResponse,
} from "@/contracts";

const MAX_SCENE_BODY_LENGTH = 160;
const MAX_HOOK_LENGTH = 160;
const MIN_HOOK_LENGTH = 20;
const MAX_CTA_LENGTH = 80;
const SHORT_MIN_SECONDS = 30;
const SHORT_MAX_SECONDS = 45;

const RISKY_CLAIM_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /guarantee/i, label: "guarantee" },
  { pattern: /go viral/i, label: "go viral" },
  { pattern: /get rich/i, label: "get rich" },
  { pattern: /overnight success/i, label: "overnight success" },
  { pattern: /hack the algorithm/i, label: "hack the algorithm" },
  { pattern: /100% (success|works)/i, label: "100% success" },
  { pattern: /miracle/i, label: "miracle" },
];

function makeCheck(
  name: PreflightCheck["name"],
  score: number,
  status: PreflightCheck["status"],
  explanation: string,
  suggestedFix?: string,
): PreflightCheck {
  return { name, score, status, explanation, suggestedFix };
}

function fullText(pack: PreflightDraftContentPack): string {
  return [
    pack.title,
    pack.hook,
    pack.caption,
    pack.cta,
    ...pack.scenes.flatMap((scene) => [
      scene.headline,
      scene.body,
      scene.voiceover,
    ]),
  ]
    .join(" ")
    .toLowerCase();
}

function checkHook(pack: PreflightDraftContentPack): PreflightCheck {
  const length = pack.hook.trim().length;

  if (length === 0) {
    return makeCheck(
      "hook",
      10,
      "fail",
      "The pack has no hook. Without an opening line there is nothing to stop the scroll.",
      "Write one sentence that names the audience signal this content answers.",
    );
  }
  if (length < MIN_HOOK_LENGTH) {
    return makeCheck(
      "hook",
      55,
      "warning",
      `The hook is only ${length} characters — too thin to set up the promise.`,
      "Expand the hook to a full sentence that states what the viewer gets.",
    );
  }
  if (length > MAX_HOOK_LENGTH) {
    return makeCheck(
      "hook",
      62,
      "warning",
      `The hook is ${length} characters. Hooks have to land in the first two seconds.`,
      `Tighten the hook under ${MAX_HOOK_LENGTH} characters.`,
    );
  }
  return makeCheck(
    "hook",
    91,
    "pass",
    `The hook is ${length} characters, states a clear promise, and fits the opening beat.`,
  );
}

function checkAudienceFit(
  pack: PreflightDraftContentPack,
): PreflightCheck {
  const signal = pack.sourceSignal;

  if (!signal) {
    return makeCheck(
      "audience_fit",
      50,
      "warning",
      "The draft isn't linked to an audience signal, so fit can't be measured.",
      "Generate the pack from one of the analyzed signals to keep the evidence trail.",
    );
  }

  const keywords = Array.from(
    new Set(
      `${signal.title} ${signal.summary}`
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((word) => word.length >= 5),
    ),
  );
  const corpus = fullText(pack);
  const matched = keywords.filter((word) => corpus.includes(word));

  if (matched.length >= 5) {
    return makeCheck(
      "audience_fit",
      Math.min(95, 78 + matched.length),
      "pass",
      `The draft stays on the signal's language: ${matched.length} of ${keywords.length} signal terms appear in the content (e.g. "${matched.slice(0, 3).join('", "')}").`,
    );
  }
  if (matched.length >= 2) {
    return makeCheck(
      "audience_fit",
      60,
      "warning",
      `Only ${matched.length} of ${keywords.length} signal terms survive in the draft — the content is drifting from what the audience asked for.`,
      `Work the signal's own words back into the hook and scenes: "${signal.title}".`,
    );
  }
  return makeCheck(
    "audience_fit",
    30,
    "fail",
    "The draft no longer shares vocabulary with the audience signal it was generated from.",
    `Re-anchor the content on the original signal: "${signal.title}".`,
  );
}

function checkEvidence(pack: PreflightDraftContentPack): PreflightCheck {
  const count = pack.sourceEvidence?.length ?? 0;

  if (count === 0) {
    return makeCheck(
      "evidence",
      15,
      "fail",
      "No audience evidence is attached to this draft, so the recommendation can't be traced back to real comments.",
      "Regenerate the pack from an analyzed signal so its supporting comments travel with it.",
    );
  }
  if (count < 3) {
    return makeCheck(
      "evidence",
      60,
      "warning",
      `Only ${count} supporting ${count === 1 ? "comment is" : "comments are"} attached — a thin base for the claim.`,
      "Prefer signals with at least three supporting comments.",
    );
  }
  return makeCheck(
    "evidence",
    Math.min(95, 80 + count * 4),
    "pass",
    `The draft carries ${count} supporting audience comments, so every claim traces back to something a viewer actually said.`,
  );
}

function checkClarity(pack: PreflightDraftContentPack): PreflightCheck {
  const emptyScenes = pack.scenes
    .filter(
      (scene) =>
        scene.headline.trim().length === 0 || scene.body.trim().length === 0,
    )
    .map((scene) => scene.index + 1);

  if (emptyScenes.length > 0) {
    return makeCheck(
      "clarity",
      30,
      "fail",
      `Scene${emptyScenes.length === 1 ? "" : "s"} ${emptyScenes.join(", ")} ${emptyScenes.length === 1 ? "is" : "are"} missing a headline or body, leaving a hole in the storyline.`,
      "Fill in the empty scene copy in the studio before publishing.",
    );
  }

  const longScenes = pack.scenes
    .filter((scene) => scene.body.trim().length > MAX_SCENE_BODY_LENGTH)
    .map((scene) => scene.index + 1);

  if (longScenes.length > 0) {
    return makeCheck(
      "clarity",
      64,
      "warning",
      `Scene${longScenes.length === 1 ? "" : "s"} ${longScenes.join(", ")} ${longScenes.length === 1 ? "runs" : "run"} past ${MAX_SCENE_BODY_LENGTH} characters of on-screen text — hard to read at watch speed.`,
      `Trim the body copy of scene ${longScenes.join(" and ")} under ${MAX_SCENE_BODY_LENGTH} characters in the studio.`,
    );
  }

  return makeCheck(
    "clarity",
    90,
    "pass",
    "Every scene has a headline and body, and all on-screen copy is short enough to read at watch speed.",
  );
}

function checkFormat(pack: PreflightDraftContentPack): PreflightCheck {
  if (pack.scenes.length !== 6) {
    return makeCheck(
      "format",
      20,
      "fail",
      `The pack has ${pack.scenes.length} scenes; the ${pack.format === "short" ? "Short" : "carousel"} format requires exactly six.`,
      "Regenerate the pack to restore the six-scene structure.",
    );
  }

  if (pack.format === "short") {
    const total = pack.scenes.reduce(
      (sum, scene) => sum + scene.durationSeconds,
      0,
    );
    if (total < SHORT_MIN_SECONDS || total > SHORT_MAX_SECONDS) {
      return makeCheck(
        "format",
        55,
        "warning",
        `The six scenes total ${Math.round(total)}s; Shorts work best between ${SHORT_MIN_SECONDS} and ${SHORT_MAX_SECONDS} seconds.`,
        "Rebalance scene durations in the studio to land inside the target window.",
      );
    }
    return makeCheck(
      "format",
      92,
      "pass",
      `Six scenes totaling ${Math.round(total)}s — inside the ${SHORT_MIN_SECONDS}–${SHORT_MAX_SECONDS}s window Shorts need.`,
    );
  }

  const timedSlides = pack.scenes.filter(
    (scene) => scene.durationSeconds !== 0,
  );
  if (timedSlides.length > 0) {
    return makeCheck(
      "format",
      60,
      "warning",
      "Carousel slides are reader-paced, but some slides still carry video durations.",
      "Clear the leftover durations by regenerating in carousel format.",
    );
  }
  return makeCheck(
    "format",
    92,
    "pass",
    "Six reader-paced slides — exactly the structure the carousel format expects.",
  );
}

function checkCta(pack: PreflightDraftContentPack): PreflightCheck {
  const length = pack.cta.trim().length;

  if (length === 0) {
    return makeCheck(
      "cta",
      15,
      "fail",
      "The pack has no call to action, so viewers get no next step.",
      "Add one concrete ask — save, comment, or watch the full video.",
    );
  }
  if (length > MAX_CTA_LENGTH) {
    return makeCheck(
      "cta",
      62,
      "warning",
      `The call to action is ${length} characters — long enough to blur the ask.`,
      `Cut the CTA to a single ask under ${MAX_CTA_LENGTH} characters.`,
    );
  }
  return makeCheck(
    "cta",
    90,
    "pass",
    "The pack ends on one concrete, plainly worded ask.",
  );
}

function checkBrandSafety(
  pack: PreflightDraftContentPack,
): PreflightCheck {
  const corpus = fullText(pack);
  const hits = RISKY_CLAIM_PATTERNS.filter(({ pattern }) =>
    pattern.test(corpus),
  ).map(({ label }) => label);

  if (hits.length > 0) {
    return makeCheck(
      "brand_safety",
      25,
      "fail",
      `The copy makes promises it can't keep: ${hits.map((hit) => `"${hit}"`).join(", ")}.`,
      "Remove performance promises — let the audience evidence carry the claim instead.",
    );
  }
  return makeCheck(
    "brand_safety",
    96,
    "pass",
    "No overclaiming, no performance promises, no flagged phrases.",
  );
}

export function evaluatePreflight(
  pack: PreflightDraftContentPack,
): PreflightResponse {
  const checks: PreflightCheck[] = [
    checkHook(pack),
    checkAudienceFit(pack),
    checkEvidence(pack),
    checkClarity(pack),
    checkFormat(pack),
    checkCta(pack),
    checkBrandSafety(pack),
  ];

  const overallScore = Math.round(
    checks.reduce((sum, item) => sum + item.score, 0) / checks.length,
  );

  const failed = checks.filter((item) => item.status === "fail");
  const warned = checks.filter((item) => item.status === "warning");

  const verdict =
    failed.length > 0
      ? "blocked"
      : warned.length > 0
        ? "needs_changes"
        : "ready";

  return PreflightResponseSchema.parse({
    overallScore,
    verdict,
    checks,
    blockingIssues: failed.map((item) => item.explanation),
  });
}
