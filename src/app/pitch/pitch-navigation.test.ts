import { describe, expect, it } from "vitest";

import {
  adjacentSlideIndex,
  clampSlideIndex,
  directionForNavigationKey,
  slideHref,
  slideIndexFromHash,
} from "@/app/pitch/pitch-navigation";

describe("pitch slide navigation", () => {
  it("keeps adjacent navigation inside the six-slide deck", () => {
    expect(adjacentSlideIndex(0, -1, 6)).toBe(0);
    expect(adjacentSlideIndex(0, 1, 6)).toBe(1);
    expect(adjacentSlideIndex(5, 1, 6)).toBe(5);
    expect(clampSlideIndex(99, 6)).toBe(5);
  });

  it("turns slide indices into direct anchors", () => {
    expect(slideHref(0)).toBe("#slide-1");
    expect(slideHref(5)).toBe("#slide-6");
  });

  it("reads only valid direct slide anchors", () => {
    expect(slideIndexFromHash("#slide-4", 6)).toBe(3);
    expect(slideIndexFromHash("#slide-0", 6)).toBeNull();
    expect(slideIndexFromHash("#slide-7", 6)).toBeNull();
    expect(slideIndexFromHash("#other", 6)).toBeNull();
  });

  it("maps horizontal and paging keys without hijacking vertical arrows", () => {
    expect(directionForNavigationKey("ArrowRight")).toBe(1);
    expect(directionForNavigationKey("ArrowLeft")).toBe(-1);
    expect(directionForNavigationKey("PageDown")).toBe(1);
    expect(directionForNavigationKey("PageUp")).toBe(-1);
    expect(directionForNavigationKey("ArrowDown")).toBeNull();
  });
});
