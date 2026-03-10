import { defaults } from '@videojs/utils/object';

import type { MediaPlaybackState } from '../../media/state';

export const ALLOWED_GESTURE_TYPES = ['pointerup'] as const;
export const ALLOWED_GESTURE_COMMANDS = ['toggle-paused'] as const;

export type GestureType = (typeof ALLOWED_GESTURE_TYPES)[number];
export type GestureCommand = (typeof ALLOWED_GESTURE_COMMANDS)[number];

export interface GestureProps {
  type: GestureType;
  command: GestureCommand;
}

export class GestureCore {
  static readonly defaultProps: GestureProps = {
    type: ALLOWED_GESTURE_TYPES[0],
    command: ALLOWED_GESTURE_COMMANDS[0],
  };

  #props = { ...GestureCore.defaultProps };

  constructor(props?: GestureProps) {
    if (props) this.setProps(props);
  }

  setProps(props: GestureProps): void {
    this.#props = defaults(props, GestureCore.defaultProps);
  }

  async activate(media: MediaPlaybackState): Promise<void> {
    if (!ALLOWED_GESTURE_TYPES.includes(this.#props.type)) return;

    if (this.#props.command === 'toggle-paused') {
      if (media.paused || media.ended) {
        return media.play();
      }
      media.pause();
    }
  }
}

export namespace GestureCore {
  export type Props = GestureProps;
}
