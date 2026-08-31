import {
  autoplayCapability,
  bufferCapability,
  contentDataCapability,
  controlsCapability,
  pauseCapability,
  playbackCapability,
  playbackRateCapability,
  playedCapability,
  playsInlineCapability,
  posterCapability,
  remotePlaybackCapability,
  seekCapability,
  sourceCapability,
  textTrackCapability,
  videoDimensionsCapability,
  volumeCapability,
} from '@videojs/media';
import { fullscreenCapability, pictureInPictureCapability } from '@videojs/media/dom/capabilities';
import { createMediaHost } from '@videojs/media/dom/media-host';
import type { WebKitDocument, WebKitPresentationMode, WebKitVideoElement } from '@videojs/utils/dom';
import { isFunction } from '@videojs/utils/predicate';

/**
 * EXPLORATION (do not merge as-is): the video-host capability set minus what the SPF adapter fully owns.
 *
 * `HlsVideoMediaMixin` implements `streamType`, `liveEdgeStart`, `targetLiveWindow`, and `error` itself, so the base
 * host's forwarders for those members are dead weight under the override — this composition simply leaves them out.
 * The adapter's other overrides (`src`, `preload`, `disableRemotePlayback`) shadow single members of capabilities the
 * host still needs for their remaining members, so those capabilities stay.
 */
export const spfVideoHostCapabilities = [
  playbackCapability,
  pauseCapability,
  seekCapability,
  sourceCapability,
  volumeCapability,
  playbackRateCapability,
  bufferCapability,
  playedCapability,
  textTrackCapability,
  contentDataCapability,
  remotePlaybackCapability,
  controlsCapability,
  autoplayCapability,
  posterCapability,
  playsInlineCapability,
  videoDimensionsCapability,
  pictureInPictureCapability,
  fullscreenCapability,
] as const;

const SpfVideoHostBase = createMediaHost(spfVideoHostCapabilities);

/**
 * EXPLORATION: duplicate of `HTMLVideoElementHost`'s unmanifestable remainder (webkit presentation API,
 * document-derived fullscreen/PiP state). A real change would export this remainder reusably from `@videojs/media`
 * rather than copying it — the copy is itself a finding.
 */
export class SpfVideoHost extends SpfVideoHostBase {
  get webkitCurrentPlaybackTargetIsWireless() {
    return (this.target as WebKitVideoElement | null)?.webkitCurrentPlaybackTargetIsWireless;
  }

  get webkitPresentationMode() {
    return (this.target as WebKitVideoElement | null)?.webkitPresentationMode;
  }

  get webkitSetPresentationMode(): ((mode: WebKitPresentationMode) => void) | undefined {
    const target = this.target as unknown as WebKitVideoElement | null;
    const fn = target?.webkitSetPresentationMode;

    return isFunction(fn) ? fn.bind(target) : undefined;
  }

  get isPictureInPicture(): boolean {
    const el = this.target as HTMLVideoElement | null;

    return (
      (!!el && globalThis.document?.pictureInPictureElement === el) ||
      this.webkitPresentationMode === 'picture-in-picture'
    );
  }

  get isFullscreen(): boolean {
    const el = this.target as HTMLVideoElement | null;
    if (!el) return false;

    if (this.webkitPresentationMode === 'fullscreen') return true;

    const doc = globalThis.document as WebKitDocument;

    return doc?.fullscreenElement === el || doc?.webkitFullscreenElement === el;
  }
}
