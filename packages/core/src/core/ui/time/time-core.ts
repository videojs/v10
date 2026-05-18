import { defaults } from '@videojs/utils/object';
import { formatDuration, formatTime, secondsToIsoDuration, type TimeFormatOptions } from '@videojs/utils/time';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaTimeState } from '../../media/state';
import { resolveOptionalControlLabel } from '../resolve-optional-control-label';
import type { TranslationKeyOrString } from '../types';

/** Time display type. */
export type TimeType = 'current' | 'duration' | 'remaining';

export interface TimeProps {
  /** Which time value to display. */
  type?: TimeType | undefined;
  /** Symbol prepended to remaining time. */
  negativeSign?: string | undefined;
  /** Custom label for accessibility. */
  label?: TranslationKeyOrString | ((state: TimeState) => TranslationKeyOrString) | undefined;
  /** Options for `formatDuration` when building spoken-duration copy (`phrase` state and screen readers), not digital clock text. */
  formatOptions?: TimeFormatOptions | undefined;
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

const DEFAULT_LABEL_KEYS: Record<TimeType, 'timeCurrent' | 'timeDuration' | 'timeRemaining'> = {
  current: 'timeCurrent',
  duration: 'timeDuration',
  remaining: 'timeRemaining',
};

type TimeCoreResolvedProps = NonNullableObject<Omit<TimeProps, 'formatOptions'>> & Pick<TimeProps, 'formatOptions'>;

export class TimeCore {
  static readonly defaultProps: NonNullableObject<Omit<TimeProps, 'formatOptions'>> = {
    type: 'current',
    negativeSign: '-',
    label: '',
  };

  #props: TimeCoreResolvedProps = { ...TimeCore.defaultProps };
  #media: MediaTimeState | null = null;

  constructor(props?: TimeProps) {
    if (props) this.setProps(props);
  }

  setProps(props: TimeProps): void {
    this.#props = defaults(props, TimeCore.defaultProps) as TimeCoreResolvedProps;
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
    const { type, formatOptions } = this.#props;
    const seconds = this.#getSeconds();

    if (type === 'remaining') {
      // Use negative to trigger "remaining" suffix
      return formatDuration(seconds < 0 ? seconds : -Math.abs(seconds), formatOptions);
    }

    return formatDuration(seconds, formatOptions);
  }

  #getDatetime(): string {
    const seconds = this.#getSeconds();
    return secondsToIsoDuration(Math.abs(seconds));
  }

  getLabel(state: TimeState): TranslationKeyOrString {
    const custom = resolveOptionalControlLabel(this.#props.label, state);
    if (custom !== undefined) return custom;

    return DEFAULT_LABEL_KEYS[this.#props.type];
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
