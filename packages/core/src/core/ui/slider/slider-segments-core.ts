import { defaults } from '@videojs/utils/object';
import type { NonNullableObject } from '@videojs/utils/types';
import type { StateAttrMap } from '../types';
import type { SliderState } from './slider-core';

/** A continuous range in the slider's value domain. */
export interface SliderSegment {
  /** Range start. */
  start: number;
  /** Range end. */
  end: number;
}

export interface SliderSegmentsProps {
  /** Ranges to render in the slider's value domain. */
  segments?: readonly SliderSegment[] | undefined;
}

export interface SliderSegmentState {
  /** Range start as a percentage of the slider. */
  offset: number;
  /** Range size as a percentage of the slider. */
  size: number;
  /** Whether the slider pointer is within this range. */
  highlighted: boolean;
}

export const SliderSegmentDataAttrs = {
  /** Present on the segment under the slider pointer. */
  highlighted: 'data-highlighted',
} as const satisfies StateAttrMap<SliderSegmentState>;

export interface SliderSegmentsState extends Pick<SliderState, 'orientation'> {
  /** Whether there are valid ranges to render. */
  hasSegments: boolean;
  /** Valid ranges converted to slider percentages. */
  segments: readonly SliderSegmentState[];
}

export const SliderSegmentsDataAttrs = {
  /** Present when there are slider segments to render. */
  hasSegments: 'data-segments',
} as const satisfies StateAttrMap<SliderSegmentsState>;

/** Converts slider-domain ranges into percentage geometry for rendering. */
export class SliderSegmentsCore {
  static readonly defaultProps: NonNullableObject<SliderSegmentsProps> = {
    segments: [],
  };

  #props = { ...SliderSegmentsCore.defaultProps };

  constructor(props?: SliderSegmentsProps) {
    if (props) this.setProps(props);
  }

  setProps(props: SliderSegmentsProps): void {
    this.#props = defaults(props, SliderSegmentsCore.defaultProps);
  }

  getState(orientation: SliderState['orientation'], min: number, max: number, pointer?: number): SliderSegmentsState {
    const range = max - min;
    if (!Number.isFinite(range) || range <= 0) {
      return { orientation, hasSegments: false, segments: [] };
    }

    const segments = this.#props.segments.flatMap(({ start, end }) => {
      const offset = ((start - min) / range) * 100;
      const size = ((end - start) / range) * 100;

      const contains = (value: number): boolean => {
        return value >= start && (value < end || (end === max && value === end));
      };

      return Number.isFinite(offset) && Number.isFinite(size) && size > 0
        ? [
            {
              offset,
              size,
              highlighted: pointer !== undefined && contains(pointer),
            },
          ]
        : [];
    });

    return { orientation, hasSegments: segments.length > 0, segments };
  }

  getAttrs(_state: SliderSegmentsState) {
    return { 'aria-hidden': 'true' as const };
  }
}

export function getSliderSegmentsId(sliderId: string): string {
  return `${sliderId}-segments`;
}

export namespace SliderSegmentsCore {
  export type Props = SliderSegmentsProps;
  export type State = SliderSegmentsState;
  export type Segment = SliderSegment;
  export type SegmentState = SliderSegmentState;
}
