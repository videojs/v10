import { defaults } from '@videojs/utils/object';

import type { MediaPlaybackState } from '../../media/state';

export type GestureType = (typeof ALLOWED_GESTURE_TYPES)[number];
export type GestureCommand = (typeof ALLOWED_GESTURE_COMMANDS)[number];

export interface GestureProps {
  type: GestureType;
  command: GestureCommand;
}

export const ALLOWED_GESTURE_TYPES = ['pointerup'] as const;
export const ALLOWED_GESTURE_COMMANDS = ['toggle-paused'] as const;

export const PointerTypes = {
  MOUSE: 'mouse',
  PEN: 'pen',
  TOUCH: 'touch',
} as const;

export class GestureCore {
  static readonly defaultProps: GestureProps = {
    type: ALLOWED_GESTURE_TYPES[0],
    command: ALLOWED_GESTURE_COMMANDS[0],
  };

  #props = { ...GestureCore.defaultProps };
  #media: MediaPlaybackState | null = null;

  setProps(props: GestureProps): void {
    this.#props = defaults(props, GestureCore.defaultProps);
  }

  setMedia(media: MediaPlaybackState): void {
    this.#media = media;
  }

  handleGesture({ pointerType }: { pointerType: string }): void {
    if (!this.#media) return;

    if (!ALLOWED_GESTURE_TYPES.includes(this.#props.type)) return;

    // TODO: Should `pointerType` be a prop that can be configured?
    if (pointerType && pointerType === PointerTypes.MOUSE) {
      if (this.#props.command === 'toggle-paused') {
        if (this.#media.paused || this.#media.ended) {
          this.#media.play();
          return;
        }
        this.#media.pause();
      }
    }
  }
}

export namespace GestureCore {
  export type Props = GestureProps;
}
