import { createState } from '@videojs/store';
import { defaults } from '@videojs/utils/object';

import type { MediaPlaybackState } from '../../media/state';
import { BUFFERING_INDICATOR_DEFAULT_PROPS, type BufferingIndicatorProps } from './props';

export interface BufferingIndicatorState {
  /** Whether the indicator should be visible. True after the delay elapses while media is waiting and not paused. */
  visible: boolean;
}

export class BufferingIndicatorCore {
  static readonly defaultProps = BUFFERING_INDICATOR_DEFAULT_PROPS;

  readonly state = createState<BufferingIndicatorState>({ visible: false });

  #props = { ...BufferingIndicatorCore.defaultProps };
  #timer: ReturnType<typeof setTimeout> | null = null;

  setProps(props: BufferingIndicatorProps): void {
    this.#props = defaults(props, BufferingIndicatorCore.defaultProps);
  }

  destroy(): void {
    this.#clearTimer();
  }

  update(media: MediaPlaybackState): void {
    const buffering = media.waiting && !media.paused;

    if (buffering && !this.state.current.visible && !this.#timer) {
      this.#timer = setTimeout(() => {
        this.#timer = null;
        this.state.patch({ visible: true });
      }, this.#props.delay);
    } else if (!buffering) {
      this.#clearTimer();
      this.state.patch({ visible: false });
    }
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

export type { BufferingIndicatorProps } from './props';
