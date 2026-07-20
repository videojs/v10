import '@app/styles.css';
// SPF Segment Loading POC Test
// http://localhost:5173/spf-segment-loading/
//
// Supported query params:
//   src=<url>            Stream URL (overrides TEST_STREAM default)
//   muted=true           Start muted
//   autoplay=true        Start with autoplay enabled
//   preload=auto|metadata|none  Initial preload mode

import { effect, snapshot } from '@videojs/spf';
import type { SimpleHlsEngineSignals, SimpleHlsEngineState } from '@videojs/spf/hls';
import { createSimpleHlsEngine } from '@videojs/spf/hls';

// ── DOM refs ──────────────────────────────────────────────────────────────────
const video = document.getElementById('video') as HTMLVideoElement;
const logsDiv = document.getElementById('logs') as HTMLDivElement;
const stateDiv = document.getElementById('state') as HTMLDivElement;
const renditionButtonsDiv = document.getElementById('rendition-buttons') as HTMLDivElement;
const audioTrackButtonsDiv = document.getElementById('audio-track-buttons') as HTMLDivElement;
const textTrackButtonsDiv = document.getElementById('text-track-buttons') as HTMLDivElement;
const resolutionListDiv = document.getElementById('resolution-list') as HTMLDivElement;
const nowPlayingQualityDiv = document.getElementById('now-playing-quality') as HTMLDivElement;
const throughputDiv = document.getElementById('throughput-display') as HTMLDivElement;
const srcInput = document.getElementById('src-input') as HTMLInputElement;
const setSrcBtn = document.getElementById('set-src') as HTMLButtonElement;
const mutedToggle = document.getElementById('muted-toggle') as HTMLInputElement;
const autoplayToggle = document.getElementById('autoplay-toggle') as HTMLInputElement;
const preloadSelect = document.getElementById('preload-select') as HTMLSelectElement;
const shareLink = document.getElementById('share-link') as HTMLAnchorElement;

// ── Query params ──────────────────────────────────────────────────────────────
const DEFAULT_STREAM = 'https://stream.mux.com/JX01bG8eB4uaoV3OpDuK602rBfvdSgrMObjwuUOBn4JrQ.m3u8';
const params = new URLSearchParams(window.location.search);
const INITIAL_SRC = params.get('src') ?? DEFAULT_STREAM;
const INITIAL_MUTED = params.get('muted') === 'true';
const INITIAL_AUTOPLAY = params.get('autoplay') === 'true';
const INITIAL_PRELOAD = (params.get('preload') as 'auto' | 'metadata' | 'none') ?? 'none';

// Apply initial query-param values to UI
srcInput.value = INITIAL_SRC;
mutedToggle.checked = INITIAL_MUTED;
autoplayToggle.checked = INITIAL_AUTOPLAY;
preloadSelect.value = INITIAL_PRELOAD;
updateShareUrl();

// ── Helpers ───────────────────────────────────────────────────────────────────
function log(msg: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${msg}`);
  const div = document.createElement('div');
  div.className = type;
  div.textContent = `[${timestamp}] ${msg}`;
  logsDiv.appendChild(div);
  logsDiv.scrollTop = logsDiv.scrollHeight;
}

function formatBandwidth(bps: number): string {
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(1)} Mbps`;
  return `${Math.round(bps / 1000)} Kbps`;
}

function getVideoTracks(presentation: SimpleHlsEngineState['presentation']) {
  return presentation?.selectionSets?.find((s) => s.type === 'video')?.switchingSets[0]?.tracks ?? [];
}

function getAudioTracks(presentation: SimpleHlsEngineState['presentation']) {
  return presentation?.selectionSets?.find((s) => s.type === 'audio')?.switchingSets[0]?.tracks ?? [];
}

function getTextTracks(presentation: SimpleHlsEngineState['presentation']) {
  return presentation?.selectionSets?.find((s) => s.type === 'text')?.switchingSets[0]?.tracks ?? [];
}

// Drive the *native* TextTrack modes — what a captions button / browser UI
// touches — so a user selection flows through the syncTextTracks DOM→intent
// bridge (change event → userTextTrackSelection) rather than writing the SPF
// signal directly. `showId === undefined` disables all (Off).
function setNativeTextMode(showId: string | undefined) {
  const tt = video.textTracks;
  for (let i = 0; i < tt.length; i++) {
    const track = tt[i];
    if (!track || (track.kind !== 'subtitles' && track.kind !== 'captions')) continue;
    track.mode = track.id === showId ? 'showing' : 'disabled';
  }
}

// ── Display functions ─────────────────────────────────────────────────────────
function updateShareUrl() {
  const p = new URLSearchParams();
  const src = srcInput.value.trim();
  if (src && src !== DEFAULT_STREAM) p.set('src', src);
  if (mutedToggle.checked) p.set('muted', 'true');
  if (autoplayToggle.checked) p.set('autoplay', 'true');
  if (preloadSelect.value !== 'none') p.set('preload', preloadSelect.value);
  const url = `${window.location.origin}${window.location.pathname}${p.size > 0 ? `?${p}` : ''}`;
  shareLink.href = url;
  shareLink.textContent = url;
}

function updateNowPlayingQuality() {
  if (!engine) return;
  const segments = engine.context.videoBufferActor.get()?.snapshot.get().context.segments ?? [];
  const t = video.currentTime;
  const current = segments.find((s) => t >= s.startTime && t < s.startTime + s.duration);
  if (current?.trackBandwidth) {
    nowPlayingQualityDiv.textContent = `▶ Now playing: ${formatBandwidth(current.trackBandwidth)}`;
    nowPlayingQualityDiv.className = 'has-quality';
  } else {
    nowPlayingQualityDiv.textContent = '';
    nowPlayingQualityDiv.className = '';
  }
}

// Mirrors getBandwidthEstimate logic from bandwidth-estimator.ts.
// Raw fastEstimate/slowEstimate start near-zero because EWMA initialises at 0;
// zero-factor correction scales them back to the true estimate.
function correctedEstimate(estimate: number, totalWeight: number, halfLife: number): number {
  if (totalWeight === 0) return 0;
  const alpha = Math.exp(Math.log(0.5) / halfLife);
  return estimate / (1 - alpha ** totalWeight);
}

function updateThroughputDisplay() {
  if (!engine) return;
  const bs = engine.state.bandwidthState.get();
  if (!bs || bs.bytesSampled === 0) {
    throughputDiv.textContent = '📶 Throughput: no samples yet';
    throughputDiv.className = '';
    return;
  }
  const minBytes = 128_000;
  if (bs.bytesSampled < minBytes) {
    throughputDiv.textContent = `📶 Warming up: ${(bs.bytesSampled / 1000).toFixed(0)} KB sampled`;
    throughputDiv.className = 'warming';
    return;
  }
  const fast = correctedEstimate(bs.fastEstimate, bs.fastTotalWeight, 2);
  const slow = correctedEstimate(bs.slowEstimate, bs.slowTotalWeight, 5);
  const est = Math.min(fast, slow);
  throughputDiv.textContent = `📶 Est: ${formatBandwidth(est)}  (fast: ${formatBandwidth(fast)}, slow: ${formatBandwidth(slow)})`;
  throughputDiv.className = 'has-data';
}

// Signature of the currently-rendered video rendition set. Lets the picker
// rebuild its buttons only when the set actually changes — selection and ABR/
// manual changes update existing buttons in place (see renderRenditionPicker),
// so a click or hover isn't interrupted by a full DOM teardown on every ABR
// switch (selectedVideoTrackId changes frequently during playback).
let videoTrackSetKey = '';

function renderRenditionPicker() {
  if (!engine || !signals) return;
  const presentation = engine.state.presentation.get();
  const selectedVideoTrackId = engine.state.selectedVideoTrackId.get();
  const userFilter = engine.state.userVideoTrackSelection.get();
  const tracks = getVideoTracks(presentation);

  if (tracks.length === 0) {
    renditionButtonsDiv.textContent = presentation ? 'No video tracks found' : 'Waiting for presentation…';
    videoTrackSetKey = '';
    return;
  }

  // Selection pins by bitrate + resolution (see the click handler), not track
  // id, so redundant-stream renditions duplicated across CDNs share one
  // selection identity and are NOT independently selectable. Collapse to one
  // button per identity so the UI matches what selection actually guarantees.
  const groups = getVideoSelectionGroups(tracks);
  const setKey = groups.map((group) => group.key).join('|');
  if (setKey !== videoTrackSetKey) {
    videoTrackSetKey = setKey;
    buildVideoTrackButtons(groups);
  }
  updateVideoTrackSelection(tracks, selectedVideoTrackId, userFilter);
}

// One selectable video identity: a bitrate + resolution. `key` is exactly what
// the click handler pins on (as a partial-track filter), so highlighting and
// dedupe share one notion of identity.
interface VideoSelectionGroup {
  key: string;
  label: string;
  filter: { bandwidth: number; width?: number; height?: number };
  members: string[];
}

/** Stable bitrate+resolution identity for a video track (matches the pin filter). */
function videoSelectionKey(track: ReturnType<typeof getVideoTracks>[number]): string {
  const width = 'width' in track ? track.width : undefined;
  const height = 'height' in track ? track.height : undefined;
  return `${track.bandwidth}|${width ?? ''}×${height ?? ''}`;
}

/** Collapse video tracks to one entry per selection identity (bitrate + resolution). */
function getVideoSelectionGroups(tracks: ReturnType<typeof getVideoTracks>): VideoSelectionGroup[] {
  const groups = new Map<string, VideoSelectionGroup>();
  for (const track of tracks) {
    const key = videoSelectionKey(track);
    let group = groups.get(key);
    if (!group) {
      const width = 'width' in track ? track.width : undefined;
      const height = 'height' in track ? track.height : undefined;
      const res = width && height ? `${width}×${height} @ ` : '';
      const filter: VideoSelectionGroup['filter'] = { bandwidth: track.bandwidth };
      if (width) filter.width = width;
      if (height) filter.height = height;
      group = { key, label: `${res}${formatBandwidth(track.bandwidth)}`, filter, members: [] };
      groups.set(key, group);
    }
    // Member ids (one per CDN for redundant streams) are surfaced in the
    // tooltip so the collapsed renditions are still inspectable.
    group.members.push(track.id);
  }
  return [...groups.values()];
}

/** (Re)build the static button list — one per selection group, tagged with its key. */
function buildVideoTrackButtons(groups: VideoSelectionGroup[]) {
  renditionButtonsDiv.innerHTML = '';

  const statusRow = document.createElement('div');
  statusRow.id = 'video-status-row';
  statusRow.className = 'abr-status';
  renditionButtonsDiv.appendChild(statusRow);

  for (const group of groups) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.selectionKey = group.key;
    // Base label minus the selection badge; the badge is toggled in place.
    btn.dataset.label = group.label;
    btn.title =
      group.members.length > 1
        ? `${group.members.length} rendition(s) across CDNs: ${group.members.join(', ')}`
        : (group.members[0] ?? group.key);
    btn.addEventListener('click', () => {
      log(`Manual rendition select: ${JSON.stringify(group.filter)} (ABR disabled)`, 'warning');
      signals.state.userVideoTrackSelection.set(group.filter);
    });
    renditionButtonsDiv.appendChild(btn);
  }
}

/** Update the status row and per-button selected state without tearing down. */
function updateVideoTrackSelection(
  tracks: ReturnType<typeof getVideoTracks>,
  selectedVideoTrackId: string | undefined,
  userFilter: SimpleHlsEngineState['userVideoTrackSelection']
) {
  const isManual = userFilter !== undefined;

  const statusRow = document.getElementById('video-status-row');
  if (statusRow) {
    statusRow.innerHTML = '';
    const modeLabel = document.createElement('span');
    modeLabel.className = isManual ? 'mode-manual' : 'mode-abr';
    modeLabel.textContent = isManual ? `🔒 Manual: ${JSON.stringify(userFilter)}` : '⟳ ABR';
    statusRow.appendChild(modeLabel);
    if (isManual) {
      const enableBtn = document.createElement('button');
      enableBtn.type = 'button';
      enableBtn.className = 'enable-abr-btn';
      enableBtn.textContent = 'Enable ABR';
      enableBtn.addEventListener('click', () => {
        log('ABR re-enabled', 'success');
        signals.state.userVideoTrackSelection.set(undefined);
      });
      statusRow.appendChild(enableBtn);
    }
  }

  // The selected track belongs to a group keyed by its bitrate + resolution;
  // highlight that group's button.
  const selectedTrack = tracks.find((track) => track.id === selectedVideoTrackId);
  const selectedKey = selectedTrack ? videoSelectionKey(selectedTrack) : undefined;
  for (const btn of renditionButtonsDiv.querySelectorAll<HTMLButtonElement>('button[data-selection-key]')) {
    const isSelected = btn.dataset.selectionKey === selectedKey;
    btn.className = `rendition-btn${isSelected ? (isManual ? ' selected-manual' : ' selected-abr') : ''}`;
    const badge = isSelected ? (isManual ? ' 🔒' : ' ⟳') : '';
    btn.textContent = `${btn.dataset.label ?? ''}${badge}`;
  }
}

// Signature of the currently-rendered audio track set. Lets the picker rebuild
// its buttons only when the track set actually changes — selection and pin
// changes update existing buttons in place (see renderAudioTrackPicker) so a
// click or hover isn't interrupted by a full DOM teardown.
let audioTrackSetKey = '';

function renderAudioTrackPicker() {
  if (!engine || !signals) return;
  const presentation = engine.state.presentation.get();
  const selectedAudioTrackId = engine.state.selectedAudioTrackId.get();
  const userFilter = engine.state.userAudioTrackSelection.get();
  const tracks = getAudioTracks(presentation);

  if (tracks.length === 0) {
    audioTrackButtonsDiv.textContent = presentation ? 'No audio tracks found' : 'Waiting for presentation…';
    audioTrackSetKey = '';
    return;
  }

  // The picker pins by language (see the click handler / track-switching
  // behavior), so multiple same-language renditions are NOT independently
  // selectable — clicking the "med" variant still just pins the language.
  // Collapse to one button per selection identity so the UI matches what
  // selection actually guarantees.
  const groups = getAudioSelectionGroups(tracks);
  const setKey = groups.map((group) => group.key).join('|');
  if (setKey !== audioTrackSetKey) {
    audioTrackSetKey = setKey;
    buildAudioTrackButtons(groups);
  }
  updateAudioTrackSelection(tracks, selectedAudioTrackId, userFilter);
}

// One selectable audio identity: a language (when present) or a single track id.
// `key` is exactly what the click handler pins on, so highlighting and dedupe
// share one notion of identity.
interface AudioSelectionGroup {
  key: string;
  byLanguage: boolean;
  language?: string | undefined;
  label: string;
  members: string[];
}

/** Collapse audio tracks to one entry per selection identity (language, else id). */
function getAudioSelectionGroups(tracks: ReturnType<typeof getAudioTracks>): AudioSelectionGroup[] {
  const groups = new Map<string, AudioSelectionGroup>();
  for (const track of tracks) {
    const language = track.language || undefined;
    const key = language ?? track.id;
    let group = groups.get(key);
    if (!group) {
      const name = 'name' in track && track.name ? track.name : track.id;
      group = { key, byLanguage: !!language, language, label: `${language ?? '—'} · ${name}`, members: [] };
      groups.set(key, group);
    }
    // Member labels (bitrate, else groupId tier) are surfaced in the tooltip so
    // the collapsed renditions are still inspectable.
    const groupId = 'groupId' in track ? track.groupId : undefined;
    const tier = track.bandwidth ? formatBandwidth(track.bandwidth) : groupId;
    group.members.push(tier ?? track.id);
  }
  return [...groups.values()];
}

/** (Re)build the static button list — one per selection group, tagged with its key. */
function buildAudioTrackButtons(groups: AudioSelectionGroup[]) {
  audioTrackButtonsDiv.innerHTML = '';

  const statusRow = document.createElement('div');
  statusRow.id = 'audio-status-row';
  statusRow.className = 'audio-status';
  audioTrackButtonsDiv.appendChild(statusRow);

  for (const group of groups) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.selectionKey = group.key;
    // Base label minus the selection badge; the badge is toggled in place.
    btn.dataset.label = group.label;
    btn.title = group.byLanguage
      ? `language: ${group.language} · ${group.members.length} rendition(s): ${group.members.join(', ')}`
      : `id: ${group.key}`;
    btn.addEventListener('click', () => {
      const filter = group.byLanguage ? { language: group.language } : { id: group.key };
      log(
        `Audio track filter: ${JSON.stringify(filter)} — mid-stream flush will fire if language differs from buffered`,
        'warning'
      );
      signals.state.userAudioTrackSelection.set(filter);
    });
    audioTrackButtonsDiv.appendChild(btn);
  }
}

/** Update the status row and per-button selected state without tearing down. */
function updateAudioTrackSelection(
  tracks: ReturnType<typeof getAudioTracks>,
  selectedAudioTrackId: string | undefined,
  userFilter: SimpleHlsEngineState['userAudioTrackSelection']
) {
  const isPinned = userFilter !== undefined;

  const statusRow = document.getElementById('audio-status-row');
  if (statusRow) {
    statusRow.innerHTML = '';
    const modeLabel = document.createElement('span');
    modeLabel.className = isPinned ? 'mode-pinned' : 'mode-default';
    modeLabel.textContent = isPinned ? `🔒 Pinned: ${JSON.stringify(userFilter)}` : '🌐 Default pick';
    statusRow.appendChild(modeLabel);
    if (isPinned) {
      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.className = 'clear-filter-btn';
      clearBtn.textContent = 'Clear filter';
      clearBtn.addEventListener('click', () => {
        log('Cleared userAudioTrackSelection (back to default picker)', 'success');
        signals!.state.userAudioTrackSelection.set(undefined);
      });
      statusRow.appendChild(clearBtn);
    }
  }

  // The selected track belongs to a group keyed by its language (else its id);
  // highlight that group's button.
  const selectedTrack = tracks.find((track) => track.id === selectedAudioTrackId);
  const selectedKey = selectedTrack ? selectedTrack.language || selectedTrack.id : undefined;
  for (const btn of audioTrackButtonsDiv.querySelectorAll<HTMLButtonElement>('button[data-selection-key]')) {
    const isSelected = btn.dataset.selectionKey === selectedKey;
    btn.className = `audio-track-btn${isSelected ? (isPinned ? ' selected-pinned' : ' selected-default') : ''}`;
    const badge = isSelected ? (isPinned ? ' 🔒' : ' 🌐') : '';
    btn.textContent = `${btn.dataset.label ?? ''}${badge}`;
  }
}

// Subtitle/caption picker. Text selection changes are user-driven and
// infrequent, so this rebuilds the button list on each change (no build/update
// split like the audio picker, which fights frequent ABR churn).
//
// Off + language buttons drive the *native* TextTrack mode (like a captions
// button), so selection exercises the real syncTextTracks DOM→intent bridge.
// "Reset to auto" has no native-mode analog (it means "forget my preference"),
// so it writes userTextTrackSelection=undefined directly — the programmatic
// escape hatch. Highlighting reads the resolved selectedTextTrackId + intent.
function renderTextTrackPicker() {
  if (!engine || !signals) return;
  const presentation = engine.state.presentation.get();
  const selectedTextTrackId = engine.state.selectedTextTrackId.get();
  const intent = engine.state.userTextTrackSelection.get();
  const tracks = getTextTracks(presentation);

  if (tracks.length === 0) {
    textTrackButtonsDiv.textContent = presentation ? 'No text tracks found' : 'Waiting for presentation…';
    return;
  }

  const isOff = intent === 'off';
  const isPinned = intent !== undefined && intent !== 'off';
  const selectedTrack = tracks.find((track) => track.id === selectedTextTrackId);
  const selectedKey = selectedTrack ? selectedTrack.language || selectedTrack.id : undefined;

  textTrackButtonsDiv.innerHTML = '';

  // Status row: current intent (auto / pinned / off) + reset.
  const statusRow = document.createElement('div');
  statusRow.className = 'audio-status';
  const modeLabel = document.createElement('span');
  modeLabel.className = isPinned || isOff ? 'mode-pinned' : 'mode-default';
  modeLabel.textContent = isOff
    ? '🔇 Off (user)'
    : isPinned
      ? `🔒 Pinned: ${JSON.stringify(intent)}`
      : '🌐 Auto (default policy)';
  statusRow.appendChild(modeLabel);
  if (intent !== undefined) {
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'clear-filter-btn';
    resetBtn.textContent = 'Reset to auto';
    resetBtn.addEventListener('click', () => {
      log('Cleared userTextTrackSelection (back to default policy)', 'success');
      signals!.state.userTextTrackSelection.set(undefined);
    });
    statusRow.appendChild(resetBtn);
  }
  textTrackButtonsDiv.appendChild(statusRow);

  // Off button — explicit 'off' intent; highlighted whenever nothing resolves.
  const offBtn = document.createElement('button');
  offBtn.type = 'button';
  const offSelected = !selectedTextTrackId;
  offBtn.className = `audio-track-btn${offSelected ? (isOff ? ' selected-pinned' : ' selected-default') : ''}`;
  offBtn.textContent = `Off${offSelected ? (isOff ? ' 🔇' : ' 🌐') : ''}`;
  offBtn.addEventListener('click', () => {
    log('Disabling all text tracks via native mode (bridges to off intent)', 'warning');
    setNativeTextMode(undefined);
  });
  textTrackButtonsDiv.appendChild(offBtn);

  // One button per selection identity (language, else id).
  const seen = new Set<string>();
  for (const track of tracks) {
    const language = track.language || undefined;
    const key = language ?? track.id;
    if (seen.has(key)) continue;
    seen.add(key);

    const label = 'label' in track && track.label ? track.label : track.id;
    const isSelected = key === selectedKey;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `audio-track-btn${isSelected ? (isPinned ? ' selected-pinned' : ' selected-default') : ''}`;
    const badge = isSelected ? (isPinned ? ' 🔒' : ' 🌐') : '';
    btn.textContent = `${language ?? '—'} · ${label}${badge}`;
    btn.title = `kind: ${track.kind}${track.forced ? ' · forced' : ''} · id: ${track.id}`;
    btn.addEventListener('click', () => {
      log(`Showing ${language ?? track.id} via native mode (bridges to intent)`, 'warning');
      setNativeTextMode(track.id);
    });
    textTrackButtonsDiv.appendChild(btn);
  }
}

function renderResolutionStatus() {
  if (!engine) return;
  const presentation = engine.state.presentation.get();
  const tracks = getVideoTracks(presentation);

  if (tracks.length === 0) {
    resolutionListDiv.textContent = presentation ? 'No video tracks found' : 'Waiting for presentation…';
    return;
  }

  resolutionListDiv.innerHTML = '';
  for (const track of tracks) {
    const isResolved = 'segments' in track;
    const item = document.createElement('div');
    item.className = `resolution-item ${isResolved ? 'resolved' : 'unresolved'}`;
    const res = 'width' in track && track.width && track.height ? `${track.width}×${track.height} ` : '';
    item.textContent = `${isResolved ? '✓' : '○'} ${res}${formatBandwidth(track.bandwidth)}`;
    item.title = track.id;
    resolutionListDiv.appendChild(item);
  }
}

function inspectState() {
  if (!engine) {
    stateDiv.innerHTML = '<h2>State Inspector</h2><div class="error">Engine not initialized</div>';
    return;
  }
  const state = snapshot(engine.state);
  const ctx = snapshot(engine.context);

  const videoBufferRanges = ctx.videoBuffer
    ? Array.from(
        { length: ctx.videoBuffer.buffered.length },
        (_, i) =>
          `Range ${i}: ${ctx.videoBuffer!.buffered.start(i).toFixed(2)}s - ${ctx.videoBuffer!.buffered.end(i).toFixed(2)}s`
      ).join('\n  ')
    : 'N/A';

  const audioBufferRanges = ctx.audioBuffer
    ? Array.from(
        { length: ctx.audioBuffer.buffered.length },
        (_, i) =>
          `Range ${i}: ${ctx.audioBuffer!.buffered.start(i).toFixed(2)}s - ${ctx.audioBuffer!.buffered.end(i).toFixed(2)}s`
      ).join('\n  ')
    : 'N/A';

  stateDiv.innerHTML = `
    <h2>State Inspector</h2>

    <h3>Playback State</h3>
    <pre>${JSON.stringify(state, null, 2)}</pre>

    <h3>Context (SourceBuffers)</h3>
    <div>Video Buffer: ${ctx.videoBuffer ? '✓ Created' : '✗ Not created'}</div>
    <div>Audio Buffer: ${ctx.audioBuffer ? '✓ Created' : '✗ Not created'}</div>

    ${
      ctx.videoBuffer
        ? `
      <h4>Video Buffer State</h4>
      <div>Buffered ranges: ${ctx.videoBuffer.buffered.length}</div>
      <pre>${videoBufferRanges}</pre>
    `
        : ''
    }

    ${
      ctx.audioBuffer
        ? `
      <h4>Audio Buffer State</h4>
      <div>Buffered ranges: ${ctx.audioBuffer.buffered.length}</div>
      <pre>${audioBufferRanges}</pre>
    `
        : ''
    }

    <h3>MediaSource State</h3>
    <div>readyState: ${ctx.mediaSource?.readyState ?? 'N/A'}</div>

    <h3>Buffer Model (actor context)</h3>
    <div>Video segments loaded: ${ctx.videoBufferActor?.snapshot.get().context.segments.length ?? 0}</div>
    <div>Audio segments loaded: ${ctx.audioBufferActor?.snapshot.get().context.segments.length ?? 0}</div>

    <h3>Video Element State</h3>
    <div>readyState: ${video.readyState}</div>
    <div>networkState: ${video.networkState}</div>
    <div>currentTime: ${video.currentTime.toFixed(2)}s</div>
    <div>duration: ${video.duration}s</div>
    <div>paused: ${video.paused}</div>
    <div>ended: ${video.ended}</div>
  `;
}

// ── Engine lifecycle ───────────────────────────────────────────────────────────
log('=== SPF Segment Loading POC Test ===');
log(`Stream: ${INITIAL_SRC}`);

let engine: ReturnType<typeof createSimpleHlsEngine>;
let signals: SimpleHlsEngineSignals;
let cleanupEffects: () => void = () => {};

function startEngine(src: string) {
  cleanupEffects();
  if (engine) engine.destroy();

  engine = createSimpleHlsEngine({
    initialBandwidth: 1_000_000,
    onSignalsReady: (refs) => {
      signals = refs;
    },
  });
  (window as any).engine = engine;
  (window as any).signals = signals;
  (window as any).state = () => snapshot(engine.state);
  (window as any).context = () => snapshot(engine.context);

  // ── Reactive effects ───────────────────────────────────────────────────────

  // prev/prevContext track one-time transitions for logging purposes.
  // They are reset on each startEngine call so a new source logs correctly.
  const prev = {
    hasPresentation: false,
    selectedVideoTrackId: undefined as string | undefined,
    selectedAudioTrackId: undefined as string | undefined,
    selectedTextTrackId: undefined as string | undefined,
  };
  const prevContext = { hasMediaSource: false, hasVideoBuffer: false, hasAudioBuffer: false };

  // State logger. Text selection is driven by the Subtitles/Captions picker
  // (userTextTrackSelection intent) — no auto-select here, so the engine's real
  // opt-in default policy is what runs on load.
  const stopStateLogger = effect(() => {
    const state = snapshot(engine.state);

    if (state.presentation && !prev.hasPresentation) {
      log('Presentation resolved');
      prev.hasPresentation = true;
    }

    if (state.selectedVideoTrackId && state.selectedVideoTrackId !== prev.selectedVideoTrackId) {
      const mode = state.userVideoTrackSelection ? '(manual)' : '(ABR)';
      log(`Video track selected ${mode}: ${state.selectedVideoTrackId}`);
      prev.selectedVideoTrackId = state.selectedVideoTrackId;
    }
    if (state.selectedAudioTrackId && state.selectedAudioTrackId !== prev.selectedAudioTrackId) {
      log(`Audio track selected: ${state.selectedAudioTrackId}`);
      prev.selectedAudioTrackId = state.selectedAudioTrackId;
    }
    if (state.selectedTextTrackId && state.selectedTextTrackId !== prev.selectedTextTrackId) {
      log(`Text track selected: ${state.selectedTextTrackId}`, 'success');
      prev.selectedTextTrackId = state.selectedTextTrackId;
    }
  });

  // One effect per UI region, each auto-tracking only the signals its renderer
  // reads. The previous single effect snapshotted *all* of engine.state, so
  // high-frequency fields (currentTime, bandwidthState) re-fired every renderer
  // many times a second — and the picker's full innerHTML rebuild interrupted
  // clicks/hover. Now the audio picker re-runs only on presentation /
  // selectedAudioTrackId / userAudioTrackSelection changes.
  const stopThroughputUI = effect(() => updateThroughputDisplay());
  const stopRenditionUI = effect(() => renderRenditionPicker());
  const stopAudioPickerUI = effect(() => renderAudioTrackPicker());
  const stopTextPickerUI = effect(() => renderTextTrackPicker());
  const stopResolutionUI = effect(() => renderResolutionStatus());

  // Context logger
  const stopContextLogger = effect(() => {
    const ctx = snapshot(engine.context);

    if (ctx.mediaSource && !prevContext.hasMediaSource) {
      log(`MediaSource created: ${ctx.mediaSource.readyState}`, 'success');
      prevContext.hasMediaSource = true;
    }
    if (ctx.videoBuffer && !prevContext.hasVideoBuffer) {
      log('Video SourceBuffer created', 'success');
      prevContext.hasVideoBuffer = true;

      const origRemove = ctx.videoBuffer.remove.bind(ctx.videoBuffer);
      ctx.videoBuffer.remove = (start: number, end: number) => {
        log(
          `📹 Video SourceBuffer.remove(${start.toFixed(2)}s → ${end === Infinity ? '∞' : end.toFixed(2)}s)`,
          'warning'
        );
        return origRemove(start, end);
      };

      ctx.videoBuffer.addEventListener('updateend', () => {
        const buf = engine.context.videoBuffer.get();
        if (!buf) return;
        const ranges: string[] = [];
        for (let i = 0; i < buf.buffered.length; i++) {
          ranges.push(`[${buf.buffered.start(i).toFixed(2)}, ${buf.buffered.end(i).toFixed(2)}]`);
        }
        log(`📹 Video buffered: ${ranges.join(' ') || '(empty)'}`, 'info');
      });
    }
    if (ctx.audioBuffer && !prevContext.hasAudioBuffer) {
      log('Audio SourceBuffer created', 'success');
      prevContext.hasAudioBuffer = true;

      const origRemove = ctx.audioBuffer.remove.bind(ctx.audioBuffer);
      ctx.audioBuffer.remove = (start: number, end: number) => {
        log(
          `🔊 Audio SourceBuffer.remove(${start.toFixed(2)}s → ${end === Infinity ? '∞' : end.toFixed(2)}s)`,
          'warning'
        );
        return origRemove(start, end);
      };

      ctx.audioBuffer.addEventListener('updateend', () => {
        const buf = engine.context.audioBuffer.get();
        if (!buf) return;
        const ranges: string[] = [];
        for (let i = 0; i < buf.buffered.length; i++) {
          ranges.push(`[${buf.buffered.start(i).toFixed(2)}, ${buf.buffered.end(i).toFixed(2)}]`);
        }
        log(`🔊 Audio buffered: ${ranges.join(' ') || '(empty)'}`, 'info');
      });
    }
  });

  cleanupEffects = () => {
    stopStateLogger();
    stopThroughputUI();
    stopRenditionUI();
    stopAudioPickerUI();
    stopTextPickerUI();
    stopResolutionUI();
    stopContextLogger();
  };

  log('✓ Engine created', 'success');
  log('Exposed as window.engine / window.signals / window.state() / window.context()');
  log('✓ Reactive effects active', 'success');

  // ── Wire media element ──────────────────────────────────────────────────────
  // Set preload on the element BEFORE wiring context so syncPreload's read
  // effect picks up the user-selected value rather than the hardcoded "none"
  // from the HTML.
  video.preload = preloadSelect.value as 'auto' | 'metadata' | 'none';
  signals.context.mediaElement.set(video);
  signals.state.presentation.set({ url: src });

  log('✓ Orchestration started', 'success');

  // Auto-inspect periodically
  setInterval(inspectState, 3000);
}

try {
  video.muted = INITIAL_MUTED;
  video.autoplay = INITIAL_AUTOPLAY;
  startEngine(INITIAL_SRC);
} catch (error) {
  log(`✗ Error creating engine: ${(error as Error).message}`, 'error');
  console.error(error);
}

// ── Event handlers ────────────────────────────────────────────────────────────
document.getElementById('play')!.addEventListener('click', () => {
  video
    .play()
    .then(() => log('play() succeeded', 'success'))
    .catch((e) => log(`play() failed: ${e.message}`, 'error'));
});
document.getElementById('pause')!.addEventListener('click', () => {
  video.pause();
  log('Video paused');
});
document.getElementById('inspect')!.addEventListener('click', inspectState);
document.getElementById('clearLogs')!.addEventListener('click', () => {
  logsDiv.innerHTML = '';
});

setSrcBtn.addEventListener('click', () => {
  const url = srcInput.value.trim();
  if (!url) return;
  log(`Setting src: ${url}`, 'info');
  startEngine(url);
  updateShareUrl();
});

srcInput.addEventListener('input', updateShareUrl);

mutedToggle.addEventListener('change', () => {
  video.muted = mutedToggle.checked;
  log(`Muted: ${mutedToggle.checked}`);
  updateShareUrl();
});

autoplayToggle.addEventListener('change', () => {
  video.autoplay = autoplayToggle.checked;
  log(`Autoplay: ${autoplayToggle.checked}`);
  updateShareUrl();
});

preloadSelect.addEventListener('change', () => {
  const value = preloadSelect.value as 'auto' | 'metadata' | 'none';
  signals.state.preload.set(value);
  log(`Preload: ${value}`);
  updateShareUrl();
});

document.getElementById('open-new-tab')!.addEventListener('click', () => {
  window.open(shareLink.href, '_blank', 'noopener');
});

// ── Video element events ──────────────────────────────────────────────────────
video.addEventListener('timeupdate', updateNowPlayingQuality);
video.addEventListener('loadstart', () => log('📺 Video: loadstart'));
video.addEventListener('loadedmetadata', () => log('📺 Video: loadedmetadata', 'success'));
video.addEventListener('loadeddata', () => log('📺 Video: loadeddata', 'success'));
video.addEventListener('canplay', () => log('📺 Video: canplay', 'success'));
video.addEventListener('canplaythrough', () => log('📺 Video: canplaythrough', 'success'));
video.addEventListener('playing', () => log('📺 Video: playing', 'success'));
video.addEventListener('pause', () => log('📺 Video: pause'));
video.addEventListener('waiting', () => log('📺 Video: waiting', 'warning'));
video.addEventListener('ended', () => log('📺 Video: ended ✅ endOfStream() worked!', 'success'));
video.addEventListener('error', () => log(`📺 Video: error - ${video.error?.message}`, 'error'));
