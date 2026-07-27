/**
 * Mock base host for the mixin chain fixture.
 *
 * Exercises: parent class providing a JSDoc-described property that the
 * mixin chain may override without re-declaring the description (tests
 * description fallback through the chain).
 */
import { HTMLVideoElementHost } from '../simple';

export class MixinBaseHost extends HTMLVideoElementHost {
  #src: string = '';

  /** Source URL of the media. */
  get src(): string {
    return this.#src;
  }

  set src(value: string) {
    this.#src = value;
  }
}
