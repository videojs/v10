// SPF Segment Loading POC Test
// http://localhost:5173/spf-segment-loading/

import { createPlaybackEngine } from '@videojs/spf/dom/playback-engine';

const video = document.getElementById('video') as HTMLVideoElement;
const logsDiv = document.getElementById('logs') as HTMLDivElement;
const stateDiv = document.getElementById('state') as HTMLDivElement;
const renditionButtonsDiv = document.getElementById('rendition-buttons') as HTMLDivElement;
const resolutionListDiv = document.getElementById('resolution-list') as HTMLDivElement;

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

  // ABR / Manual mode status row
  const statusRow = document.createElement('div');
  statusRow.className = 'abr-status';
  const modeLabel = document.createElement('span');
  modeLabel.className = isManual ? 'mode-manual' : 'mode-abr';
  modeLabel.textContent = isManual ? '🔒 Manual' : '⟳ ABR';
  statusRow.appendChild(modeLabel);
  if (isManual) {
    const enableBtn = document.createElement('button');
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
    btn.className = 'rendition-btn' + (isSelected ? (isManual ? ' selected-manual' : ' selected-abr') : '');

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

  const html = `
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

  stateDiv.innerHTML = html;
}

// Event handlers
document.getElementById('play')!.addEventListener('click', () => {
  video
    .play()
    .then(() => {
      log('Video play() succeeded', 'success');
    })
    .catch((err) => {
      log(`Video play() failed: ${err.message}`, 'error');
    });
});

document.getElementById('pause')!.addEventListener('click', () => {
  video.pause();
  log('Video paused');
});

document.getElementById('inspect')!.addEventListener('click', inspectState);

document.getElementById('clearLogs')!.addEventListener('click', () => {
  logsDiv.innerHTML = '';
});

// Video element event listeners
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

// Mux test asset - short CMAF stream
// Mad Max Fury Road Trailer (short, subtitles)
const TEST_STREAM = 'https://stream.mux.com/JX01bG8eB4uaoV3OpDuK602rBfvdSgrMObjwuUOBn4JrQ.m3u8';
// Mux Blue Smoke (extra short, simple)
// const TEST_STREAM = 'https://stream.mux.com/cmg02Moxu5B7WORo2MElg2U02p2ZyMP7Hb01d80001gHDgPE.m3u8';

log('=== SPF Segment Loading POC Test ===');
log(`Test stream: ${TEST_STREAM}`);
log('Creating playback engine...');

let engine: ReturnType<typeof createPlaybackEngine>;

try {
  engine = createPlaybackEngine({
    initialBandwidth: 1000000, // 1 Mbps
  });

  log('✓ Engine created', 'success');

  // Expose for debugging in DevTools console
  (window as any).engine = engine;
  (window as any).state = () => engine.state.current;
  (window as any).owners = () => engine.owners.current;

  log('Engine exposed as window.engine');
  log('Access state: window.state()');
  log('Access owners: window.owners()');

  // Subscribe to state changes for detailed logging
  const previousState = {
    hasPresentation: false,
    selectedVideoTrackId: undefined as string | undefined,
    selectedAudioTrackId: undefined as string | undefined,
    selectedTextTrackId: undefined as string | undefined,
  };

  engine.state.subscribe((state) => {
    if (state.presentation && !previousState.hasPresentation) {
      log('Presentation resolved');
      previousState.hasPresentation = true;
    }

    // Auto-select first text track if available
    if (state.presentation && !state.selectedTextTrackId && state.presentation.selectionSets) {
      const textSet = state.presentation.selectionSets.find((s) => s.type === 'text');
      const firstTextTrack = textSet?.switchingSets?.[0]?.tracks?.[0];
      if (firstTextTrack) {
        log(`Auto-selecting text track: ${firstTextTrack.id}`);
        engine.state.patch({ selectedTextTrackId: firstTextTrack.id });
      }
    }

    if (state.selectedVideoTrackId && state.selectedVideoTrackId !== previousState.selectedVideoTrackId) {
      const mode = state.abrDisabled ? '(manual)' : '(ABR)';
      log(`Video track selected ${mode}: ${state.selectedVideoTrackId}`);
      previousState.selectedVideoTrackId = state.selectedVideoTrackId;
    }
    if (state.selectedAudioTrackId && state.selectedAudioTrackId !== previousState.selectedAudioTrackId) {
      log(`Audio track selected: ${state.selectedAudioTrackId}`);
      previousState.selectedAudioTrackId = state.selectedAudioTrackId;
    }
    if (state.selectedTextTrackId && state.selectedTextTrackId !== previousState.selectedTextTrackId) {
      log(`Text track selected: ${state.selectedTextTrackId}`, 'success');
      previousState.selectedTextTrackId = state.selectedTextTrackId;
    }
  });

  // Subscribe to owners changes
  const previousOwners = {
    hasMediaSource: false,
    hasVideoBuffer: false,
    hasAudioBuffer: false,
  };

  engine.owners.subscribe((owners) => {
    if (owners.mediaSource && !previousOwners.hasMediaSource) {
      log(`MediaSource created: ${owners.mediaSource.readyState}`, 'success');
      previousOwners.hasMediaSource = true;
    }
    if (owners.videoBuffer && !previousOwners.hasVideoBuffer) {
      log('Video SourceBuffer created', 'success');
      previousOwners.hasVideoBuffer = true;

      // Spy on remove() to confirm what ranges are actually being flushed
      const origVideoRemove = owners.videoBuffer.remove.bind(owners.videoBuffer);
      owners.videoBuffer.remove = (start: number, end: number) => {
        const endStr = end === Infinity ? '∞' : end.toFixed(2);
        log(`📹 Video SourceBuffer.remove(${start.toFixed(2)}s → ${endStr}s)`, 'warning');
        return origVideoRemove(start, end);
      };

      // Log buffered ranges after each update
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
    if (owners.audioBuffer && !previousOwners.hasAudioBuffer) {
      log('Audio SourceBuffer created', 'success');
      previousOwners.hasAudioBuffer = true;

      const origAudioRemove = owners.audioBuffer.remove.bind(owners.audioBuffer);
      owners.audioBuffer.remove = (start: number, end: number) => {
        const endStr = end === Infinity ? '∞' : end.toFixed(2);
        log(`🔊 Audio SourceBuffer.remove(${start.toFixed(2)}s → ${endStr}s)`, 'warning');
        return origAudioRemove(start, end);
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

  // Re-render both panels when presentation changes (tracks added or resolved)
  engine.state.subscribe(
    (s) => s.presentation,
    () => {
      renderRenditionPicker();
      renderResolutionStatus();
    }
  );

  log('✓ State subscriptions active', 'success');

  engine.owners.patch({ mediaElement: video });

  engine.state.patch({
    presentation: { url: TEST_STREAM },
    // preload: 'auto',
  });

  log('✓ Orchestration started', 'success');
  log('Watch console and DevTools for segment loading activity');
  log('Video should start playing once segments load');

  // Auto-inspect periodically
  setInterval(() => {
    inspectState();
  }, 3000);
} catch (error) {
  log(`✗ Error creating engine: ${(error as Error).message}`, 'error');
  console.error(error);
}
