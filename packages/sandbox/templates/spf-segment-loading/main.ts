// SPF Segment Loading POC Test
// http://localhost:5173/spf-segment-loading/

import { createPlaybackEngine } from '@videojs/spf/dom/playback-engine';

const video = document.getElementById('video') as HTMLVideoElement;
const logsDiv = document.getElementById('logs') as HTMLDivElement;
const stateDiv = document.getElementById('state') as HTMLDivElement;

function log(msg: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${msg}`);
  const div = document.createElement('div');
  div.className = type;
  div.textContent = `[${timestamp}] ${msg}`;
  logsDiv.appendChild(div);
  logsDiv.scrollTop = logsDiv.scrollHeight;
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

    <h3>Video Element State</h3>
    <div>readyState: ${video.readyState}</div>
    <div>networkState: ${video.networkState}</div>
    <div>currentTime: ${video.currentTime.toFixed(2)}s</div>
    <div>duration: ${video.duration}s</div>
    <div>paused: ${video.paused}</div>
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
video.addEventListener('waiting', () => log('📺 Video: waiting', 'warning'));
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
  // Create engine with configuration
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

  // Subscribe to state changes for detailed logging (track previous state to avoid duplicate logs)
  const previousState = {
    hasPresentation: false,
    selectedVideoTrackId: undefined as string | undefined,
    selectedAudioTrackId: undefined as string | undefined,
    selectedTextTrackId: undefined as string | undefined,
  };

  engine.state.subscribe((state) => {
    // Only log when presentation first becomes available
    if (state.presentation && !previousState.hasPresentation) {
      log('Presentation resolved');
      previousState.hasPresentation = true;
    }

    // Auto-select first text track if available (runs on every state update)
    if (state.presentation && !state.selectedTextTrackId && state.presentation.selectionSets) {
      const textSet = state.presentation.selectionSets.find((s) => s.type === 'text');
      const firstTextTrack = textSet?.switchingSets?.[0]?.tracks?.[0];
      if (firstTextTrack) {
        log(`Auto-selecting text track: ${firstTextTrack.id}`);
        engine.state.patch({ selectedTextTrackId: firstTextTrack.id });
      }
    }

    // Only log when track selection changes
    if (state.selectedVideoTrackId && state.selectedVideoTrackId !== previousState.selectedVideoTrackId) {
      log(`Video track selected: ${state.selectedVideoTrackId}`);
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

  // Subscribe to owners changes (track previous owners to avoid duplicate logs)
  const previousOwners = {
    hasMediaSource: false,
    hasVideoBuffer: false,
    hasAudioBuffer: false,
  };

  engine.owners.subscribe((owners) => {
    // Only log when MediaSource first becomes available
    if (owners.mediaSource && !previousOwners.hasMediaSource) {
      log(`MediaSource created: ${owners.mediaSource.readyState}`, 'success');
      previousOwners.hasMediaSource = true;
    }
    // Only log when SourceBuffers first become available
    if (owners.videoBuffer && !previousOwners.hasVideoBuffer) {
      log('Video SourceBuffer created', 'success');
      previousOwners.hasVideoBuffer = true;
    }
    if (owners.audioBuffer && !previousOwners.hasAudioBuffer) {
      log('Audio SourceBuffer created', 'success');
      previousOwners.hasAudioBuffer = true;
    }
  });

  log('✓ State subscriptions active', 'success');

  // Initialize orchestration: patch owners and state
  log('Patching mediaElement...');
  engine.owners.patch({ mediaElement: video });

  log('Patching presentation URL and preload...');
  engine.state.patch({
    presentation: { url: TEST_STREAM },
    // preload: 'auto', // Triggers orchestration
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
