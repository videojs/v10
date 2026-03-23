import type { PlaybackEngineConfig } from './engine';
import { createPlaybackEngine, type PlaybackEngine } from './engine';

/**
 * HTMLMediaElement-compatible adapter for the SPF playback engine.
 *
 * Implements the src/play() contract per the WHATWG HTML spec so that SPF can
 * be used anywhere a media element API is expected.
 *
 * A new engine is created on every src assignment — this fully tears down all
 * state, SourceBuffers, and in-flight requests from the previous source before
 * the next one begins. The media element reference is preserved across src
 * changes and re-applied to the new engine automatically.
 *
 * @example
 * const media = new SpfMedia({ preferredAudioLanguage: 'en' });
 * media.attach(document.querySelector('video'));
 * media.src = 'https://stream.mux.com/abc123.m3u8';
 *
 * // Change source — old engine is destroyed, new one starts clean:
 * media.src = 'https://stream.mux.com/xyz456.m3u8';
 *
 * // Explicit teardown:
 * media.destroy();
 */
export class SpfMedia {
  #engine: PlaybackEngine;
  #config: PlaybackEngineConfig;
  #preload: '' | 'none' | 'metadata' | 'auto' = '';

  /** Pending loadstart listener from a deferred play() retry, if any. */
  #loadstartListener: (() => void) | null = null;

  constructor(config: PlaybackEngineConfig = {}) {
    this.#config = config;
    this.#engine = createPlaybackEngine(config);
  }

  get engine(): PlaybackEngine {
    return this.#engine;
  }

  // ---------------------------------------------------------------------------
  // Media element lifecycle
  // ---------------------------------------------------------------------------

  attach(mediaElement: HTMLMediaElement): void {
    this.#engine.owners.patch({ mediaElement });
  }

  detach(): void {
    this.#cancelPendingPlay();
    this.#engine.owners.patch({ mediaElement: undefined });
  }

  destroy(): void {
    this.#cancelPendingPlay();
    this.#engine.destroy();
  }

  // ---------------------------------------------------------------------------
  // preload — synchronous IDL attribute (WHATWG §4.8.11.2)
  // ---------------------------------------------------------------------------

  get preload(): '' | 'none' | 'metadata' | 'auto' {
    return this.#preload;
  }

  set preload(value: '' | 'none' | 'metadata' | 'auto') {
    this.#preload = value;
    if (value) {
      this.#engine.state.patch({ preload: value });
    }
    // value = '' clears #preload (so the next engine recreation won't re-apply
    // an explicit value) but does not patch current state — the existing preload
    // stays in effect until the next src change creates a fresh engine.
  }

  // ---------------------------------------------------------------------------
  // src — synchronous IDL attribute (WHATWG §4.8.11.2)
  // Each assignment destroys the current engine and starts a fresh one, exactly
  // as the browser's load algorithm resets all media element state on src change.
  // ---------------------------------------------------------------------------

  get src(): string {
    return this.#engine.state.current.presentation?.url ?? '';
  }

  set src(value: string) {
    const prevMediaElement = this.#engine.owners.current.mediaElement;

    this.#cancelPendingPlay();
    this.#engine.destroy();
    this.#engine = createPlaybackEngine(this.#config);

    // Apply explicit preload before owners.patch so syncPreloadAttribute skips
    // element inference and the explicit value is preserved across src changes.
    if (this.#preload) {
      this.#engine.state.patch({ preload: this.#preload });
    }

    if (prevMediaElement) {
      this.#engine.owners.patch({ mediaElement: prevMediaElement });
    }

    if (value) {
      this.#engine.state.patch({ presentation: { url: value } });
    }
  }

  // ---------------------------------------------------------------------------
  // play() — WHATWG §4.8.11.8
  // Delegates to the attached media element's native play().
  // ---------------------------------------------------------------------------

  play(): Promise<void> {
    const { mediaElement } = this.#engine.owners.current;
    if (!mediaElement) {
      return Promise.reject(new Error('SpfMedia: no media element attached'));
    }

    // Signal play intent — enables loading even with preload="none"
    this.#engine.state.patch({ playbackInitiated: true });

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
    const { mediaElement } = this.#engine.owners.current;
    mediaElement?.removeEventListener('loadstart', this.#loadstartListener);
    this.#loadstartListener = null;
  }
}
