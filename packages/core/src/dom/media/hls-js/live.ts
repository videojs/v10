import type { LevelLoadedData } from 'hls.js';
import Hls from 'hls.js';
import { installExtension, type MediaExtension } from '../../../core/media/media-extension';
import { addLayer } from '../../../core/media/media-layer';
import { MediaStreamTypes } from '../../../core/media/types';
import type { HTMLVideoElementHost } from '../html-video-element-host';
import { HTMLVideoElementLayer } from '../html-video-element-layer';

type HlsPlaylistType = 'VOD' | 'EVENT' | null | undefined;

/**
 * Tracks live-stream metadata from hls.js for {@link MediaLiveCapability}:
 *
 * - `targetLiveWindow` — derived from playlist type, fires
 *   `targetlivewindowchange` when the value changes.
 * - `liveEdgeStart` — derived on every read from the current `seekable.end`
 *   and the manifest's `HOLD-BACK` / `PART-HOLD-BACK` (with per-spec fallbacks).
 *
 * Also tunes hls.js config for live / low-latency live and arms a one-shot
 * seek-to-live on the first user-initiated `play` (skipped when `autoplay`).
 *
 * @example hlsJsLive().install(media);
 */
class HlsJsLive implements MediaExtension {
  #destroy: (() => void) | null = null;

  install(media: HTMLVideoElementHost<Hls>) {
    const { engine } = media;
    if (!engine) return;

    const uninstall = installExtension(hlsJsLive, media, this);

    const layer = new HlsJsLiveLayer();
    const removeLayer = addLayer(media, layer);

    const onManifestLoading = () => {
      layer.reset();
      layer.armSeekToLive();
    };
    const onMediaAttached = () => layer.armSeekToLive();
    const onMediaDetached = () => layer.disarmSeekToLive();
    const onDestroying = () => {
      layer.reset();
      layer.disarmSeekToLive();
    };
    const onLevelLoaded = (_event: string, data: LevelLoadedData) => {
      layer.derive(engine, data.details);
    };

    engine.on(Hls.Events.MANIFEST_LOADING, onManifestLoading);
    engine.on(Hls.Events.MEDIA_ATTACHED, onMediaAttached);
    engine.on(Hls.Events.MEDIA_DETACHED, onMediaDetached);
    engine.on(Hls.Events.DESTROYING, onDestroying);
    engine.on(Hls.Events.LEVEL_LOADED, onLevelLoaded);

    this.#destroy = () => {
      uninstall();
      engine.off(Hls.Events.MANIFEST_LOADING, onManifestLoading);
      engine.off(Hls.Events.MEDIA_ATTACHED, onMediaAttached);
      engine.off(Hls.Events.MEDIA_DETACHED, onMediaDetached);
      engine.off(Hls.Events.DESTROYING, onDestroying);
      engine.off(Hls.Events.LEVEL_LOADED, onLevelLoaded);
      removeLayer();
    };
  }

  destroy() {
    this.#destroy?.();
    this.#destroy = null;
  }
}

export function hlsJsLive() {
  return new HlsJsLive();
}

class HlsJsLiveLayer extends HTMLVideoElementLayer {
  #targetLiveWindow = Number.NaN;
  #liveEdgeStartOffset: number | undefined;
  #seekToLiveAbort: AbortController | null = null;
  #seekToLivePending = false;

  override get targetLiveWindow() {
    return this.#targetLiveWindow;
  }

  // Derived from seekable + offset at read time. No cached state, no event.
  override get liveEdgeStart() {
    if (this.#liveEdgeStartOffset === undefined) return Number.NaN;
    const { seekable } = this;
    if (!seekable.length) return Number.NaN;
    return seekable.end(seekable.length - 1) - this.#liveEdgeStartOffset;
  }

  derive(engine: Hls, details: LevelLoadedData['details']) {
    if (!details.live) {
      this.reset();
      return;
    }

    const info = getStreamInfoFromHlsjsLevelDetails(details);
    this.#liveEdgeStartOffset = info.liveEdgeStartOffset;
    this.#updateConfig(engine, info);
    this.#setTargetLiveWindow(info.targetLiveWindow);
    // Deferred seek-to-live waits on `liveEdgeStart` becoming finite — retry now.
    if (this.#seekToLivePending) this.#trySeekToLive();
  }

  reset() {
    this.#liveEdgeStartOffset = undefined;
    this.#setTargetLiveWindow(Number.NaN);
  }

  /**
   * Arm a one-shot seek-to-live on the first user-initiated `play`. Skipped
   * when `autoplay` is set, since hls.js positions at the live edge during
   * its own startup sequence and a programmatic seek would race that.
   */
  armSeekToLive() {
    this.disarmSeekToLive();

    const { target } = this;
    if (!target || target.autoplay) return;

    this.#seekToLiveAbort = new AbortController();
    target.addEventListener(
      'play',
      () => {
        this.#seekToLivePending = true;
        this.#trySeekToLive();
      },
      { signal: this.#seekToLiveAbort.signal, once: true }
    );
  }

  disarmSeekToLive() {
    this.#seekToLiveAbort?.abort();
    this.#seekToLiveAbort = null;
    this.#seekToLivePending = false;
  }

  #trySeekToLive() {
    const { target } = this;
    if (!target) return;
    const { liveEdgeStart } = this;
    if (!Number.isFinite(liveEdgeStart)) return;

    if (target.currentTime < liveEdgeStart) {
      target.currentTime = liveEdgeStart;
    }
    this.#seekToLivePending = false;
  }

  #updateConfig(engine: Hls, { streamType, lowLatency }: StreamInfo) {
    if (streamType !== MediaStreamTypes.LIVE) return;

    if (lowLatency) {
      engine.config.backBufferLength = engine.userConfig.backBufferLength ?? 4;
      engine.config.maxFragLookUpTolerance = engine.userConfig.maxFragLookUpTolerance ?? 0.001;
      // For ll-hls, weight up-switches the same as down-switches to mitigate
      // getting stuck at lower bitrates.
      engine.config.abrBandWidthUpFactor = engine.userConfig.abrBandWidthUpFactor ?? engine.config.abrBandWidthFactor;
    } else {
      engine.config.backBufferLength = engine.userConfig.backBufferLength ?? 8;
    }
  }

  #setTargetLiveWindow(value: number) {
    if (Object.is(this.#targetLiveWindow, value)) return;
    this.#targetLiveWindow = value;
    this.dispatchEvent(new Event('targetlivewindowchange'));
  }
}

type StreamInfo = ReturnType<typeof getStreamInfoFromHlsjsLevelDetails>;

function getStreamInfoFromHlsjsLevelDetails(levelDetails: LevelLoadedData['details']) {
  const playlistType = levelDetails.type as HlsPlaylistType;
  const streamType = toStreamTypeFromPlaylistType(playlistType);
  const targetLiveWindow = toTargetLiveWindowFromPlaylistType(playlistType);
  const lowLatency = !!levelDetails.partList?.length;
  let liveEdgeStartOffset: number | undefined;

  if (streamType === MediaStreamTypes.LIVE) {
    // Prefer manifest-declared HOLD-BACK / PART-HOLD-BACK when present;
    // otherwise fall back to per-spec multiples of the target durations.
    // See https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis-12
    liveEdgeStartOffset = lowLatency
      ? levelDetails.partHoldBack || levelDetails.partTarget * 2
      : levelDetails.holdBack || levelDetails.targetduration * 3;
  }

  return { streamType, targetLiveWindow, liveEdgeStartOffset, lowLatency };
}

function toStreamTypeFromPlaylistType(playlistType: HlsPlaylistType) {
  return playlistType === 'VOD' ? MediaStreamTypes.ON_DEMAND : MediaStreamTypes.LIVE;
}

function toTargetLiveWindowFromPlaylistType(playlistType: HlsPlaylistType) {
  if (playlistType === 'EVENT') return Number.POSITIVE_INFINITY;
  if (playlistType === 'VOD') return Number.NaN;
  return 0;
}
