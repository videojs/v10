import { defaults } from '@videojs/utils/object';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaPlaybackState } from '../../media/state';

export interface BufferingIndicatorProps {
  /** Delay in milliseconds before the indicator becomes visible. */
  delay?: number | undefined;
}

export interface BufferingIndicatorState {
  visible: boolean;
}

const DEFAULT_DELAY = 500;

export class BufferingIndicatorCore {
  static readonly defaultProps: NonNullableObject<BufferingIndicatorProps> = {
    delay: DEFAULT_DELAY,
  };

  #props = { ...BufferingIndicatorCore.defaultProps };
  #visible = false;
  #timer: ReturnType<typeof setTimeout> | null = null;
  #onChange: (() => void) | null;

  constructor(onChange?: () => void) {
    this.#onChange = onChange ?? null;
  }

  setProps(props: BufferingIndicatorProps): void {
    this.#props = defaults(props, BufferingIndicatorCore.defaultProps);
  }

  getState(media: MediaPlaybackState): BufferingIndicatorState {
    const buffering = media.waiting && !media.paused;

    if (buffering && !this.#visible && !this.#timer) {
      this.#timer = setTimeout(() => {
        this.#timer = null;
        this.#visible = true;
        this.#onChange?.();
      }, this.#props.delay);
    } else if (!buffering) {
      this.#clearTimer();
      this.#visible = false;
    }

    return { visible: this.#visible };
  }

  destroy(): void {
    this.#clearTimer();
    this.#visible = false;
  }

  #clearTimer(): void {
    if (this.#timer !== null) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
  }
}

export namespace BufferingIndicatorCore {
  export type Props = BufferingIndicatorProps;
  export type State = BufferingIndicatorState;
}
