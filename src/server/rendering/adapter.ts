import type { ContentPack } from "@/contracts";

export type RenderingResult =
  | {
      status: "ready";
      outputUrl: string;
      mediaType: string;
    }
  | {
      status: "fallback";
      reason: string;
    };

export interface RenderingAdapter {
  readonly name: string;

  render(
    contentPack: ContentPack,
    signal: AbortSignal,
  ): Promise<RenderingResult>;
}
