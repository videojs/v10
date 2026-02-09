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
  /** Formatted display text (e.g., "1:30"). */
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

  constructor(props?: TimeProps) {
    if (props) this.setProps(props);
  }

  setProps(props: TimeProps): void {
    this.#props = defaults(props, TimeCore.defaultProps);
  }

  #getSeconds(time: MediaTimeState): number {
    const { type } = this.#props;
    switch (type) {
      case 'current':
        return time.currentTime;
      case 'duration':
        return time.duration;
      case 'remaining':
        return time.currentTime - time.duration;
      default:
        return 0;
    }
  }

  #getText(time: MediaTimeState): string {
    const { type, negativeSign } = this.#props;
    const seconds = this.#getSeconds(time);

    if (type === 'remaining') {
      const formatted = formatTime(Math.abs(seconds), time.duration);
      return seconds < 0 ? `${negativeSign}${formatted}` : formatted;
    }

    return formatTime(seconds, time.duration);
  }

  #getPhrase(time: MediaTimeState): string {
    const { type } = this.#props;
    const seconds = this.#getSeconds(time);

    if (type === 'remaining') {
      // Use negative to trigger "remaining" suffix
      return formatTimeAsPhrase(seconds < 0 ? seconds : -Math.abs(seconds));
    }

    return formatTimeAsPhrase(seconds);
  }

  #getDatetime(time: MediaTimeState): string {
    const seconds = this.#getSeconds(time);
    return secondsToIsoDuration(Math.abs(seconds));
  }

  getLabel(time: MediaTimeState): string {
    const state = this.getState(time);
    const { label } = this.#props;

    if (isFunction(label)) {
      const customLabel = label(state);
      if (customLabel) return customLabel;
    } else if (label) {
      return label;
    }

    return DEFAULT_LABELS[this.#props.type];
  }

  getAttrs(time: MediaTimeState): Record<string, string | undefined> {
    return {
      'aria-label': this.getLabel(time),
      'aria-valuetext': this.#getPhrase(time),
    };
  }

  getState(time: MediaTimeState): TimeState {
    const seconds = this.#getSeconds(time);
    return {
      type: this.#props.type,
      seconds,
      text: this.#getText(time),
      phrase: this.#getPhrase(time),
      datetime: this.#getDatetime(time),
    };
  }
}

export namespace TimeCore {
  export type Props = TimeProps;
  export type State = TimeState;
}
