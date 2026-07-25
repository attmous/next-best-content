import type { Metadata } from "next";

import { PitchDeck } from "@/app/pitch/_components/pitch-deck";

export const metadata: Metadata = {
  title: "Your audience is the brief | NextBestContent",
  description:
    "The six-slide NextBestContent jury pitch: turn audience comments into evidence-backed YouTube Shorts and LinkedIn documents.",
};

export default function PitchPage() {
  return <PitchDeck />;
}
