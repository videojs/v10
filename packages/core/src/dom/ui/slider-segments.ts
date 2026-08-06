import { getSliderSegmentsId } from '../../core/ui/slider/slider-segments-core';

export function getSliderTrackClipPath(id: string): string {
  return `url("#${getSliderSegmentsId(id)}")`;
}
