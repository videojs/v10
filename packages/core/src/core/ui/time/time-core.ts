import { defaults } from '@videojs/utils/object';
import { formatTime, formatTimeAsPhrase, secondsToIsoDuration } from '@videojs/utils/time';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaTimeState } from '../../media/state';
import { resolveLabel } from '../utils/resolve-label';

/** Time display type. */
export type TimeType = 'current' | 'duration' | 'remaining';

export interface TimeProps {
  /** Which time value to display. */
  type?: TimeType | undefined;
  /** Symbol prepended to remaining time. */
  negativeSign?: string | undefined;
  /** Custom label for accessibility. */
  label?: string | ((state: TimeState) => string) | undefined;
  /** Whether the time display can be toggled. */
  toggle?: boolean | undefined;
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

const TOGGLE_LABEL_KEYS: Record<
  TimeType,
  '{duration}. Show elapsed time.' | '{duration}. Show duration.' | '{duration}. Show remaining time.'
> = {
  current: '{duration}. Show elapsed time.',
  duration: '{duration}. Show duration.',
  remaining: '{duration}. Show remaining time.',
};

const DEFAULT_LABEL_KEYS: Record<TimeType, 'Current time' | 'Duration' | 'Remaining'> = {
  current: 'Current time',
  duration: 'Duration',
  remaining: 'Remaining',
};

export class TimeCore {
  static readonly defaultProps: NonNullableObject<TimeProps> = {
    type: 'current',
    negativeSign: '-',
    label: '',
    toggle: false,
  };

  #props: NonNullableObject<TimeProps> = { ...TimeCore.defaultProps };
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

  #getToggleType(type: TimeType, currentType: TimeType): TimeType {
    if (type === 'current') {
      return currentType === 'remaining' ? 'current' : 'remaining';
    }

    return currentType === 'duration' ? 'remaining' : 'duration';
  }

  getLabel(state: TimeState, type = this.#props.type): string {
    const custom = resolveLabel(this.#props.label, state);
    if (custom !== undefined) return custom;
    if (!this.#props.toggle) {
      return DEFAULT_LABEL_KEYS[this.#props.type];
    }

    const toggleType = this.#getToggleType(type, state.type);

    return TOGGLE_LABEL_KEYS[toggleType];
  }

  getLabelParams(state: TimeState): { duration: string } | undefined {
    const custom = resolveLabel(this.#props.label, state);
    return custom === undefined && this.#props.toggle ? { duration: state.phrase } : undefined;
  }

  getAttrs(state: TimeState, type = this.#props.type) {
    return {
      'aria-label': this.getLabel(state, type),
      role: this.#props.toggle ? 'button' : undefined,
      tabIndex: this.#props.toggle ? 0 : undefined,
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
