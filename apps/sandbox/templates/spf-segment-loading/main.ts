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
import type { SimpleHlsEngineInputs, SimpleHlsEngineState } from '@videojs/spf/hls';
import { createSimpleHlsEngine } from '@videojs/spf/hls';

// ── DOM refs ──────────────────────────────────────────────────────────────────
const video = document.getElementById('video') as HTMLVideoElement;
const logsDiv = document.getElementById('logs') as HTMLDivElement;
const stateDiv = document.getElementById('state') as HTMLDivElement;
const renditionButtonsDiv = document.getElementById('rendition-buttons') as HTMLDivElement;
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

function renderRenditionPicker() {
  if (!engine || !inputs) return;
  const presentation = engine.state.presentation.get();
  const selectedVideoTrackId = engine.state.selectedVideoTrackId.get();
  const abrDisabled = engine.state.abrDisabled.get() === true;
  const tracks = getVideoTracks(presentation);

  if (tracks.length === 0) {
    renditionButtonsDiv.textContent = presentation ? 'No video tracks found' : 'Waiting for presentation…';
    return;
  }

  renditionButtonsDiv.innerHTML = '';

  const statusRow = document.createElement('div');
  statusRow.className = 'abr-status';
  const modeLabel = document.createElement('span');
  modeLabel.className = abrDisabled ? 'mode-manual' : 'mode-abr';
  modeLabel.textContent = abrDisabled ? '🔒 Manual' : '⟳ ABR';
  statusRow.appendChild(modeLabel);
  if (abrDisabled) {
    const enableBtn = document.createElement('button');
    enableBtn.type = 'button';
    enableBtn.className = 'enable-abr-btn';
    enableBtn.textContent = 'Enable ABR';
    enableBtn.addEventListener('click', () => {
      log('ABR re-enabled', 'success');
      inputs.state.abrDisabled.set(false);
    });
    statusRow.appendChild(enableBtn);
  }
  renditionButtonsDiv.appendChild(statusRow);

  for (const track of tracks) {
    const isSelected = track.id === selectedVideoTrackId;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `rendition-btn${isSelected ? (abrDisabled ? ' selected-manual' : ' selected-abr') : ''}`;
    const res = 'width' in track && track.width && track.height ? `${track.width}×${track.height} @ ` : '';
    const badge = isSelected ? (abrDisabled ? ' 🔒' : ' ⟳') : '';
    btn.textContent = `${res}${formatBandwidth(track.bandwidth)}${badge}`;
    btn.title = track.id;
    btn.addEventListener('click', () => {
      log(`Manual rendition select: ${formatBandwidth(track.bandwidth)} (ABR disabled)`, 'warning');
      // TODO(stage-d): selectedVideoTrackId is the deferred reconciler case —
      // direct write into composition state until intent/state split lands.
      engine.state.selectedVideoTrackId.set(track.id);
      inputs.state.abrDisabled.set(true);
    });
    renditionButtonsDiv.appendChild(btn);
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
let inputs: SimpleHlsEngineInputs;
let cleanupEffects: () => void = () => {};

function startEngine(src: string) {
  cleanupEffects();
  if (engine) engine.destroy();

  engine = createSimpleHlsEngine({
    initialBandwidth: 1_000_000,
    exposeInputs: (refs) => {
      inputs = refs;
    },
  });
  (window as any).engine = engine;
  (window as any).inputs = inputs;
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

  // State logger + auto-select first text track
  const stopStateLogger = effect(() => {
    const state = snapshot(engine.state);

    if (state.presentation && !prev.hasPresentation) {
      log('Presentation resolved');
      prev.hasPresentation = true;
    }

    // Auto-select first text track when presentation arrives
    if (state.presentation && !state.selectedTextTrackId && state.presentation.selectionSets) {
      const textSet = state.presentation.selectionSets.find((s) => s.type === 'text');
      const firstText = textSet?.switchingSets?.[0]?.tracks?.[0];
      if (firstText) {
        log(`Auto-selecting text track: ${firstText.id}`);
        // TODO(stage-d): selectedTextTrackId is the deferred reconciler case —
        // direct write into composition state until intent/state split lands.
        engine.state.selectedTextTrackId.set(firstText.id);
      }
    }

    if (state.selectedVideoTrackId && state.selectedVideoTrackId !== prev.selectedVideoTrackId) {
      const mode = state.abrDisabled ? '(manual)' : '(ABR)';
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

  // Throughput + rendition picker + resolution status — re-render on any state change
  const stopStateUI = effect(() => {
    snapshot(engine.state); // track all state changes
    updateThroughputDisplay();
    renderRenditionPicker();
    renderResolutionStatus();
  });

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
    stopStateUI();
    stopContextLogger();
  };

  log('✓ Engine created', 'success');
  log('Exposed as window.engine / window.inputs / window.state() / window.context()');
  log('✓ Reactive effects active', 'success');

  // ── Wire media element ──────────────────────────────────────────────────────
  // Set preload on the element BEFORE wiring context so syncPreloadAttribute
  // reads the correct value rather than the hardcoded "none" from the HTML.
  video.preload = preloadSelect.value as 'auto' | 'metadata' | 'none';
  inputs.context.mediaElement.set(video);
  inputs.state.presentationUrl.set(src);

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
  inputs.state.preload.set(value);
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
