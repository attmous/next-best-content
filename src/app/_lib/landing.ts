/**
 * Landing-page constants, kept in a plain module so tests can assert the
 * CTAs and destinations without rendering React.
 */

/** Local-setup instructions maintained by the deployment owner. */
export const GITHUB_SETUP_URL =
  "https://github.com/attmous/next-best-content#local-setup";

export const LANDING_CTA_PRIMARY = "Try the interactive demo";
export const LANDING_CTA_SECONDARY = "Run privately with your own key";

export const LANDING_HEADLINE =
  "From audience signals to publish-ready content.";

export const TRUST_POINTS = [
  {
    title: "Synthetic by design",
    detail:
      "The public experience runs on clearly labeled fictional data — no real comments are read and none are stored.",
  },
  {
    title: "No account needed",
    detail:
      "The demo runs entirely in your browser session. Nothing to sign up for, nothing persisted.",
  },
  {
    title: "Nothing is published",
    detail:
      "Exports are local files — captions, storyboards, images, PDFs. You upload them yourself, deliberately.",
  },
  {
    title: "Private by default",
    detail:
      "The full product runs on your machine. The recommended key path is server-managed container configuration; optional request-scoped keys are never stored.",
  },
] as const;
