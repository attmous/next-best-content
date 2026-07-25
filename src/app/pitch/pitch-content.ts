export const PITCH_SLIDE_COUNT = 6;

export const PITCH_SLIDES = [
  {
    id: "slide-1",
    eyebrow: "The one-line idea",
    title: "Your audience already wrote your next content brief",
  },
  {
    id: "slide-2",
    eyebrow: "The creator problem",
    title: "Creators have feedback everywhere—and still guess what to make next",
  },
  {
    id: "slide-3",
    eyebrow: "The product",
    title: "NextBestContent turns comments into a decision, not another dashboard",
  },
  {
    id: "slide-4",
    eyebrow: "The synthetic case study",
    title: "Maya’s audience asks for the next story—and gets two answers",
  },
  {
    id: "slide-5",
    eyebrow: "Two honest runtime profiles",
    title: "Built for a public demo—and private real work",
  },
  {
    id: "slide-6",
    eyebrow: "The close",
    title: "Your next content idea is already in the comments",
  },
] as const;

export const MAYA_COMMENTS = [
  {
    type: "Audience request",
    quote:
      "Please show what went wrong—not just the finished balcony.",
  },
  {
    type: "Unanswered question",
    quote:
      "How do you stop overwatering when every pot dries at a different speed?",
  },
  {
    type: "Strong reaction",
    quote: "The tiny-space layout is the part I’d copy tomorrow.",
  },
] as const;

export const PRODUCT_JOURNEY = [
  {
    number: "01",
    name: "Listen",
    detail: "Live when policy gates permit, creator import, or synthetic demo.",
  },
  {
    number: "02",
    name: "Decide",
    detail: "Exactly three scored opportunities, each tied to audience evidence.",
  },
  {
    number: "03",
    name: "Create",
    detail: "Choose YouTube or LinkedIn independently from the source.",
  },
  {
    number: "04",
    name: "Preflight",
    detail: "Seven transparent checks, then copy or download real local exports.",
  },
] as const;

export const GITHUB_URL = "https://github.com/attmous/next-best-content";
