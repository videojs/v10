import { defaults } from '@videojs/utils/object';
import { isFunction } from '@videojs/utils/predicate';
import { formatTime, formatTimeAsPhrase, secondsToIsoDuration } from '@videojs/utils/time';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaTimeState } from '../../media/state';

/** Time display type. */
export type TimeType = 'current' | 'duration' | 'remaining';

export interface TimeProps {
  /** Which time value to display. */
  type?: TimeType | undefined;
  /** Symbol prepended to remaining time. */
  negativeSign?: string | undefined;
  /** Custom label for accessibility. */
  label?: string | ((state: TimeState) => string) | undefined;
}

export interface TimeState {
  /** Time display type. */
  type: TimeType;
  /** Raw value in seconds. */
  seconds: number;
  /** Whether the time value is negative (remaining time before end). */
  negative: boolean;
  /** Formatted display text without sign (e.g., "1:30"). */
  text: string;
  /** Human-readable phrase (e.g., "1 minute, 30 seconds"). */
  phrase: string;
  /** ISO 8601 duration (e.g., "PT1M30S"). */
  datetime: string;
}

const DEFAULT_LABELS: Record<TimeType, string> = {
  current: 'Current time',
  duration: 'Duration',
  remaining: 'Remaining',
};

export class TimeCore {
  static readonly defaultProps: NonNullableObject<TimeProps> = {
    type: 'current',
    negativeSign: '-',
    label: '',
  };

  #props = { ...TimeCore.defaultProps };
  #media: MediaTimeState | null = null;

  constructor(props?: TimeProps) {
    if (props) this.setProps(props);
  }

  setProps(props: TimeProps): void {
    this.#props = defaults(props, TimeCore.defaultProps);
  }

  setMedia(media: MediaTimeState): void {
    this.#media = media;
  }

  #getSeconds(): number {
    const media = this.#media!;
    const { type } = this.#props;
    switch (type) {
      case 'current':
        return media.currentTime;
      case 'duration':
        return media.duration;
      case 'remaining':
        return media.currentTime - media.duration;
      default:
        return 0;
    }
  }

  #getText(): string {
    const media = this.#media!;
    const seconds = this.#getSeconds();
    return formatTime(Math.abs(seconds), media.duration);
  }

  #getPhrase(): string {
    const { type } = this.#props;
    const seconds = this.#getSeconds();

    if (type === 'remaining') {
      // Use negative to trigger "remaining" suffix
      return formatTimeAsPhrase(seconds < 0 ? seconds : -Math.abs(seconds));
    }

    return formatTimeAsPhrase(seconds);
  }

  #getDatetime(): string {
    const seconds = this.#getSeconds();
    return secondsToIsoDuration(Math.abs(seconds));
  }

  getLabel(state: TimeState): string {
    const { label } = this.#props;

    if (isFunction(label)) {
      const customLabel = label(state);
      if (customLabel) return customLabel;
    } else if (label) {
      return label;
    }

    return DEFAULT_LABELS[this.#props.type];
  }

  getAttrs(state: TimeState) {
    return {
      'aria-label': this.getLabel(state),
      'aria-valuetext': state.phrase,
    };
  }

  getState(): TimeState {
    const seconds = this.#getSeconds();
    return {
      type: this.#props.type,
      seconds,
      negative: this.#props.type === 'remaining' && seconds < 0,
      text: this.#getText(),
      phrase: this.#getPhrase(),
      datetime: this.#getDatetime(),
    };
  }
}

export namespace TimeCore {
  export type Props = TimeProps;
  export type State = TimeState;
}
