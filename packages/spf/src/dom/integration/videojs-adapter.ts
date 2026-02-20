import type { PlaybackEngineConfig } from '../playback-engine';
import { createPlaybackEngine, type PlaybackEngine } from '../playback-engine';

/**
 * HTMLMediaElement-compatible adapter for the SPF playback engine.
 *
 * Implements the src/play() contract per the WHATWG HTML spec so that SPF can
 * be used anywhere a media element API is expected.
 *
 * The engine is created once at construction and reused across src changes and
 * mediaElement swaps — attach/detach only update the owner reference.
 *
 * @example
 * const media = new SpfMedia({ preferredAudioLanguage: 'en' });
 * media.attach(document.querySelector('video'));
 * media.src = 'https://stream.mux.com/abc123.m3u8';
 *
 * // Later, swap element without recreating the engine:
 * media.attach(otherVideoElement);
 *
 * // Explicit teardown:
 * media.destroy();
 */
export class SpfMedia {
  readonly engine: PlaybackEngine;

  /** Pending loadstart listener from a deferred play() retry, if any. */
  #loadstartListener: (() => void) | null = null;

  constructor(config: PlaybackEngineConfig = {}) {
    this.engine = createPlaybackEngine(config);
  }

  // ---------------------------------------------------------------------------
  // Media element lifecycle
  // ---------------------------------------------------------------------------

  attach(mediaElement: HTMLMediaElement): void {
    this.engine.owners.patch({ mediaElement });
  }

  detach(): void {
    this.#cancelPendingPlay();
    this.engine.owners.patch({ mediaElement: undefined });
  }

  destroy(): void {
    this.#cancelPendingPlay();
    this.engine.destroy();
  }

  // ---------------------------------------------------------------------------
  // src — synchronous IDL attribute (WHATWG §4.8.11.2)
  // Setting src synchronously triggers the load algorithm via state patch.
  // The URL is derived from state — no separate field needed.
  // ---------------------------------------------------------------------------

  get src(): string {
    return this.engine.state.current.presentation?.url ?? '';
  }

  set src(value: string) {
    this.engine.state.patch({
      presentation: value ? { url: value } : undefined,
    });
  }

  // ---------------------------------------------------------------------------
  // play() — WHATWG §4.8.11.8
  // Delegates to the attached media element's native play().
  // ---------------------------------------------------------------------------

  play(): Promise<void> {
    const { mediaElement } = this.engine.owners.current;
    if (!mediaElement) {
      return Promise.reject(new Error('SpfMedia: no media element attached'));
    }

    // Signal play intent — enables loading even with preload="none"
    this.engine.state.patch({ playbackInitiated: true });

    return mediaElement.play().catch((err: unknown) => {
      // If we have a pending HLS source, the rejection may be because MSE
      // hasn't attached a blob URL yet. Wait for loadstart (src assigned
      // by MSE setup) and retry once.
      if (this.src) {
        return new Promise<void>((resolve, reject) => {
          const listener = () => {
            this.#loadstartListener = null;
            mediaElement.play().then(resolve, reject);
          };
          this.#loadstartListener = listener;
          mediaElement.addEventListener('loadstart', listener, { once: true });
        });
      }
      throw err;
    });
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  #cancelPendingPlay(): void {
    if (!this.#loadstartListener) return;
    const { mediaElement } = this.engine.owners.current;
    mediaElement?.removeEventListener('loadstart', this.#loadstartListener);
    this.#loadstartListener = null;
  }
}
