/**
 * Synthetic demo fixtures for NextBestContent.
 *
 * Everything in this file is fictional. "Maya Makes Space" is an invented
 * creator, the balcony-garden video is an invented upload, and every comment,
 * handle, signal, and generated scene was written for this demo. The `demo`
 * provenance carried on every response keeps that visible in the UI, and the
 * accompanying illustrations in /public/demo are original synthetic artwork.
 * No real people, channels, or YouTube comments are represented.
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

export const DEMO_FIXTURE_ID = "maya-makes-space-balcony-v1";
export const DEMO_FEATURED_SIGNAL_ID = "sig-reaction-what-failed";

/** Fictional watch URL for the synthetic upload — the video id is invented. */
export const DEMO_VIDEO_URL = "https://www.youtube.com/watch?v=my2m2balcny";

export const DEMO_PROVENANCE: Provenance = {
  source: "demo",
  evidence: "synthetic",
  fixtureId: DEMO_FIXTURE_ID,
};

/** Locally shipped synthetic illustrations for the fictional case study. */
export const DEMO_ASSETS = {
  balconyBefore: {
    src: "/demo/maya-balcony-before.svg",
    alt: "Synthetic illustration of the empty 2 square meter balcony before the garden: bare floor, railing, and one unused pot.",
  },
  balconyAfter: {
    src: "/demo/maya-balcony-after.svg",
    alt: "Synthetic illustration of the balcony after the makeover: railing planters, a vertical herb rack, and tomato pots.",
  },
  planters: {
    src: "/demo/maya-planters.svg",
    alt: "Synthetic illustration of three labeled wooden planters with basil, mint, and thyme seedlings and a 93 euro price tag.",
  },
  watering: {
    src: "/demo/maya-watering.svg",
    alt: "Synthetic illustration of the sunrise watering routine: a watering can pouring over a planter beside a moisture guide.",
  },
  lesson: {
    src: "/demo/maya-lesson.svg",
    alt: "Synthetic illustration of the honest failure: a bolted spinach pot with drooping leaves next to a week-six lesson note.",
  },
} as const;

const demoVideo: VideoMetadata = {
  id: "my2m2balcny",
  title: "I Turned a 2m² Balcony Into a Food Garden",
  channelTitle: "Maya Makes Space",
  // Deliberately non-resolving: the demo is fully synthetic, so the UI
  // renders the locally shipped illustration instead of fetching anything.
  thumbnailUrl: "https://demo.invalid/fixtures/maya-balcony-after.jpg",
  commentCount: 341,
};

const shoppingListEvidence: Evidence[] = [
  {
    author: "first_balcony_flat",
    text: "Please just list exactly what you bought and what it cost. Every video skips the boring part and the boring part is what I need.",
    likeCount: 187,
  },
  {
    author: "renting_not_rooted",
    text: "I have a 1.8m balcony and no idea what to buy first. A starter list with a real budget would be everything.",
    likeCount: 142,
  },
  {
    author: "thrifty.thyme",
    text: "What did the whole setup honestly cost, including the soil and the failures? Asking before I commit my deposit money.",
    likeCount: 93,
  },
];

const wateringEvidence: Evidence[] = [
  {
    author: "sunny.side.flat",
    text: "It hit 34°C here and my basil collapsed by noon. How often are you actually watering in summer??",
    likeCount: 164,
  },
  {
    author: "second_floor_sprouts",
    text: "Morning or evening? Once or twice a day? You show the watering can but never the schedule!",
    likeCount: 118,
  },
  {
    author: "wilted.wednesday",
    text: "Third time asking: how much water per pot when it's really hot? Mine either drown or crisp.",
    likeCount: 87,
  },
];

const whatFailedEvidence: Evidence[] = [
  {
    author: "compost_confessions",
    text: "Show the mistakes and fixes—not only the reveal. The 30 seconds where you admitted the spinach bolted was the most useful part.",
    likeCount: 231,
  },
  {
    author: "growing_pains_gal",
    text: "Please make a full video about what died and why. Nobody shows the failures and that's why beginners quit.",
    likeCount: 176,
  },
  {
    author: "aphid_survivor",
    text: "Lost my mint the exact same way. What would you change if you started the balcony again from zero?",
    likeCount: 119,
  },
];

const demoSignals: Signal[] = [
  {
    id: "sig-request-shopping-list",
    category: "request",
    title: "A beginner shopping list with an honest budget",
    summary:
      "The most repeated ask in the thread: viewers want the exact starter list with real prices. They don't know what to buy first, and they're afraid of hidden costs the pretty tour never mentions.",
    opportunityScore: 84,
    scoreReasons: [
      "Asked explicitly 21 times across the comment thread",
      "Budget-anxiety comments collect the highest like counts",
      "Directly extends the original video instead of a new topic",
    ],
    evidenceCount: 21,
    evidence: shoppingListEvidence,
    recommendation: {
      workingTitle: "The 2m² Starter Garden: Full Shopping List, Real Budget",
      hook: "Everything I bought for the balcony garden — with the honest prices, including the two mistakes.",
      suggestedFormat: "carousel",
      rationale:
        "A shopping list is reference material. A swipeable document viewers can save beats a video they'd have to scrub, and it becomes the evergreen answer to the most-asked question under the upload.",
    },
  },
  {
    id: "sig-question-watering",
    category: "unanswered_question",
    title: "A simple watering schedule for hot weather",
    summary:
      "The most repeated question that never got an answer: how often and how much to water when it's genuinely hot. Viewers blame the missing schedule for scorched herbs and drowned pots.",
    opportunityScore: 78,
    scoreReasons: [
      "17 unanswered comments ask about summer watering",
      "Viewers explicitly connect it to their failed attempts",
      "One clear schedule can be pinned and reused every summer",
    ],
    evidenceCount: 17,
    evidence: wateringEvidence,
    recommendation: {
      workingTitle: "The Hot-Week Watering Schedule (Steal This)",
      hook: "The schedule that kept a 2m² garden alive through a 34-degree week — when, how much, and the one check that decides it.",
      suggestedFormat: "short",
      rationale:
        "Three memorable rules land perfectly as a Short: answer the question once, pin it under the original video, and point every future summer comment at it.",
    },
  },
  {
    id: DEMO_FEATURED_SIGNAL_ID,
    category: "strong_reaction",
    title: "Show the mistakes and fixes—not only the reveal.",
    summary:
      "The strongest reaction in the whole thread: the short segment admitting the spinach bolted and aphids took the mint. Viewers say the honesty is why they trust the channel — and they want the full failure breakdown.",
    opportunityScore: 81,
    scoreReasons: [
      "26 comments reference the same honest moment",
      "Top reaction comment out-liked everything else on the video",
      "Viewers name the exact follow-up they want: what failed and why",
    ],
    evidenceCount: 26,
    evidence: whatFailedEvidence,
    recommendation: {
      workingTitle: "3 mistakes that nearly killed my balcony garden.",
      hook: "Three mistakes nearly killed my 2m² balcony garden. Here is what failed—and exactly how I would fix each one.",
      suggestedFormat: "short",
      rationale:
        "The audience already marked the highlight. A standalone failure breakdown serves the 26 people who asked and tests an honest 'what went wrong' series the channel can repeat.",
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
type SceneDrafts = [
  SceneDraft,
  SceneDraft,
  SceneDraft,
  SceneDraft,
  SceneDraft,
  SceneDraft,
];

interface FormatOverride {
  title?: string;
  hook?: string;
  angle?: string;
  caption?: string;
  cta?: string;
  scenes?: SceneDrafts;
}

interface PackDraft {
  signalId: string;
  angle: string;
  caption: string;
  cta: string;
  hashtags: string[];
  /** Per-scene durations for the Short variant. Must total 30–45 seconds. */
  shortDurations: [number, number, number, number, number, number];
  scenes: SceneDrafts;
  /** Destination-aware demo copy without stretching the shared contract. */
  formatOverrides?: Partial<Record<ContentFormat, FormatOverride>>;
}

const packDrafts: PackDraft[] = [
  {
    signalId: "sig-request-shopping-list",
    angle:
      "Answer the 21 budget questions head-on: the exact starter list for a 2m² food garden with honest prices, including the two purchases to skip.",
    caption:
      "The full 2m² balcony garden shopping list — with the honest budget, including the two purchases I'd skip today. €93 all in. Save this for the garden center and tell me what your balcony's first crop will be.",
    cta: "Save this list for your first garden-center trip",
    hashtags: [
      "#balconygarden",
      "#urbangardening",
      "#beginnergardener",
      "#foodgarden",
    ],
    shortDurations: [4, 6, 7, 7, 7, 5],
    scenes: [
      {
        headline: "The honest starter list",
        body: "Everything for a 2m² food garden — with the real prices.",
        visualDirection:
          "Title card over the finished balcony illustration; a price-tag motif in the corner.",
        voiceover:
          "Twenty-one of you asked for the exact list. So here it is — everything I bought, with the honest numbers.",
      },
      {
        headline: "Containers: €38",
        body: "Three 50cm planter boxes, one vertical rail rack, saucers. Skip terracotta for now — it dries out fastest.",
        visualDirection:
          "Flat-lay of the planters with price labels appearing one by one.",
        voiceover:
          "Containers first: three fifty-centimeter boxes and one vertical rack for the railing. Thirty-eight euros.",
      },
      {
        headline: "Soil and food: €22",
        body: "40L of container mix plus slow-release feed. Cheap topsoil is the classic first-garden mistake.",
        visualDirection:
          "Soil bag pouring into a planter; a small 'not topsoil' callout.",
        voiceover:
          "Soil is where beginners get burned. Container mix, not topsoil, plus slow-release feed — twenty-two euros.",
      },
      {
        headline: "Seeds and starts: €19",
        body: "Basil, mint, and cherry tomato starts plus spinach and radish seed packets. Buy starts for slow herbs and seeds for fast growers — starts skip the six fragile weeks, and seeds cost almost nothing when the plant grows quickly anyway.",
        visualDirection:
          "Seedling tray beside seed packets; split label 'starts vs seeds'.",
        voiceover:
          "Plants: buy starts for the slow herbs, seeds for the fast growers. Nineteen euros covers the lot.",
      },
      {
        headline: "Tools that matter: €14",
        body: "A watering can with a rose head, snips, and a moisture meter. That's it — no gadget drawer.",
        visualDirection:
          "Three tools laid out on the balcony floor, everything else crossed out.",
        voiceover:
          "Tools: a proper watering can, snips, and a moisture meter. Fourteen euros. Everything else is a gadget.",
      },
      {
        headline: "Total: €93, honestly",
        body: "Under €100 including the two mistakes I'd skip today. Save this list for your first trip.",
        visualDirection:
          "The finished balcony with a €93 tag; save prompt and channel mark.",
        voiceover:
          "Ninety-three euros, honestly counted — including the two mistakes. Save the list, and tell me what you'd plant first.",
      },
    ],
  },
  {
    signalId: "sig-question-watering",
    angle:
      "Turn the most-repeated unanswered question into three memorable rules: when to water, how much, and the one check that decides it.",
    caption:
      "Finally answering the question under every summer video: the exact watering schedule that kept the 2m² garden alive at 34°C. Sunrise check, two-knuckle test, measured pours. Pin this for the next heatwave and tell me what your hottest balcony day was.",
    cta: "Pin this schedule for the next heatwave",
    hashtags: [
      "#balconygarden",
      "#wateringtips",
      "#urbangardening",
      "#heatwave",
    ],
    shortDurations: [4, 6, 7, 7, 7, 5],
    scenes: [
      {
        headline: "The 34°C week",
        body: "One heatwave nearly took out half the balcony — until this schedule.",
        visualDirection:
          "Thermometer graphic climbing over the balcony illustration; heat shimmer.",
        voiceover:
          "This is the schedule that got the balcony through a thirty-four degree week — three rules, that's all.",
      },
      {
        headline: "Water at sunrise",
        body: "Before 8am the water soaks in instead of steaming off. Evening top-ups only on 30°C+ days.",
        visualDirection:
          "Sunrise over the railing; watering can silhouette; a clock pinned at 7:30.",
        voiceover:
          "Rule one: water at sunrise. Before eight, it soaks in. After that, you're watering the air.",
      },
      {
        headline: "The two-knuckle test",
        body: "Finger into the soil to the second knuckle. Dry there? Water. Damp? Walk away.",
        visualDirection:
          "Close-up of a finger in the soil with a depth marker; dry/damp split screen.",
        voiceover:
          "Rule two: the two-knuckle test. Push a finger in — dry at the second knuckle means water, damp means walk away.",
      },
      {
        headline: "How much per pot",
        body: "Small herb pots: half a liter. The 50cm boxes: two liters, slowly, until the saucer just shines.",
        visualDirection:
          "Measuring jug pouring into each pot size with amounts labeled.",
        voiceover:
          "Rule three: measure it. Half a liter for the small pots, two liters for the big boxes — slowly, until the saucer shines.",
      },
      {
        headline: "Shade the roots",
        body: "A light towel over dark pots drops root temperature more than any misting.",
        visualDirection:
          "Dark pot wrapped in a pale cloth; a temperature arrow dropping.",
        voiceover:
          "Bonus: shade the pots, not the leaves. A pale towel on a dark pot beats misting every time.",
      },
      {
        headline: "Steal the schedule",
        body: "Sunrise check, knuckle test, measured pours. Pin this for the next heatwave.",
        visualDirection:
          "The three rules stacked as a checklist over the watering illustration.",
        voiceover:
          "Sunrise check, knuckle test, measured pours. Steal the schedule, pin it, and your balcony survives the summer.",
      },
    ],
  },
  {
    signalId: DEMO_FEATURED_SIGNAL_ID,
    angle:
      "Answer the strongest reaction with three concrete mistakes, the damage each caused, and the fix Maya would use on a restart.",
    caption:
      "You asked for the full failure list, so here it is: what died in the 2m² balcony garden, why it died, and what I'd change on a restart. Failure is data. Tell me what died on your balcony this year — honest answers only.",
    cta: "Share your own balcony failure in the comments",
    hashtags: [
      "#balconygarden",
      "#gardenfails",
      "#growyourownfood",
      "#lessonslearned",
    ],
    shortDurations: [4, 6, 7, 7, 7, 6],
    scenes: [
      {
        headline: "The part nobody shows",
        body: "Three things died on this balcony. Here's the honest list.",
        visualDirection:
          "The week-six lesson note illustration; slow push-in on the pinned card.",
        voiceover:
          "Twenty-six of you reacted to one honest moment. So here's the full list — everything that died, and why.",
      },
      {
        headline: "The spinach bolted",
        body: "Full June sun on a south wall — the spinach quit in week five. It needed the shady corner.",
        visualDirection:
          "The bolted spinach illustration; a sun path arcing over the wall.",
        voiceover:
          "First loss: the spinach. Full June sun on a south wall, and by week five it bolted. Wrong plant, wrong corner.",
      },
      {
        headline: "Aphids took the mint",
        body: "I ignored three sticky leaves on Monday. By Friday the pot was theirs.",
        visualDirection:
          "Close-up of aphid dots spreading across a leaf between Monday and Friday labels.",
        voiceover:
          "Second loss: the mint. Three sticky leaves on Monday, a lost pot by Friday. Check early, every time.",
      },
      {
        headline: "The €12 gadget I regret",
        body: "Self-watering globes drowned the basil while I was away. A neighbor with a key beats gadgets.",
        visualDirection:
          "A watering globe with a slow drip flooding a pot; a crossed-out price tag.",
        voiceover:
          "Third loss: my own shortcut. The watering globes drowned the basil in a weekend. A neighbor with a key beats gadgets.",
      },
      {
        headline: "What I'd change",
        body: "Shade-map the balcony first, quarantine new plants, and start with half the varieties.",
        visualDirection:
          "A simple balcony map with sun and shade zones; three checklist items.",
        voiceover:
          "A restart would change three things: map the shade first, quarantine every new plant, and grow half as many varieties.",
      },
      {
        headline: "Failure is data",
        body: "The garden that survived is built on the one that didn't. What died on your balcony? Tell me below.",
        visualDirection:
          "The thriving after-illustration beside the lesson note; end card.",
        voiceover:
          "The garden you saw in the tour is built on this list. Failure is data — tell me what died on your balcony.",
      },
    ],
    formatOverrides: {
      carousel: {
        title: "6 decisions behind a 2m² food garden.",
        hook:
          "The finished balcony makes more sense when you can see the six decisions shaped by everything that failed first.",
        angle:
          "Turn the audience request for mistakes and fixes into six practical design decisions readers can save before starting a small-space food garden.",
        caption:
          "The finished 2m² food garden came after the failures. These are the six decisions that changed the second attempt—from mapping the light to treating every loss as a design note. Save this before you plan a small-space garden, and tell me which decision you would make first.",
        cta: "Save the six decisions for your own small-space garden",
        scenes: [
          {
            headline: "1 · Map the light first",
            body: "The bolted spinach revealed the real sun path. Mark full sun, reflected heat, and the one cool corner before buying a single plant.",
            visualDirection:
              "Top-down balcony plan with the six-hour sun path and shaded corner clearly marked.",
            voiceover:
              "Decision one: map the light before shopping. The failed spinach showed exactly where the balcony needed shade-loving crops.",
          },
          {
            headline: "2 · Choose containers before crops",
            body: "Two square meters means every pot needs a job. Railing boxes create growing space without taking away the only place to stand.",
            visualDirection:
              "Simple footprint diagram comparing floor pots with railing planters.",
            voiceover:
              "Decision two: design the container footprint first, then choose crops that fit it.",
          },
          {
            headline: "3 · Start with fewer varieties",
            body: "Half as many crops made the watering routine learnable. Depth and consistency beat a crowded first-season wish list.",
            visualDirection:
              "A crowded planting list pared back to a focused set of herbs, tomatoes, spinach, and radishes.",
            voiceover:
              "Decision three: grow fewer things well. Variety was exciting, but consistency kept the second garden alive.",
          },
          {
            headline: "4 · Water by soil, not by clock",
            body: "The two-knuckle check replaced guesswork. Measured pours and a visible handoff plan beat self-watering gadgets.",
            visualDirection:
              "Moisture check, measured jug, and a simple neighbor handoff card.",
            voiceover:
              "Decision four: let the soil decide. A repeatable check and a human backup were safer than the gadget that drowned the basil.",
          },
          {
            headline: "5 · Quarantine every new plant",
            body: "Three sticky mint leaves became an aphid takeover. New plants now wait apart for a week before joining the balcony.",
            visualDirection:
              "One new herb pot isolated beside a seven-day inspection checklist.",
            voiceover:
              "Decision five: quarantine new plants. One week apart would have stopped the aphids before they spread.",
          },
          {
            headline: "6 · Keep the failure notes",
            body: "The reveal is not the whole story. A tiny log of what died, why, and the next fix became the brief for every better decision.",
            visualDirection:
              "The thriving balcony beside a compact failure-and-fix notebook.",
            voiceover:
              "Decision six: keep the failure notes. The garden that survived was designed by the one that did not.",
          },
        ],
      },
    },
  },
];

function buildScenes(draft: PackDraft, format: ContentFormat): Scene[] {
  const scenes = draft.formatOverrides?.[format]?.scenes ?? draft.scenes;
  return scenes.map((scene, index) => ({
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

  const formatOverride = draft.formatOverrides?.[format];

  return ContentPackSchema.parse({
    id: `pack-${signalId}-${format}`,
    format,
    title: formatOverride?.title ?? signal.recommendation.workingTitle,
    hook: formatOverride?.hook ?? signal.recommendation.hook,
    angle: formatOverride?.angle ?? draft.angle,
    scenes: buildScenes(draft, format),
    caption: formatOverride?.caption ?? draft.caption,
    cta: formatOverride?.cta ?? draft.cta,
    hashtags: draft.hashtags,
    sourceEvidence: signal.evidence,
    sourceSignal: signal,
    provenance: DEMO_PROVENANCE,
  });
}

export const DEMO_SIGNAL_IDS = demoSignals.map((signal) => signal.id);
