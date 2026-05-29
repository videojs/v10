import type { LevelLoadedData } from 'hls.js';
import Hls from 'hls.js';
import { installExtension, type MediaExtension } from '../../../core/media/media-extension';
import { addLayer } from '../../../core/media/media-layer';
import { type MediaStreamType, MediaStreamTypes } from '../../../core/media/types';
import { HTMLMediaElementLayer } from '../html-media-element-layer';
import type { HTMLVideoElementHost } from '../html-video-element-host';

/**
 * Derives `streamType` from hls.js `LEVEL_LOADED` events: `data.details.live`
 * → `LIVE`, otherwise `ON_DEMAND`. Resets to `UNKNOWN` on `MANIFEST_LOADING`
 * and `DESTROYING`. Setting `streamType` to anything other than `UNKNOWN`
 * locks in the user override; setting it to `UNKNOWN` returns control to
 * detection.
 *
 * @example hlsJsStreamType().install(media);
 */
class HlsJsStreamType implements MediaExtension {
  #destroy: () => void = () => {};

  install(media: HTMLVideoElementHost<Hls>) {
    const { engine } = media;
    if (!engine) return;

    const uninstall = installExtension(hlsJsStreamType, media, this);

    const layer = new HlsJsStreamTypeLayer();
    const removeLayer = addLayer(media, layer);

    const onLevelLoaded = (_event: string, data: LevelLoadedData) => {
      layer.setDetected(data.details.live ? MediaStreamTypes.LIVE : MediaStreamTypes.ON_DEMAND);
    };
    const onReset = () => layer.setDetected(MediaStreamTypes.UNKNOWN);

    engine.on(Hls.Events.MANIFEST_LOADING, onReset);
    engine.on(Hls.Events.DESTROYING, onReset);
    engine.on(Hls.Events.LEVEL_LOADED, onLevelLoaded);

    this.#destroy = () => {
      uninstall();
      engine.off(Hls.Events.MANIFEST_LOADING, onReset);
      engine.off(Hls.Events.DESTROYING, onReset);
      engine.off(Hls.Events.LEVEL_LOADED, onLevelLoaded);
      removeLayer();
    };
  }

  destroy() {
    this.#destroy();
    this.#destroy = () => {};
  }
}

export function hlsJsStreamType() {
  return new HlsJsStreamType();
}

class HlsJsStreamTypeLayer extends HTMLMediaElementLayer {
  #streamType: MediaStreamType = MediaStreamTypes.UNKNOWN;
  #userOverride = false;

  override get streamType(): MediaStreamType {
    return this.#streamType;
  }

  override set streamType(value: MediaStreamType) {
    if (value === MediaStreamTypes.UNKNOWN) {
      this.#userOverride = false;
      this.#update(MediaStreamTypes.UNKNOWN);
      return;
    }
    this.#userOverride = true;
    this.#update(value);
  }

  setDetected(value: MediaStreamType) {
    if (this.#userOverride) return;
    this.#update(value);
  }

  #update(value: MediaStreamType) {
    if (this.#streamType === value) return;
    this.#streamType = value;
    this.dispatchEvent(new Event('streamtypechange'));
  }
}
