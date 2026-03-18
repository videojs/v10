import { GestureCore } from '../gesture/gesture-core';

export class PlayGestureCore extends GestureCore {
  override setProps(_props: object): void {}

  override handleGesture(): void {
    if (!this.media) return;

    if (this.media.paused || this.media.ended) {
      this.media.play();
      return;
    }
    this.media.pause();
  }
}
