import '@app/styles.css';

// SPF Background Looping Video — Phase 1 demo
// http://localhost:5173/spf-background-looping-video/
//
// Drives the Phase 1 `BackgroundLoopingVideoMediaElement` adapter (the SPF
// surface added in this PR). The diagnostic strip surfaces three signals
// reviewers should verify:
//   - loadActivated is true from frame 0 (no preload-gate or play-event needed)
//   - the picker selects the highest-resolution rendition by default
//   - audio-side actors are absent from the engine context (subtraction proof)
//
// Rendition switching: the engine's own track ids come from generateId() and
// are regenerated on every manifest parse, so they don't survive the engine
// rebuild a switch triggers. This demo identifies renditions by a stable id
// derived from dimensions + bandwidth, and maps it back to the fresh engine
// id via a config `picker` on each rebuild. "Auto" passes no picker (engine
// default = max-resolution). The video is paused before teardown and `src` is
// set before `attach` so the in-flight play() doesn't reject with AbortError.

import { SOURCES } from '@app/shared/sources';
import { effect, snapshot } from '@videojs/spf';
import type { BackgroundLoopingVideoEngineState } from '@videojs/spf/background-looping-video';
import { BackgroundLoopingVideoMediaElement } from '@videojs/spf/background-looping-video';

// ── DOM refs ──────────────────────────────────────────────────────────────────
const video = document.getElementById('bg-video') as HTMLVideoElement;
const sourceSelect = document.getElementById('source-select') as HTMLSelectElement;
const renditionButtons = document.getElementById('rendition-buttons') as HTMLDivElement;
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
type PickerMode = { kind: 'auto' } | { kind: 'manual'; stableId: string };

let currentSourceId: keyof typeof SOURCES = DEFAULT_ID;
let pickerMode: PickerMode = { kind: 'auto' };
let adapter!: BackgroundLoopingVideoMediaElement;
let stopDiag: () => void = () => {};

function rebuildAdapter(): void {
  // Pause before teardown so the in-flight play() doesn't reject with
  // AbortError when the next engine swaps the MediaSource on this element.
  video.pause();
  adapter?.destroy();

  // Manual: a picker that maps our stable id to the fresh engine id in the
  // newly-parsed presentation. Auto: no picker → engine default (max-res).
  const stableId = pickerMode.kind === 'manual' ? pickerMode.stableId : undefined;
  const picker = stableId
    ? (presentation: MaybePresentation) => videoTracksOf(presentation).find((t) => stableTrackId(t) === stableId)?.id
    : undefined;

  adapter = new BackgroundLoopingVideoMediaElement(picker ? { config: { picker } } : undefined);
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
// segment loads), but the button list only depends on the track set and the
// selected mode. Skip the DOM rebuild when neither changed — otherwise every
// tick wipes hover/focus and churns nodes.
let lastRenditionSignature = '';

rebuildAdapter();

sourceSelect.addEventListener('change', () => {
  currentSourceId = sourceSelect.value as keyof typeof SOURCES;
  // Renditions differ across sources — reset to auto.
  pickerMode = { kind: 'auto' };
  rebuildAdapter();
});

function setPickerMode(mode: PickerMode): void {
  pickerMode = mode;
  rebuildAdapter();
}

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

    renderRenditionButtons(tracks);
  });
}

function renditionSignature(tracks: VideoTrack[]): string {
  const mode = pickerMode.kind === 'manual' ? `manual:${pickerMode.stableId}` : 'auto';
  return `${mode}#${tracks.map(stableTrackId).join(',')}`;
}

function renderRenditionButtons(tracks: VideoTrack[]): void {
  const signature = renditionSignature(tracks);
  if (signature === lastRenditionSignature) return;
  lastRenditionSignature = signature;

  renditionButtons.innerHTML = '';

  const autoBtn = document.createElement('button');
  autoBtn.type = 'button';
  autoBtn.textContent = 'Auto · max resolution';
  if (pickerMode.kind === 'auto') autoBtn.classList.add('selected');
  autoBtn.addEventListener('click', () => setPickerMode({ kind: 'auto' }));
  renditionButtons.appendChild(autoBtn);

  if (tracks.length === 0) return;

  // Sort by area desc so the picker reads top-down high-to-low.
  const sorted = [...tracks].sort((a, b) => {
    const da = trackDimensions(a);
    const db = trackDimensions(b);
    const areaA = da.w * da.h;
    const areaB = db.w * db.h;
    if (areaB !== areaA) return areaB - areaA;
    return b.bandwidth - a.bandwidth;
  });

  for (const track of sorted) {
    const id = stableTrackId(track);
    const { w, h } = trackDimensions(track);
    const btn = document.createElement('button');
    btn.type = 'button';
    const res = w && h ? `${w}x${h} · ` : '';
    btn.textContent = `${res}${formatBandwidth(track.bandwidth)}`;
    btn.title = id;
    if (pickerMode.kind === 'manual' && pickerMode.stableId === id) {
      btn.classList.add('selected');
    }
    btn.addEventListener('click', () => setPickerMode({ kind: 'manual', stableId: id }));
    renditionButtons.appendChild(btn);
  }
}
