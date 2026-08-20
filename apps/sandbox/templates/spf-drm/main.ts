// SPF DRM smoke — Widevine vertical slice against the shared Mux DRM source.
// http://localhost:5173/spf-drm/
import { SOURCES } from '@app/shared/sources';
import type { DrmHlsVideoEngineSignals, DrmSystemsConfig } from '@videojs/spf/hls-drm';
import { createDrmHlsVideoEngine } from '@videojs/spf/hls-drm';

const video = document.getElementById('video') as HTMLVideoElement;
const statusPre = document.getElementById('status') as HTMLPreElement;

// The generic license-server flavor of the shared Mux DRM asset.
const source = SOURCES['hls-drm'].source as { src: string; drm: DrmSystemsConfig };

let signals!: DrmHlsVideoEngineSignals;
const engine = createDrmHlsVideoEngine({
  drm: source.drm,
  onSignalsReady: (refs) => {
    signals = refs;
  },
});

// preload before mediaElement: syncPreload reads the element's attribute when
// it first appears in context.
video.preload = 'auto';
signals.context.mediaElement.set(video);
signals.state.presentation.set({ url: source.src });

// Live status readout for the smoke probes (rendering, not just readyState).
setInterval(() => {
  const quality = video.getVideoPlaybackQuality?.();
  statusPre.textContent = JSON.stringify(
    {
      readyState: video.readyState,
      currentTime: video.currentTime.toFixed(2),
      videoSize: `${video.videoWidth}x${video.videoHeight}`,
      framesDecoded: quality?.totalVideoFrames,
      framesDropped: quality?.droppedVideoFrames,
      awaitingMediaKeys: signals.state.awaitingMediaKeys.get(),
      mediaKeysAttached: Boolean(video.mediaKeys),
      keySystem: video.mediaKeys ? 'attached' : 'none',
      errors: signals.state.errors.get()?.map((error) => error.code),
    },
    null,
    2
  );
}, 500);

Object.assign(window as object, { engine, signals, video });
