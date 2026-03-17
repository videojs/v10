import { defaults } from '@videojs/utils/object';

import { GestureCore, type GesturePointerType, PointerTypes } from './gesture-core';

export interface PlayGestureProps {
  type: GesturePointerType;
}

export class PlayGestureCore extends GestureCore {
  static override readonly defaultProps: PlayGestureProps = {
    type: PointerTypes.MOUSE,
  };

  #props = { ...PlayGestureCore.defaultProps };

  override setProps(props: Partial<PlayGestureProps> & object): void {
    this.#props = defaults(props, PlayGestureCore.defaultProps);
  }

  override handleGesture({ pointerType }: { pointerType: string }): void {
    if (!this.media) return;
    if (!pointerType) return;
    if (pointerType !== this.#props.type) return;

    if (this.media.paused || this.media.ended) {
      this.media.play();
      return;
    }
    this.media.pause();
  }
}

export namespace PlayGestureCore {
  export type Props = PlayGestureProps;
}
