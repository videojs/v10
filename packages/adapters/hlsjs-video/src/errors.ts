import { MediaError } from '@videojs/media';
import type { Constructor, MixinReturn } from '@videojs/utils/types';
import type { ErrorData } from 'hls.js';
import Hls from 'hls.js';

import type { HlsEngineHost } from './types';

const hlsErrorTypeToCode: Record<string, number> = {
  [Hls.ErrorTypes.NETWORK_ERROR]: MediaError.MEDIA_ERR_NETWORK,
  [Hls.ErrorTypes.MEDIA_ERROR]: MediaError.MEDIA_ERR_DECODE,
  [Hls.ErrorTypes.KEY_SYSTEM_ERROR]: MediaError.MEDIA_ERR_ENCRYPTED,
  [Hls.ErrorTypes.MUX_ERROR]: MediaError.MEDIA_ERR_DECODE,
  [Hls.ErrorTypes.OTHER_ERROR]: MediaError.MEDIA_ERR_CUSTOM,
};

/**
 * Details a reload can actually resume: hls.js stopped mid-stream and picks up where it left off. Manifest-level
 * details are excluded, since `startLoad()` does not re-fetch a manifest and would leave the failure invisible.
 */
const RELOADABLE = new Set<string>([
  Hls.ErrorDetails.FRAG_LOAD_ERROR,
  Hls.ErrorDetails.FRAG_LOAD_TIMEOUT,
  Hls.ErrorDetails.LEVEL_LOAD_ERROR,
  Hls.ErrorDetails.LEVEL_LOAD_TIMEOUT,
  Hls.ErrorDetails.KEY_LOAD_ERROR,
  Hls.ErrorDetails.KEY_LOAD_TIMEOUT,
]);

/** Details a detach and re-attach can clear. A source whose codecs the decoder rejects is not one of them. */
const RECOVERABLE = new Set<string>([
  Hls.ErrorDetails.BUFFER_APPEND_ERROR,
  Hls.ErrorDetails.BUFFER_APPENDING_ERROR,
  Hls.ErrorDetails.BUFFER_STALLED_ERROR,
  Hls.ErrorDetails.FRAG_PARSING_ERROR,
]);

/** Consecutive failures to ride out before the condition is treated as terminal. */
const MAX_CONSECUTIVE = 3;

/** Attempts allowed for one source however much playback recovers in between, so a flapping stream still terminates. */
const MAX_PER_SOURCE = 8;

function retryDelay(attempt: number): number {
  return Math.min(1000 * 2 ** (attempt - 1), 8000);
}

export function HlsJsErrorsMixin<Base extends Constructor<HlsEngineHost>>(BaseClass: Base) {
  class HlsJsErrors extends BaseClass {
    #disconnect: AbortController | null = null;
    #error: MediaError | null = null;
    #retryTimer: ReturnType<typeof setTimeout> | null = null;

    // Deliberately outside #init: hls.js's own recoverMediaError() detaches and re-attaches the media, which runs
    // #init again, so counters kept there would refill themselves after every recovery and never terminate.
    #consecutive = 0;
    #perSource = 0;

    /** Set across the detach and re-attach that this mixin's own recovery causes, so it is not read as a teardown. */
    #recovering = false;

    constructor(...args: any[]) {
      super(...args);

      this.engine?.on(Hls.Events.MANIFEST_LOADING, () => {
        this.#consecutive = 0;
        this.#perSource = 0;
        this.#init();
      });
      this.engine?.on(Hls.Events.MEDIA_ATTACHED, () => {
        if (this.#recovering) {
          this.#recovering = false;

          return;
        }

        this.#init();
      });
      this.engine?.on(Hls.Events.MEDIA_DETACHED, () => {
        if (this.#recovering) return;

        this.#destroy();
      });
      this.engine?.on(Hls.Events.DESTROYING, () => this.#destroy());
    }

    get error(): MediaError | null {
      return this.#error;
    }

    #cancelRetry(): void {
      if (this.#retryTimer === null) return;

      clearTimeout(this.#retryTimer);
      this.#retryTimer = null;
    }

    #destroy(): void {
      this.#cancelRetry();
      this.#recovering = false;
      this.#disconnect?.abort();
      this.#disconnect = null;
    }

    #init(): void {
      this.#cancelRetry();
      this.#disconnect?.abort();
      this.#disconnect = new AbortController();

      const { engine, target } = this;
      if (!engine || !target) return;

      // A buffered fragment means the stream is flowing again, so the run of failures is over. The per-source count
      // is left alone: a stream that recovers and fails repeatedly still has to reach an end.
      const onProgress = () => {
        this.#consecutive = 0;
      };

      const onError = (_event: string, data: ErrorData) => {
        if (!data.fatal) return;

        // Hls.js parks the engine on a fatal error and leaves recovery to the application. Only the details each call
        // can actually clear are retried; anything else surfaces at once, as it did before.
        const canRetry = this.#consecutive < MAX_CONSECUTIVE && this.#perSource < MAX_PER_SOURCE;

        if (canRetry && data.type === Hls.ErrorTypes.NETWORK_ERROR && RELOADABLE.has(data.details)) {
          this.#consecutive += 1;
          this.#perSource += 1;
          this.#cancelRetry();
          this.#retryTimer = setTimeout(() => {
            this.#retryTimer = null;
            engine.startLoad();
          }, retryDelay(this.#consecutive));

          return;
        }

        if (canRetry && data.type === Hls.ErrorTypes.MEDIA_ERROR && RECOVERABLE.has(data.details)) {
          this.#consecutive += 1;
          this.#perSource += 1;
          this.#cancelRetry();

          // A second failure without playback in between usually means the decoder is rejecting the audio codec.
          if (this.#consecutive > 1) engine.swapAudioCodec();

          this.#recovering = true;
          engine.recoverMediaError();

          return;
        }

        // Terminal. Drop any reload still armed, or it fires behind the error the viewer is being shown.
        this.#cancelRetry();

        const code = hlsErrorTypeToCode[data.type] ?? MediaError.MEDIA_ERR_CUSTOM;
        const error = new MediaError(data.error?.message, code, true, data.details);

        error.data = data;

        this.#error = error;

        const event = new ErrorEvent('error', { error, message: error.message });

        this.dispatchEvent(event);
      };

      engine.on(Hls.Events.ERROR, onError);
      engine.on(Hls.Events.FRAG_BUFFERED, onProgress);

      this.#disconnect.signal.addEventListener(
        'abort',
        () => {
          engine.off(Hls.Events.ERROR, onError);
          engine.off(Hls.Events.FRAG_BUFFERED, onProgress);
          this.#error = null;
        },
        { once: true }
      );
    }
  }

  return HlsJsErrors as unknown as MixinReturn<Base, { readonly error: MediaError | null }>;
}
