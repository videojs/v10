import type { LevelLoadedData } from 'hls.js';
import Hls from 'hls.js';

import { type Delegate, DelegateMixin } from '../../../core/media/delegate';
import { CustomMediaMixin } from '../custom-media-element';
import { HlsMediaTextTracksMixin } from '../hls/text-tracks';
import { MediaProxyMixin } from '../proxy';
import { MuxCapLevelController } from './cap-level-controller';
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

class MuxHlsMediaDelegateBase implements Delegate {
  #engine = Hls.isSupported() ? new Hls(muxHlsConfig) : null;
  #target: HTMLMediaElement | null = null;
  #streamInfo: StreamInfo = UNKNOWN_STREAM_INFO;

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

  attach(target: EventTarget): void {
    this.#target = target as HTMLMediaElement;
    this.#engine?.attachMedia(this.#target);
    this.#connectStreamInfo();
  }

  detach(): void {
    this.#disconnectStreamInfo();
    this.#engine?.detachMedia();
    this.#target = null;
  }

  destroy(): void {
    this.#disconnectStreamInfo();
    this.#engine?.destroy();
    this.#engine = null;
  }

  set src(src: string) {
    // Reset stream info when loading a new source.
    this.#streamInfo = UNKNOWN_STREAM_INFO;
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
}

const MuxHlsMediaDelegate = HlsMediaTextTracksMixin(MuxHlsMediaDelegateBase);

// Web component: needs to extend HTMLElement.
export class MuxCustomMedia extends DelegateMixin(
  CustomMediaMixin(globalThis.HTMLElement ?? class {}, { tag: 'video' }),
  MuxHlsMediaDelegate
) {}

// React: proxies to an attached EventTarget, no HTMLElement extension needed.
export class MuxMedia extends DelegateMixin(MediaProxyMixin, MuxHlsMediaDelegate) {}
