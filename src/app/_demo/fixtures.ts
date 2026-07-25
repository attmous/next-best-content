/**
 * Synthetic demo fixtures for NextBestContent.
 *
 * Everything in this file is fictional. The video metadata points at Adam
 * Vagovic's channel (ChaosAdam13) as the agreed demo entry point, but every
 * comment, author handle, signal, and generated scene is invented for the
 * demo and is labeled as synthetic through the `demo` provenance the UI
 * surfaces on every screen. No real YouTube comments are included.
 */
import {
  AnalyzeResponseSchema,
  ContentPackSchema,
  type AnalyzeResponse,
  type ContentFormat,
  type ContentPack,
  type Evidence,
  type Provenance,
  type Scene,
  type Signal,
  type VideoMetadata,
} from "@/contracts";

export const DEMO_FIXTURE_ID = "chaosadam13-dinner-rush-v1";

export const DEMO_VIDEO_URL = "https://www.youtube.com/watch?v=sjMHLfUwWL0";

export const DEMO_PROVENANCE: Provenance = {
  source: "demo",
  evidence: "synthetic",
  fixtureId: DEMO_FIXTURE_ID,
};

const demoVideo: VideoMetadata = {
  id: "sjMHLfUwWL0",
  title: "I Cooked a 3-Course Dinner in 30 Minutes (Total Chaos)",
  channelTitle: "ChaosAdam13",
  // Deliberately non-resolving: the demo is fully synthetic, so the UI
  // renders a labeled placeholder instead of fetching any real thumbnail.
  thumbnailUrl: "https://demo.invalid/fixtures/chaosadam13-dinner-rush.jpg",
  commentCount: 482,
};

const requestEvidence: Evidence[] = [
  {
    author: "maren.cooks",
    text: "PLEASE make a version of this for people who can't dice an onion in ten seconds. I want to cook this menu, just at normal human speed.",
    likeCount: 212,
  },
  {
    author: "kitchen_flop_era",
    text: "I tried this and my sauce broke twice. Can you do a beginner walkthrough with the exact order of steps?",
    likeCount: 148,
  },
  {
    author: "dev_by_day_chef_by_night",
    text: "Genuine request: same three courses, but you explain what to prep before the clock starts.",
    likeCount: 96,
  },
];

const questionEvidence: Evidence[] = [
  {
    author: "sear_seeker",
    text: "What pan is that?? Mine would have smoked out the whole kitchen at that heat.",
    likeCount: 173,
  },
  {
    author: "tam_makes_dinner",
    text: "You never say what heat the sauce simmers at and mine reduced to glue. Please answer this one!",
    likeCount: 121,
  },
  {
    author: "quiet.kitchen",
    text: "Third video where I'm asking: induction or gas? It changes every single timing in this recipe.",
    likeCount: 88,
  },
];

const reactionEvidence: Evidence[] = [
  {
    author: "flavor_gremlin",
    text: "The way you SAVED that sauce after the smoke alarm went off is the most useful forty seconds on cooking YouTube.",
    likeCount: 341,
  },
  {
    author: "midnight_meal_prep",
    text: "Not the recipe — the RECOVERY. More of you fixing disasters in real time, please.",
    likeCount: 205,
  },
  {
    author: "aprons_off",
    text: "I have burnt that exact sauce three times. Watching you fix it instead of restarting was everything.",
    likeCount: 167,
  },
];

const demoSignals: Signal[] = [
  {
    id: "sig-request-beginner-menu",
    category: "request",
    title: "Make a beginner-proof version of the 30-minute menu",
    summary:
      "The single most repeated ask in the thread: viewers loved the chaos, but they want the same three-course menu re-taught at a pace they can actually follow, with prep laid out before the clock starts.",
    opportunityScore: 86,
    scoreReasons: [
      "Asked explicitly 24 times across the comment thread",
      "Request comments collect the highest like counts after the pinned comment",
      "Directly extends the original video instead of starting a new topic",
    ],
    evidenceCount: 24,
    evidence: requestEvidence,
    recommendation: {
      workingTitle: "The 30-Minute Dinner, Slowed Down to Human Speed",
      hook: "Twenty-four of you asked for this exact video — the chaos menu, one calm step at a time.",
      suggestedFormat: "short",
      rationale:
        "A tight walkthrough Short answers the request directly and points viewers back to the full-length original. The audience already told you the format problem: speed. Slowing it down is the content.",
    },
  },
  {
    id: "sig-question-heat-setup",
    category: "unanswered_question",
    title: "What pan and heat are you actually using?",
    summary:
      "The most repeated question you never answered: viewers blame their failed attempts on not knowing your pan, burner type, and heat levels. It comes up under every cooking upload, not just this one.",
    opportunityScore: 78,
    scoreReasons: [
      "17 unanswered comments ask about equipment or heat settings",
      "Recurs across multiple uploads, so one answer keeps working",
      "Viewers explicitly connect it to their failed attempts",
    ],
    evidenceCount: 17,
    evidence: questionEvidence,
    recommendation: {
      workingTitle: "The Heat Answer: My Exact Pan and Burner Settings",
      hook: "The most-asked question in my comments, finally answered — the exact pan, burner, and heat for every step.",
      suggestedFormat: "carousel",
      rationale:
        "Settings are reference material. A carousel viewers can save and swipe through beats a video they'd have to scrub, and it becomes an evergreen answer you can link under future comments.",
    },
  },
  {
    id: "sig-reaction-sauce-save",
    category: "strong_reaction",
    title: "The burnt-sauce save set your comments on fire",
    summary:
      "The strongest emotional spike in the whole thread: the moment the sauce burned and you rescued it live. Viewers say the recovery was more valuable than the recipe and are asking for more real-time fixes.",
    opportunityScore: 82,
    scoreReasons: [
      "31 comments reference the same 40-second moment",
      "Top reaction comment out-liked every other comment on the video",
      "Viewers name the exact follow-up they want: more live recoveries",
    ],
    evidenceCount: 31,
    evidence: reactionEvidence,
    recommendation: {
      workingTitle: "Save the Sauce: Rescue a Burnt Pan in 60 Seconds",
      hook: "Your comments exploded the second the sauce burned — so here's the full rescue, step by step.",
      suggestedFormat: "short",
      rationale:
        "The audience already marked the highlight for you. Cutting the recovery into a standalone Short serves the 31 people who asked and tests a repeatable 'kitchen rescue' series format.",
    },
  },
];

export const demoAnalyzeResponse: AnalyzeResponse = AnalyzeResponseSchema.parse(
  {
    video: demoVideo,
    signals: demoSignals,
    provenance: DEMO_PROVENANCE,
  },
);

/** Scene text shared between the Short and carousel variants of a pack. */
type SceneDraft = Omit<Scene, "index" | "durationSeconds">;

interface PackDraft {
  signalId: string;
  angle: string;
  caption: string;
  cta: string;
  hashtags: string[];
  /** Per-scene durations for the Short variant. Must total 30–45 seconds. */
  shortDurations: [number, number, number, number, number, number];
  scenes: [
    SceneDraft,
    SceneDraft,
    SceneDraft,
    SceneDraft,
    SceneDraft,
    SceneDraft,
  ];
}

const packDrafts: PackDraft[] = [
  {
    signalId: "sig-request-beginner-menu",
    angle:
      "Answer the 24 beginner requests head-on: the same three-course menu, re-taught calmly with prep front-loaded, so viewers finish with dinner instead of a broken sauce.",
    caption:
      "You asked 24 times, so here it is: the 30-minute chaos menu, slowed down to human speed. Prep list first, then each course in the order that actually works. Save this for your next dinner attempt and tell me which course still fights back.",
    cta: "Save this for your next dinner attempt",
    hashtags: ["#cooking", "#beginnercook", "#30minutemeals", "#dinnerideas"],
    shortDurations: [4, 6, 7, 7, 7, 5],
    scenes: [
      {
        headline: "You asked. Here it is.",
        body: "The 30-minute chaos menu, rebuilt for beginners at human speed.",
        visualDirection:
          "Calm kitchen, no timer on screen. Three labeled prep bowls slide into frame one by one.",
        voiceover:
          "Twenty-four of you asked for this exact video. So here it is — the chaos menu, slowed all the way down.",
      },
      {
        headline: "Prep before the clock",
        body: "Dice the onion, measure the stock, butter out of the fridge. Nothing touches heat until this tray is full.",
        visualDirection:
          "Top-down shot of a sheet tray filling with prepped ingredients, each labeled with a lower-third tag.",
        voiceover:
          "Beginners lose the race in the first minute. So we don't race. Everything gets prepped onto one tray before a single burner turns on.",
      },
      {
        headline: "Course one: the salad that waits",
        body: "Dress it last, build it first. This course sits happily while you cook the rest.",
        visualDirection:
          "Hands assemble the salad in a wide bowl; dressing jar set aside with a 'wait' sticker.",
        voiceover:
          "Course one is the salad, and its secret is patience — build it now, dress it at the very end so it never wilts.",
      },
      {
        headline: "Course two: sauce without fear",
        body: "Medium-low heat, wooden spoon, and one rule: the sauce is done the moment it coats the back of the spoon. If you walk away to plate the salad or check on the dessert, it seizes into glue — so stay with the pan until it ribbons.",
        visualDirection:
          "Close-up of sauce ribboning off a wooden spoon; a gentle heat-dial graphic pinned at medium-low.",
        voiceover:
          "The sauce is where your comments say it all goes wrong. Medium-low heat, keep it moving, and stop the moment it coats the spoon.",
      },
      {
        headline: "Course three: dessert on autopilot",
        body: "It bakes while you plate everything else. Set the timer and forget it exists.",
        visualDirection:
          "Ramekins slide into the oven; cut to plating the first two courses with the oven glowing behind.",
        voiceover:
          "Dessert went into the oven before course one hit the table. It finishes itself while you plate like a professional.",
      },
      {
        headline: "Your turn",
        body: "Full menu, human speed, zero smoke alarms. Which course still fights back? Tell me below.",
        visualDirection:
          "All three finished courses on the counter; slow push-in, then end card with the channel mark.",
        voiceover:
          "That's the whole menu at human speed. Try it this week, and tell me in the comments which course still fights back.",
      },
    ],
  },
  {
    signalId: "sig-question-heat-setup",
    angle:
      "Turn the most-repeated unanswered question into a save-able reference: the exact pan, burner type, and heat level for every stage of the menu.",
    caption:
      "Finally answering the question under every video: the exact pan and heat settings I use. Swipe through, screenshot the burner map, and stop guessing why your sauce reduced to glue. Bookmark this — it applies to every recipe on the channel.",
    cta: "Screenshot the burner map and save this post",
    hashtags: ["#cookingtips", "#kitchenbasics", "#homecooking", "#cookware"],
    shortDurations: [5, 6, 7, 7, 6, 5],
    scenes: [
      {
        headline: "The most-asked question",
        body: "'What pan? What heat?' — asked 17 times under one video. Answered once, here, for good.",
        visualDirection:
          "Slide one: bold headline over a muted photo of the stovetop; small stack of quoted comment snippets.",
        voiceover:
          "Seventeen of you asked the same question under one video: what pan, and what heat. Here's the full answer.",
      },
      {
        headline: "The pan",
        body: "A 28 cm carbon-steel skillet — nothing exotic. Heavy base, flared sides, holds heat through a full sear.",
        visualDirection:
          "Clean product-style photo of the skillet on a neutral background with three callout labels.",
        voiceover:
          "The pan is a twenty-eight centimeter carbon-steel skillet. Heavy base, flared sides, nothing you can't find locally.",
      },
      {
        headline: "The burner map",
        body: "Gas hob, four rings. Big ring for searing, back-left for the sauce, simmer plate for holding. Screenshot this one.",
        visualDirection:
          "Diagram slide: top-down illustration of the hob with each ring labeled by job and heat level.",
        voiceover:
          "Here's the burner map. Big ring sears, back-left holds the sauce, and the small ring only ever simmers.",
      },
      {
        headline: "Sear settings",
        body: "High heat, two minutes of preheat, then don't touch the protein for ninety seconds. Moving it early is why it sticks.",
        visualDirection:
          "Split slide: heat dial pinned at high on the left, seared crust close-up on the right.",
        voiceover:
          "For the sear: high heat, a full two-minute preheat, and then hands off for ninety seconds. Early flipping is why it sticks.",
      },
      {
        headline: "Simmer settings",
        body: "Sauce lives at medium-low — small bubbles at the edge, never a rolling boil. Glue means the heat was too high.",
        visualDirection:
          "Macro shot of gentle edge bubbles in the sauce; heat dial graphic pinned at medium-low.",
        voiceover:
          "The sauce never boils. Medium-low, small bubbles at the edge. If yours turned to glue, the heat was too high.",
      },
      {
        headline: "Steal this setup",
        body: "Same pan, same map, every recipe on the channel. Save this post — it's the answer key.",
        visualDirection:
          "Closing slide: the full setup laid out flat-lay style with the channel mark and a save prompt.",
        voiceover:
          "That's the entire setup — same pan, same burner map, every recipe. Save this post; it's the answer key.",
      },
    ],
  },
  {
    signalId: "sig-reaction-sauce-save",
    angle:
      "Cut the moment the audience already marked as the highlight into a standalone rescue guide, and pilot a repeatable 'kitchen rescue' series.",
    caption:
      "The sauce burned, the smoke alarm went off, and the comments went wild — so here's the full rescue on its own. Six moves to bring back a burnt pan sauce without starting over. Burnt something worse? Describe the disaster below and I'll rescue it in the next one.",
    cta: "Drop your worst kitchen disaster in the comments",
    hashtags: ["#cookinghacks", "#kitchenfails", "#saucetok", "#cookingshorts"],
    shortDurations: [4, 6, 7, 7, 7, 6],
    scenes: [
      {
        headline: "The moment it burned",
        body: "Smoke alarm, black edges, dinner on the line. Thirty-one of you asked how the save worked.",
        visualDirection:
          "Replay of the burn moment with a comment-counter overlay ticking up; hard cut to silence.",
        voiceover:
          "This is the moment the comments exploded. The sauce burned on camera — and thirty-one of you asked how the save worked.",
      },
      {
        headline: "Stop. Don't stir.",
        body: "Stirring drags the burnt layer through everything good. Freeze first, assess second.",
        visualDirection:
          "Hand hovers over the pan, then pulls back. Big 'DON'T STIR' text card snaps in.",
        voiceover:
          "Rule one: do not stir. Stirring drags the burnt layer through everything that's still good.",
      },
      {
        headline: "Off the heat",
        body: "Kill the burner and move the pan to a cold zone. The burn stops the second the heat source is gone.",
        visualDirection:
          "Pan slides from the hot ring to a cold trivet; heat-dial graphic snaps to zero.",
        voiceover:
          "Kill the burner and move the pan. The burn stops the moment it leaves the heat — every second counts here.",
      },
      {
        headline: "The transfer trick",
        body: "Pour the top layer into a clean pan and leave the burnt base behind. Don't scrape — gravity does the sorting.",
        visualDirection:
          "Slow pour into a clean pan, camera low; the dark layer stays behind like sediment.",
        voiceover:
          "Now the trick: pour, don't scrape. The clean sauce comes off the top, and the burnt base stays behind.",
      },
      {
        headline: "Rebuild the flavor",
        body: "A splash of stock, a knob of butter, thirty seconds of whisking. Taste — the smoke should be gone.",
        visualDirection:
          "Butter drops into the rescued sauce; glossy whisking close-up with steam.",
        voiceover:
          "Rebuild it: a splash of stock, a knob of butter, thirty seconds of whisking. Then taste — the smoke is gone.",
      },
      {
        headline: "Served, not restarted",
        body: "Same sauce, saved in about a minute. Burnt something worse? Tell me below — I'll rescue it next.",
        visualDirection:
          "Finished plate hits the table; end card invites disaster stories in the comments.",
        voiceover:
          "Same sauce, on the plate, saved in about a minute. Burnt something worse? Tell me below and I'll rescue it in the next one.",
      },
    ],
  },
];

function buildScenes(draft: PackDraft, format: ContentFormat): Scene[] {
  return draft.scenes.map((scene, index) => ({
    ...scene,
    index,
    durationSeconds: format === "short" ? draft.shortDurations[index] : 0,
  }));
}

/**
 * Deterministically builds the generated content pack for one signal and
 * format, exactly as the real `/api/generate` route would return it.
 */
export function buildDemoContentPack(
  signalId: string,
  format: ContentFormat,
): ContentPack {
  const draft = packDrafts.find((candidate) => candidate.signalId === signalId);
  const signal = demoSignals.find((candidate) => candidate.id === signalId);

  if (!draft || !signal) {
    throw new Error(`Unknown demo signal: ${signalId}`);
  }

  return ContentPackSchema.parse({
    id: `pack-${signalId}-${format}`,
    format,
    title: signal.recommendation.workingTitle,
    hook: signal.recommendation.hook,
    angle: draft.angle,
    scenes: buildScenes(draft, format),
    caption: draft.caption,
    cta: draft.cta,
    hashtags: draft.hashtags,
    sourceEvidence: signal.evidence,
    sourceSignal: signal,
    provenance: DEMO_PROVENANCE,
  });
}

export const DEMO_SIGNAL_IDS = demoSignals.map((signal) => signal.id);
