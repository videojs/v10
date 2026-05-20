import { createState } from '@videojs/store';
import { defaults } from '@videojs/utils/object';
import { isFunction, isUndefined } from '@videojs/utils/predicate';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaPlaybackRateState } from '../../media/state';
import type { ButtonState } from '../types';

/** Props for the playback rate menu core. */
export interface PlaybackRateMenuProps {
  /** Custom label for the menu trigger. */
  label?: string | ((state: PlaybackRateMenuState) => string) | undefined;
  /** Custom formatter for visible playback rate labels. */
  formatRate?: ((rate: number) => string) | undefined;
  /** Whether playback rate selection is disabled. */
  disabled?: boolean | undefined;
}

/** Reactive state surfaced by the playback rate menu core. */
export interface PlaybackRateMenuState extends ButtonState {
  /** Current playback rate multiplier (1 = normal). */
  rate: number;
  /** Allowed playback rates to expose as menu items. */
  rates: readonly number[];
  /** Whether selection is currently disabled. */
  disabled: boolean;
}

function formatPlaybackRate(rate: number): string {
  return `${rate}×`;
}

/** Behavior core for the playback rate menu — surfaces the rates list and applies selection. */
export class PlaybackRateMenuCore {
  /** Default values applied when a prop is omitted. */
  static readonly defaultProps: NonNullableObject<PlaybackRateMenuProps> = {
    label: '',
    formatRate: formatPlaybackRate,
    disabled: false,
  };

  /** Reactive state container. */
  readonly state = createState<PlaybackRateMenuState>({
    rate: 1,
    rates: [],
    disabled: false,
    label: '',
  });

  #props = { ...PlaybackRateMenuCore.defaultProps };
  #media: MediaPlaybackRateState | null = null;

  /** @param props - Initial props (merged with defaults). */
  constructor(props?: PlaybackRateMenuProps) {
    if (props) this.setProps(props);
  }

  setProps(props: PlaybackRateMenuProps): void {
    this.#props = defaults(props, PlaybackRateMenuCore.defaultProps);
  }

  /** Resolve the menu trigger's ARIA label from props and state. */
  getLabel(state: PlaybackRateMenuState): string {
    const { label } = this.#props;

    if (isFunction(label)) {
      const customLabel = label(state);
      if (customLabel) return customLabel;
    } else if (label) {
      return label;
    }

    return `Playback rate ${state.rate}`;
  }

  /** Format a single playback rate for display as a menu item. */
  getRateLabel(rate: number): string {
    return this.#props.formatRate(rate);
  }

  /** Serialize a rate to the string value used to identify the menu item. */
  getRateValue(rate: number): string {
    return String(rate);
  }

  getAttrs(state: PlaybackRateMenuState) {
    return {
      'aria-label': this.getLabel(state),
      'aria-disabled': state.disabled ? 'true' : undefined,
    };
  }

  setMedia(media: MediaPlaybackRateState): void {
    this.#media = media;
  }

  getState(): PlaybackRateMenuState {
    const media = this.#media!;

    this.state.patch({
      rate: media.playbackRate,
      rates: media.playbackRates,
      disabled: this.#props.disabled || media.playbackRates.length === 0,
    });
    this.state.patch({ label: this.getLabel(this.state.current) });

    return this.state.current;
  }

  /** Apply a rate from the allowed list (no-op when disabled or unsupported). */
  select(media: MediaPlaybackRateState, rate: number): void {
    if (this.#props.disabled) return;
    if (!media.playbackRates.includes(rate)) return;

    media.setPlaybackRate(rate);
  }

  /** Apply a rate by its string menu-item value. */
  selectValue(media: MediaPlaybackRateState, value: string): void {
    const rate = media.playbackRates.find((candidate) => this.getRateValue(candidate) === value);
    if (isUndefined(rate)) return;

    this.select(media, rate);
  }
}

export namespace PlaybackRateMenuCore {
  /** Alias for {@link PlaybackRateMenuProps}. */
  export type Props = PlaybackRateMenuProps;
  /** Alias for {@link PlaybackRateMenuState}. */
  export type State = PlaybackRateMenuState;
}
