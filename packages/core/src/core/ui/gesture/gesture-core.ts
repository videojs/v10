import { defaults } from '@videojs/utils/object';

import type { MediaPlaybackState } from '../../media/state';

export const ALLOWED_TYPES = ['pointerup'] as const;
export const ALLOWED_COMMANDS = ['toggle-paused'] as const;

export interface GestureProps {
  type: (typeof ALLOWED_TYPES)[number];
  command: (typeof ALLOWED_COMMANDS)[number];
}

export class GestureCore {
  static readonly defaultProps: GestureProps = {
    type: ALLOWED_TYPES[0],
    command: ALLOWED_COMMANDS[0],
  };

  #props = { ...GestureCore.defaultProps };

  constructor(props?: GestureProps) {
    if (props) this.setProps(props);
  }

  setProps(props: GestureProps): void {
    this.#props = defaults(props, GestureCore.defaultProps);
  }

  async activate(media: MediaPlaybackState): Promise<void> {
    if (!ALLOWED_TYPES.includes(this.#props.type)) return;

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
