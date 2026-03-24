import type { ErrorData, LevelLoadedData } from 'hls.js';
import Hls from 'hls.js';

import { type Delegate, DelegateMixin } from '../../../core/media/delegate';
import { CustomMediaMixin } from '../custom-media-element';
import { HlsMediaTextTracksMixin } from '../hls/text-tracks';
import { MediaProxyMixin } from '../proxy';
import { MuxCapLevelController } from './cap-level-controller';
import { getErrorFromHlsErrorData, MuxErrorCode, type MuxMediaError } from './errors';
import { getStreamInfoFromLevelDetails, type StreamInfo } from './stream-info';

const muxHlsConfig = {
  backBufferLength: 30,
  renderTextTracksNatively: false,
  liveDurationInfinity: true,
  capLevelToPlayerSize: true,
  capLevelOnFPSDrop: true,
  capLevelController: MuxCapLevelController,
};

const UNKNOWN_STREAM_INFO: StreamInfo = {
  streamType: 'unknown',
  targetLiveWindow: NaN,
  liveEdgeOffset: NaN,
};

// Retry limits for NETWORK_NOT_READY (412) errors.
const MAX_412_RETRIES = 6;
const FIRST_RETRY_DELAY_MS = 5_000;
const SUBSEQUENT_RETRY_DELAY_MS = 60_000;

// Margin of error (seconds) for pseudo-ended detection.
const ENDED_MOE = 0.034;

class MuxHlsMediaDelegateBase implements Delegate {
  #engine = Hls.isSupported() ? new Hls(muxHlsConfig) : null;
  #target: HTMLMediaElement | null = null;
  #streamInfo: StreamInfo = UNKNOWN_STREAM_INFO;
  #retryCount = 0;
  #retryTimer: ReturnType<typeof setTimeout> | null = null;

  get engine(): Hls | null {
    return this.#engine;
  }

  get streamType(): StreamInfo['streamType'] {
    return this.#streamInfo.streamType;
  }

  get targetLiveWindow(): number {
    return this.#streamInfo.targetLiveWindow;
  }

  get liveEdgeOffset(): number {
    return this.#streamInfo.liveEdgeOffset;
  }

  get liveEdgeStart(): number {
    const liveSyncPosition = this.#engine?.liveSyncPosition ?? null;
    if (liveSyncPosition === null) return NaN;
    return liveSyncPosition - this.#streamInfo.liveEdgeOffset;
  }

  get ended(): boolean {
    const target = this.#target;
    if (!target) return false;
    // Trust the browser when it says ended.
    if (target.ended || target.loop) return target.ended;
    // Pseudo-ended: paused at (or past) the reported duration within a small margin.
    return target.paused && target.currentTime >= target.duration - ENDED_MOE;
  }

  attach(target: EventTarget): void {
    this.#target = target as HTMLMediaElement;
    this.#engine?.attachMedia(this.#target);
    this.#connectStreamInfo();
    this.#connectErrors();
  }

  detach(): void {
    this.#disconnectErrors();
    this.#disconnectStreamInfo();
    this.#engine?.detachMedia();
    this.#target = null;
  }

  destroy(): void {
    this.#disconnectErrors();
    this.#disconnectStreamInfo();
    this.#engine?.destroy();
    this.#engine = null;
  }

  set src(src: string) {
    this.#streamInfo = UNKNOWN_STREAM_INFO;
    this.#clearRetry();
    this.#retryCount = 0;
    if (this.#engine) {
      this.#engine.loadSource(src);
    } else if (this.#target) {
      // MSE not available — fall back to native HLS playback.
      this.#target.src = src;
    }
  }

  get src(): string {
    return this.#engine?.url ?? this.#target?.src ?? '';
  }

  // ── Stream info ────────────────────────────────────────────────────────────

  #connectStreamInfo(): void {
    const { engine } = this;
    if (!engine) return;
    engine.on(Hls.Events.LEVEL_LOADED, this.#onLevelLoaded);
  }

  #disconnectStreamInfo(): void {
    this.#engine?.off(Hls.Events.LEVEL_LOADED, this.#onLevelLoaded);
  }

  #onLevelLoaded = (_event: string, data: LevelLoadedData): void => {
    const streamInfo = getStreamInfoFromLevelDetails(data.details);
    const prev = this.#streamInfo;

    this.#streamInfo = streamInfo;

    const target = this.#target;
    if (!target) return;

    if (streamInfo.streamType !== prev.streamType) {
      target.dispatchEvent(new CustomEvent('streamtypechange', { detail: streamInfo.streamType }));
    }

    if (!Object.is(streamInfo.targetLiveWindow, prev.targetLiveWindow)) {
      target.dispatchEvent(new CustomEvent('targetlivewindowchange', { detail: streamInfo.targetLiveWindow }));
    }
  };

  // ── Error handling ─────────────────────────────────────────────────────────

  #connectErrors(): void {
    const { engine } = this;
    if (!engine) return;
    engine.on(Hls.Events.ERROR, this.#onHlsError);
  }

  #disconnectErrors(): void {
    this.#clearRetry();
    this.#engine?.off(Hls.Events.ERROR, this.#onHlsError);
  }

  #clearRetry(): void {
    if (this.#retryTimer !== null) {
      clearTimeout(this.#retryTimer);
      this.#retryTimer = null;
    }
  }

  #onHlsError = (_event: string, data: ErrorData): void => {
    // Non-fatal errors are informational only.
    if (!data.fatal) return;

    const error = getErrorFromHlsErrorData(data);
    this.#handleFatalError(error);
  };

  #handleFatalError(error: MuxMediaError): void {
    const target = this.#target;

    // 412 retry: content not ready yet (live stream not started, asset still processing).
    if (error.muxCode === MuxErrorCode.NETWORK_NOT_READY) {
      const retryCount = this.#retryCount;
      if (retryCount < MAX_412_RETRIES) {
        const delay = retryCount === 0 ? FIRST_RETRY_DELAY_MS : SUBSEQUENT_RETRY_DELAY_MS;
        this.#retryCount = retryCount + 1;
        this.#retryTimer = setTimeout(() => {
          this.#retryTimer = null;
          const currentSrc = this.#engine?.url ?? '';
          if (currentSrc) this.#engine?.loadSource(currentSrc);
        }, delay);
        // Dispatch a non-fatal notification so UIs can show "retrying…" state.
        target?.dispatchEvent(new CustomEvent('muxerror', { detail: error }));
        return;
      }
      // Exhausted retries — fall through to fatal dispatch.
      this.#retryCount = 0;
    }

    target?.dispatchEvent(new CustomEvent('muxerror', { detail: error }));
  }
}

const MuxHlsMediaDelegate = HlsMediaTextTracksMixin(MuxHlsMediaDelegateBase);

// Web component: needs to extend HTMLElement.
export class MuxCustomMedia extends DelegateMixin(
  CustomMediaMixin(globalThis.HTMLElement ?? class {}, { tag: 'video' }),
  MuxHlsMediaDelegate
) {}

// React: proxies to an attached EventTarget, no HTMLElement extension needed.
export class MuxMedia extends DelegateMixin(MediaProxyMixin, MuxHlsMediaDelegate) {}
