// SPF Segment Loading POC Test
// http://localhost:5173/spf-segment-loading/
//
// Supported query params:
//   src=<url>            Stream URL (overrides TEST_STREAM default)
//   muted=true           Start muted
//   autoplay=true        Start with autoplay enabled
//   preload=auto|metadata|none  Initial preload mode

import { createPlaybackEngine } from '@videojs/spf/playback-engine';

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

function getVideoTracks(state: ReturnType<typeof engine.state.current>) {
  return state.presentation?.selectionSets?.find((s) => s.type === 'video')?.switchingSets[0]?.tracks ?? [];
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
  const segments = engine.owners.current.videoBufferActor?.snapshot.context.segments ?? [];
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
  const bs = engine.state.current.bandwidthState;
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
  if (!engine) return;
  const state = engine.state.current;
  const tracks = getVideoTracks(state);
  const isManual = state.abrDisabled === true;

  if (tracks.length === 0) {
    renditionButtonsDiv.textContent = state.presentation ? 'No video tracks found' : 'Waiting for presentation…';
    return;
  }

  renditionButtonsDiv.innerHTML = '';

  const statusRow = document.createElement('div');
  statusRow.className = 'abr-status';
  const modeLabel = document.createElement('span');
  modeLabel.className = isManual ? 'mode-manual' : 'mode-abr';
  modeLabel.textContent = isManual ? '🔒 Manual' : '⟳ ABR';
  statusRow.appendChild(modeLabel);
  if (isManual) {
    const enableBtn = document.createElement('button');
    enableBtn.type = 'button';
    enableBtn.className = 'enable-abr-btn';
    enableBtn.textContent = 'Enable ABR';
    enableBtn.addEventListener('click', () => {
      log('ABR re-enabled', 'success');
      engine.state.patch({ abrDisabled: false });
    });
    statusRow.appendChild(enableBtn);
  }
  renditionButtonsDiv.appendChild(statusRow);

  for (const track of tracks) {
    const isSelected = track.id === state.selectedVideoTrackId;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `rendition-btn${isSelected ? (isManual ? ' selected-manual' : ' selected-abr') : ''}`;
    const res = 'width' in track && track.width && track.height ? `${track.width}×${track.height} @ ` : '';
    const badge = isSelected ? (isManual ? ' 🔒' : ' ⟳') : '';
    btn.textContent = `${res}${formatBandwidth(track.bandwidth)}${badge}`;
    btn.title = track.id;
    btn.addEventListener('click', () => {
      log(`Manual rendition select: ${formatBandwidth(track.bandwidth)} (ABR disabled)`, 'warning');
      engine.state.patch({ selectedVideoTrackId: track.id, abrDisabled: true });
    });
    renditionButtonsDiv.appendChild(btn);
  }
}

function renderResolutionStatus() {
  if (!engine) return;
  const state = engine.state.current;
  const tracks = getVideoTracks(state);

  if (tracks.length === 0) {
    resolutionListDiv.textContent = state.presentation ? 'No video tracks found' : 'Waiting for presentation…';
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
  const state = engine.state.current;
  const owners = engine.owners.current;

  const videoBufferRanges = owners.videoBuffer
    ? Array.from(
        { length: owners.videoBuffer.buffered.length },
        (_, i) =>
          `Range ${i}: ${owners.videoBuffer!.buffered.start(i).toFixed(2)}s - ${owners.videoBuffer!.buffered.end(i).toFixed(2)}s`
      ).join('\n  ')
    : 'N/A';

  const audioBufferRanges = owners.audioBuffer
    ? Array.from(
        { length: owners.audioBuffer.buffered.length },
        (_, i) =>
          `Range ${i}: ${owners.audioBuffer!.buffered.start(i).toFixed(2)}s - ${owners.audioBuffer!.buffered.end(i).toFixed(2)}s`
      ).join('\n  ')
    : 'N/A';

  stateDiv.innerHTML = `
    <h2>State Inspector</h2>

    <h3>Playback State</h3>
    <pre>${JSON.stringify(state, null, 2)}</pre>

    <h3>Owners (SourceBuffers)</h3>
    <div>Video Buffer: ${owners.videoBuffer ? '✓ Created' : '✗ Not created'}</div>
    <div>Audio Buffer: ${owners.audioBuffer ? '✓ Created' : '✗ Not created'}</div>

    ${
      owners.videoBuffer
        ? `
      <h4>Video Buffer State</h4>
      <div>Buffered ranges: ${owners.videoBuffer.buffered.length}</div>
      <pre>${videoBufferRanges}</pre>
    `
        : ''
    }

    ${
      owners.audioBuffer
        ? `
      <h4>Audio Buffer State</h4>
      <div>Buffered ranges: ${owners.audioBuffer.buffered.length}</div>
      <pre>${audioBufferRanges}</pre>
    `
        : ''
    }

    <h3>MediaSource State</h3>
    <div>readyState: ${owners.mediaSource?.readyState ?? 'N/A'}</div>

    <h3>Buffer Model (actor context)</h3>
    <div>Video segments loaded: ${owners.videoBufferActor?.snapshot.context.segments.length ?? 0}</div>
    <div>Audio segments loaded: ${owners.audioBufferActor?.snapshot.context.segments.length ?? 0}</div>

    <h3>Video Element State</h3>
    <div>readyState: ${video.readyState}</div>
    <div>networkState: ${video.networkState}</div>
    <div>currentTime: ${video.currentTime.toFixed(2)}s</div>
    <div>duration: ${video.duration}s</div>
    <div>paused: ${video.paused}</div>
    <div>ended: ${video.ended}</div>
  `;
}

// ── Engine ────────────────────────────────────────────────────────────────────
log('=== SPF Segment Loading POC Test ===');
log(`Stream: ${INITIAL_SRC}`);

let engine: ReturnType<typeof createPlaybackEngine>;

try {
  engine = createPlaybackEngine({ initialBandwidth: 1_000_000 });

  log('✓ Engine created', 'success');
  (window as any).engine = engine;
  (window as any).state = () => engine.state.current;
  (window as any).owners = () => engine.owners.current;
  log('Exposed as window.engine / window.state() / window.owners()');

  // ── State subscriptions ──────────────────────────────────────────────────
  const prev = {
    hasPresentation: false,
    selectedVideoTrackId: undefined as string | undefined,
    selectedAudioTrackId: undefined as string | undefined,
    selectedTextTrackId: undefined as string | undefined,
  };

  engine.state.subscribe((state) => {
    if (state.presentation && !prev.hasPresentation) {
      log('Presentation resolved');
      prev.hasPresentation = true;
    }

    // Auto-select first text track
    if (state.presentation && !state.selectedTextTrackId && state.presentation.selectionSets) {
      const textSet = state.presentation.selectionSets.find((s) => s.type === 'text');
      const firstText = textSet?.switchingSets?.[0]?.tracks?.[0];
      if (firstText) {
        log(`Auto-selecting text track: ${firstText.id}`);
        engine.state.patch({ selectedTextTrackId: firstText.id });
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

  // Throughput display — update whenever bandwidthState changes
  engine.state.subscribe(
    (s) => s.bandwidthState,
    () => updateThroughputDisplay()
  );

  // ── Owners subscriptions ─────────────────────────────────────────────────
  const prevOwners = { hasMediaSource: false, hasVideoBuffer: false, hasAudioBuffer: false };

  engine.owners.subscribe((owners) => {
    if (owners.mediaSource && !prevOwners.hasMediaSource) {
      log(`MediaSource created: ${owners.mediaSource.readyState}`, 'success');
      prevOwners.hasMediaSource = true;
    }
    if (owners.videoBuffer && !prevOwners.hasVideoBuffer) {
      log('Video SourceBuffer created', 'success');
      prevOwners.hasVideoBuffer = true;

      const origRemove = owners.videoBuffer.remove.bind(owners.videoBuffer);
      owners.videoBuffer.remove = (start: number, end: number) => {
        log(
          `📹 Video SourceBuffer.remove(${start.toFixed(2)}s → ${end === Infinity ? '∞' : end.toFixed(2)}s)`,
          'warning'
        );
        return origRemove(start, end);
      };

      owners.videoBuffer.addEventListener('updateend', () => {
        const buf = owners.videoBuffer;
        if (!buf) return;
        const ranges: string[] = [];
        for (let i = 0; i < buf.buffered.length; i++) {
          ranges.push(`[${buf.buffered.start(i).toFixed(2)}, ${buf.buffered.end(i).toFixed(2)}]`);
        }
        log(`📹 Video buffered: ${ranges.join(' ') || '(empty)'}`, 'info');
      });
    }
    if (owners.audioBuffer && !prevOwners.hasAudioBuffer) {
      log('Audio SourceBuffer created', 'success');
      prevOwners.hasAudioBuffer = true;

      const origRemove = owners.audioBuffer.remove.bind(owners.audioBuffer);
      owners.audioBuffer.remove = (start: number, end: number) => {
        log(
          `🔊 Audio SourceBuffer.remove(${start.toFixed(2)}s → ${end === Infinity ? '∞' : end.toFixed(2)}s)`,
          'warning'
        );
        return origRemove(start, end);
      };

      owners.audioBuffer.addEventListener('updateend', () => {
        const buf = owners.audioBuffer;
        if (!buf) return;
        const ranges: string[] = [];
        for (let i = 0; i < buf.buffered.length; i++) {
          ranges.push(`[${buf.buffered.start(i).toFixed(2)}, ${buf.buffered.end(i).toFixed(2)}]`);
        }
        log(`🔊 Audio buffered: ${ranges.join(' ') || '(empty)'}`, 'info');
      });
    }
  });

  // Re-render rendition picker when selection or ABR mode changes
  engine.state.subscribe(
    (s) => `${s.selectedVideoTrackId}|${s.abrDisabled}`,
    () => renderRenditionPicker()
  );

  // Re-render both panels when presentation changes
  engine.state.subscribe(
    (s) => s.presentation,
    () => {
      renderRenditionPicker();
      renderResolutionStatus();
    }
  );

  log('✓ State subscriptions active', 'success');

  // ── Wire media element ───────────────────────────────────────────────────
  video.muted = INITIAL_MUTED;
  video.autoplay = INITIAL_AUTOPLAY;
  // Set preload on the element BEFORE patching owners so syncPreloadAttribute
  // reads the correct value rather than the hardcoded "none" from the HTML.
  video.preload = INITIAL_PRELOAD;

  engine.owners.patch({ mediaElement: video });
  engine.state.patch({
    presentation: { url: INITIAL_SRC },
  });

  log('✓ Orchestration started', 'success');

  // Auto-inspect periodically
  setInterval(inspectState, 3000);
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
  engine.state.patch({
    presentation: { url },
    selectedVideoTrackId: undefined,
    selectedAudioTrackId: undefined,
    selectedTextTrackId: undefined,
    abrDisabled: false,
  });
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
  engine.state.patch({ preload: value });
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
