export type PitchDirection = -1 | 1;

export function clampSlideIndex(index: number, slideCount: number): number {
  if (slideCount <= 0) return 0;
  return Math.min(Math.max(index, 0), slideCount - 1);
}

export function adjacentSlideIndex(
  currentIndex: number,
  direction: PitchDirection,
  slideCount: number,
): number {
  return clampSlideIndex(currentIndex + direction, slideCount);
}

export function slideHref(index: number): `#slide-${number}` {
  return `#slide-${index + 1}`;
}

export function slideIndexFromHash(
  hash: string,
  slideCount: number,
): number | null {
  const match = /^#slide-(\d+)$/.exec(hash);
  if (!match) return null;

  const oneBasedIndex = Number.parseInt(match[1], 10);
  if (
    !Number.isInteger(oneBasedIndex) ||
    oneBasedIndex < 1 ||
    oneBasedIndex > slideCount
  ) {
    return null;
  }

  return oneBasedIndex - 1;
}

export function directionForNavigationKey(
  key: string,
): PitchDirection | null {
  if (key === "ArrowRight" || key === "PageDown") return 1;
  if (key === "ArrowLeft" || key === "PageUp") return -1;
  return null;
}
