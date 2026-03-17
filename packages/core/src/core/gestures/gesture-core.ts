import type { MediaPlaybackState } from '../media/state';

export type GesturePointerType = 'mouse' | 'touch';

export const PointerTypes = {
  MOUSE: 'mouse',
  PEN: 'pen',
  TOUCH: 'touch',
} as const;

export abstract class GestureCore {
  static readonly defaultProps: object = {};

  #media: MediaPlaybackState | null = null;

  get media(): MediaPlaybackState | null {
    return this.#media;
  }

  setMedia(media: MediaPlaybackState): void {
    this.#media = media;
  }

  abstract setProps(props: object): void;
  abstract handleGesture(event: { pointerType: string }): void;
}
