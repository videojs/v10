import { createState } from '@videojs/store';
import { defaults } from '@videojs/utils/object';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaPlaybackState } from '../../media/state';

/** Props for the buffering indicator core. */
export interface BufferingIndicatorProps {
  /** Delay in milliseconds before the indicator becomes visible. */
  delay?: number | undefined;
}

/** Reactive state surfaced by the buffering indicator core. */
export interface BufferingIndicatorState {
  /** Whether the indicator should be visible. True after the delay elapses while media is waiting and not paused. */
  visible: boolean;
}

/** Behavior core for the buffering indicator — shows after a debounce while media is waiting. */
export class BufferingIndicatorCore {
  /** Default values applied when a prop is omitted. */
  static readonly defaultProps: NonNullableObject<BufferingIndicatorProps> = {
    delay: 500,
  };

  /** Reactive state container. */
  readonly state = createState<BufferingIndicatorState>({ visible: false });

  #props = { ...BufferingIndicatorCore.defaultProps };
  #timer: ReturnType<typeof setTimeout> | null = null;

  setProps(props: BufferingIndicatorProps): void {
    this.#props = defaults(props, BufferingIndicatorCore.defaultProps);
  }

  /** Cancel any pending debounce timer. */
  destroy(): void {
    this.#clearTimer();
  }

  /** Push the latest media playback state and update visibility (debounced). */
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
  /** Alias for {@link BufferingIndicatorProps}. */
  export type Props = BufferingIndicatorProps;
  /** Alias for {@link BufferingIndicatorState}. */
  export type State = BufferingIndicatorState;
}
