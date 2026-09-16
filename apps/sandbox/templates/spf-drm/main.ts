// SPF DRM smoke — the shared Mux DRM source through the standard HLS engine.
// http://localhost:5173/spf-drm/
//
// Supported query params:
//   drm=widevine|playready|fairplay   Configure only that key system, forcing
//                                     its negotiation on browsers with several
//                                     CDMs (Edge on Windows has Widevine AND
//                                     PlayReady; unfiltered, Widevine wins).
//   source=<SOURCES key>              Any DRM entry; defaults to `hls-drm`.
//                                     `hls-drm-ezdrm` is the second FairPlay
//                                     provider the AirPlay smoke wants.
import { restrictDrmSystems, SOURCES } from '@app/shared/sources';
import type { DrmSystemsConfig, HlsVideoEngineSignals } from '@videojs/spf/hls';
import { createHlsVideoEngine } from '@videojs/spf/hls';

const video = document.getElementById('video') as HTMLVideoElement;
const statusPre = document.getElementById('status') as HTMLPreElement;
const heading = document.getElementById('heading') as HTMLHeadingElement;
const subheading = document.getElementById('subheading') as HTMLParagraphElement;

const params = new URLSearchParams(location.search);

// The generic license-server flavor of the shared Mux DRM asset by default.
const sourceKey = params.get('source') ?? 'hls-drm';
const source = restrictDrmSystems(
  SOURCES[sourceKey as keyof typeof SOURCES]?.source as { src: string; drm: DrmSystemsConfig },
  params.get('drm')
) as { src: string; drm: DrmSystemsConfig };

// Say which source and which key systems are actually loaded — the page serves
// every DRM entry, so a fixed title just misreports whatever `?source=` picked.
const drmFilter = params.get('drm');

heading.textContent = `SPF DRM — ${SOURCES[sourceKey as keyof typeof SOURCES]?.label ?? sourceKey}`;
subheading.textContent = [
  `source=${sourceKey}`,
  `configured: ${Object.keys(source?.drm ?? {}).join(', ') || 'none'}`,
  drmFilter ? `drm=${drmFilter}` : null,
]
  .filter(Boolean)
  .join('  ·  ');

let signals!: HlsVideoEngineSignals;
const engine = createHlsVideoEngine({
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
//
// `mseKeys` vs `elementKeys` is the AirPlay handoff's invariant, readable at a
// glance. `mseKeys` is what `setupMediaKeys` published; `elementKeys` is
// whatever is actually attached. Outside a session they agree. During one the
// pair should read `false` / `true` — `setupMediaKeys` has yielded and
// `setupAirPlayFairPlay` is serving the receiver. `false` / `false` with a
// stalled `currentTime` means the receiver asked for nothing, or asked and was
// refused; check `errors`.
// Raw key-request tap, deliberately unfiltered — `setupAirPlayFairPlay` serves
// only `encrypted` events whose `initDataType` is `skd`, so a receiver whose
// request arrives any other way would be dropped with nothing to show for it.
// This says what actually fired. `webkitneedkey` is the discriminator: if it
// fires and `encrypted` does not, the sender's EME cannot serve the session at
// all and the deferred legacy `WebKitMediaKeys` path is the only thing that
// could — a different problem from anything in this composition.
for (const type of ['encrypted', 'webkitneedkey'] as const) {
  video.addEventListener(type, (event) => {
    const { initDataType, initData } = event as MediaEncryptedEvent;

    console.log(`[spf-drm] ${type}`, {
      initDataType: initDataType ?? '(none — legacy API)',
      initDataBytes: initData?.byteLength,
      wireless: (video as { webkitCurrentPlaybackTargetIsWireless?: boolean }).webkitCurrentPlaybackTargetIsWireless,
    });
  });
}

video.addEventListener('error', () => console.log('[spf-drm] element error', video.error?.code, video.error?.message));

/** The DRM/AirPlay facts. Split out because these change on edges, not per frame. */
const drmSnapshot = () => ({
  // WebKit's raw flag, then the session fact `setupAirPlay` derives from it.
  wireless: (video as { webkitCurrentPlaybackTargetIsWireless?: boolean }).webkitCurrentPlaybackTargetIsWireless,
  loadingSuspended: signals.state.loadingSuspended?.get(),
  segmentLoadingBlocked: signals.state.segmentLoadingBlocked.get(),
  negotiatedKeySystem: signals.state.negotiatedKeySystem.get(),
  mseKeys: Boolean(signals.context.mediaKeys.get()),
  elementKeys: Boolean(video.mediaKeys),
  errors: signals.state.errors.get()?.map((error) => error.code),
});

// An AirPlay pass is run at the device, not at the keyboard, and the live pane
// below repaints out from under a selection. So every *change* to the DRM facts
// is also logged — the console keeps a copyable transition log, and the
// interesting moments here are all edges.
let lastDrm = '';

setInterval(() => {
  const quality = video.getVideoPlaybackQuality?.();
  const drm = drmSnapshot();
  const serialized = JSON.stringify(drm);

  if (serialized !== lastDrm) {
    lastDrm = serialized;
    console.log(`[spf-drm] t=${video.currentTime.toFixed(2)}`, drm);
  }

  statusPre.textContent = JSON.stringify(
    {
      readyState: video.readyState,
      currentTime: video.currentTime.toFixed(2),
      videoSize: `${video.videoWidth}x${video.videoHeight}`,
      framesDecoded: quality?.totalVideoFrames,
      framesDropped: quality?.droppedVideoFrames,
      ...drm,
    },
    null,
    2
  );
}, 500);

Object.assign(window as object, { engine, signals, video });
