import '@app/styles.css';

// SPF Background Looping Video — sandbox demo
// http://localhost:5173/spf-background-looping-video/
//
// Drives `BackgroundLoopingVideoMediaElement`. The diagnostic strip
// surfaces three signals reviewers should verify:
//   - loadActivated is true from frame 0 (no preload-gate or play-event needed)
//   - the picker honors `maxResolution` (defaults to the highest variant)
//   - audio-side actors are absent from the engine context (subtraction proof)
//
// Rendition selection is driven by `maxResolution` on the adapter. The
// rendition list is read-only; it shows the available tracks and
// highlights the one the picker chose. Changing `maxResolution` just
// stashes the new value — clicking Load reassigns `src`, which cycles
// the presentation through `unresolved → resolved` and re-fires the
// closure picker (so the new cap takes effect on the live engine,
// without a rebuild).

import { SOURCES } from '@app/shared/sources';
import { effect, snapshot } from '@videojs/spf';
import type { BackgroundLoopingVideoEngineState } from '@videojs/spf/background-looping-video';
import { BackgroundLoopingVideoMediaElement } from '@videojs/spf/background-looping-video';

// ── DOM refs ──────────────────────────────────────────────────────────────────
const video = document.getElementById('bg-video') as HTMLVideoElement;
const sourceSelect = document.getElementById('source-select') as HTMLSelectElement;
const renditionButtons = document.getElementById('rendition-buttons') as HTMLDivElement;
const maxResolutionSelect = document.getElementById('max-resolution-select') as HTMLSelectElement;
const loadBtn = document.getElementById('load-btn') as HTMLButtonElement;
const diagLoad = document.getElementById('diag-load') as HTMLSpanElement;
const diagRendition = document.getElementById('diag-rendition') as HTMLSpanElement;
const diagContext = document.getElementById('diag-context') as HTMLSpanElement;

// ── Source picker ─────────────────────────────────────────────────────────────
// The SPF MSE pipeline appends fMP4/CMAF segments directly (no MPEG-TS
// transmuxing), so only fMP4 HLS sources play — exclude `.ts` and live.
const HLS_SOURCE_IDS = (Object.keys(SOURCES) as Array<keyof typeof SOURCES>).filter((id) => {
  const source = SOURCES[id] as { type: string; subType?: string; live?: boolean };
  return source.type === 'hls' && source.subType === 'mp4' && !source.live;
});
const DEFAULT_ID = (HLS_SOURCE_IDS[0] ?? 'hls-1') as keyof typeof SOURCES;

for (const id of HLS_SOURCE_IDS) {
  const option = document.createElement('option');
  option.value = id;
  option.textContent = SOURCES[id].label;
  if (id === DEFAULT_ID) option.selected = true;
  sourceSelect.appendChild(option);
}

// ── Renditions ────────────────────────────────────────────────────────────────
type MaybePresentation = BackgroundLoopingVideoEngineState['presentation'];

function videoTracksOf(presentation: MaybePresentation) {
  return presentation?.selectionSets?.find((s) => s.type === 'video')?.switchingSets[0]?.tracks ?? [];
}

type VideoTrack = ReturnType<typeof videoTracksOf>[number];

// Sandbox-local stable rendition id. The engine regenerates track ids on every
// parse, so a captured engine id is dead after a rebuild — this survives.
function stableTrackId(track: VideoTrack): string {
  const w = 'width' in track && typeof track.width === 'number' ? track.width : 0;
  const h = 'height' in track && typeof track.height === 'number' ? track.height : 0;
  return `${w}x${h}@${track.bandwidth}`;
}

function trackDimensions(track: VideoTrack): { w: number; h: number } {
  const w = 'width' in track && typeof track.width === 'number' ? track.width : 0;
  const h = 'height' in track && typeof track.height === 'number' ? track.height : 0;
  return { w, h };
}

// ── Adapter lifecycle ─────────────────────────────────────────────────────────
let currentSourceId: keyof typeof SOURCES = DEFAULT_ID;
let currentMaxResolution: string | undefined;
let adapter!: BackgroundLoopingVideoMediaElement;
let stopDiag: () => void = () => {};

function rebuildAdapter(): void {
  // Pause before teardown so the in-flight play() doesn't reject with
  // AbortError when the next engine swaps the MediaSource on this element.
  video.pause();
  adapter?.destroy();

  adapter = new BackgroundLoopingVideoMediaElement({ config: { maxResolution: currentMaxResolution } });
  // src before attach: the engine starts resolving the presentation before
  // play() (called inside attach) runs, so no teardown races the play promise.
  adapter.src = SOURCES[currentSourceId].url;
  adapter.attach(video);

  (window as any).adapter = adapter;
  stopDiag();
  stopDiag = attachDiagnostic();
}

// `state` / `context` read `adapter` lazily — the `let` binding always
// resolves to the current instance after a rebuild.
(window as any).state = () => snapshot(adapter.engine.state);
(window as any).context = () => snapshot(adapter.engine.context);

// The diagnostic effect re-fires on every state change (currentTime ticks,
// segment loads), but the list only depends on the track set + the
// current selection. Skip DOM rebuild when neither changed.
let lastRenditionSignature = '';

rebuildAdapter();

sourceSelect.addEventListener('change', () => {
  currentSourceId = sourceSelect.value as keyof typeof SOURCES;
  rebuildAdapter();
});

maxResolutionSelect.addEventListener('change', () => {
  currentMaxResolution = maxResolutionSelect.value || undefined;
  // Closure picker reads `#maxResolution` at pick time, so the setter
  // just stashes the value. Use the Load button to reassign src and
  // force a re-pick.
  adapter.maxResolution = currentMaxResolution;
});

loadBtn.addEventListener('click', () => {
  // Reassign src to cycle the presentation through
  // `unresolved → resolved`. That re-fires the picker, which reads the
  // current `maxResolution` via the adapter's closure.
  adapter.src = SOURCES[currentSourceId].url;
});

// ── Diagnostic strip + rendition picker ──────────────────────────────────────
function formatBandwidth(bps: number): string {
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(1)} Mbps`;
  return `${Math.round(bps / 1000)} Kbps`;
}

function attachDiagnostic(): () => void {
  return effect(() => {
    const state = snapshot(adapter.engine.state);
    const context = snapshot(adapter.engine.context);

    diagLoad.textContent = state.loadActivated ? 'true' : 'false';
    diagLoad.className = `val ${state.loadActivated ? 'ok' : ''}`;

    const tracks = videoTracksOf(state.presentation);
    const selected = tracks.find((t) => t.id === state.selectedVideoTrackId);
    if (selected) {
      const { w, h } = trackDimensions(selected);
      const res = w && h ? `${w}x${h} ` : '';
      diagRendition.textContent = `${res}${formatBandwidth(selected.bandwidth)}`;
      diagRendition.className = 'val ok';
    } else {
      diagRendition.textContent = '—';
      diagRendition.className = 'val';
    }

    // List the context keys present at runtime — the absence of any audio-side
    // actor key is the visible subtraction proof.
    const keys = Object.keys(context).filter((k) => (context as Record<string, unknown>)[k] !== undefined);
    diagContext.textContent = keys.length ? keys.join(', ') : '—';

    renderRenditionList(tracks, state.selectedVideoTrackId);
  });
}

function renditionSignature(tracks: VideoTrack[], selectedId: string | undefined): string {
  return `${selectedId ?? '—'}#${tracks.map(stableTrackId).join(',')}`;
}

function renderRenditionList(tracks: VideoTrack[], selectedId: string | undefined): void {
  const signature = renditionSignature(tracks, selectedId);
  if (signature === lastRenditionSignature) return;
  lastRenditionSignature = signature;

  renditionButtons.innerHTML = '';
  if (tracks.length === 0) return;

  // Sort by area desc so the list reads top-down high-to-low.
  const sorted = [...tracks].sort((a, b) => {
    const da = trackDimensions(a);
    const db = trackDimensions(b);
    const areaA = da.w * da.h;
    const areaB = db.w * db.h;
    if (areaB !== areaA) return areaB - areaA;
    return b.bandwidth - a.bandwidth;
  });

  for (const track of sorted) {
    const { w, h } = trackDimensions(track);
    const row = document.createElement('div');
    row.className = 'rendition';
    const tier = h ? `${h}p` : '—';
    const dims = w && h ? ` · ${w}x${h}` : '';
    row.textContent = `${tier} - ${formatBandwidth(track.bandwidth)}${dims}`;
    row.title = stableTrackId(track);
    if (track.id === selectedId) row.classList.add('selected');
    renditionButtons.appendChild(row);
  }
}
