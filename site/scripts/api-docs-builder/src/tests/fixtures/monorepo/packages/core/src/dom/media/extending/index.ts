/**
 * Mock extending delegate — mirrors MuxMediaBase extending HlsMediaBase.
 *
 * Exercises: delegate inheritance. The builder must walk the extends chain
 * to extract properties from both this class and its parent (ComplexDelegate).
 * Child properties override parent properties of the same name.
 */
import { ComplexDelegate } from '../complex';

export class ExtendingDelegate extends ComplexDelegate {
  #playbackId: string = '';
  #customDomain: string = '';

  /** The playback ID for the video. */
  get playbackId(): string {
    return this.#playbackId;
  }

  set playbackId(value: string) {
    this.#playbackId = value;
  }

  /** Custom domain for asset delivery. */
  get customDomain(): string {
    return this.#customDomain;
  }

  set customDomain(value: string) {
    this.#customDomain = value;
  }

  /** Overrides parent debug — adds network logging. */
  get debug(): boolean {
    return super.debug;
  }

  set debug(value: boolean) {
    super.debug = value;
  }
}

export class ExtendingCustomMedia {}
