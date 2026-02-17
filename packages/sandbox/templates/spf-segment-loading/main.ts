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

  // Subscribe to state changes for detailed logging
  engine.state.subscribe((state) => {
    if (state.presentation) {
      log('Presentation resolved');

      // Auto-select first text track if available (smoke test text track support)
      if (!state.selectedTextTrackId && state.presentation.selectionSets) {
        const textSet = state.presentation.selectionSets.find((s) => s.type === 'text');
        const firstTextTrack = textSet?.switchingSets?.[0]?.tracks?.[0];
        if (firstTextTrack) {
          log(`Auto-selecting text track: ${firstTextTrack.id}`);
          engine.state.patch({ selectedTextTrackId: firstTextTrack.id });
        }
      }
    }
    if (state.selectedVideoTrackId) {
      log('Video track selected');
    }
    if (state.selectedAudioTrackId) {
      log('Audio track selected');
    }
    if (state.selectedTextTrackId) {
      log('Text track selected', 'success');
    }
  });

  // Subscribe to owners changes
  engine.owners.subscribe((owners) => {
    if (owners.mediaSource) {
      log(`MediaSource created: ${owners.mediaSource.readyState}`, 'success');
    }
    if (owners.videoBuffer) {
      log('Video SourceBuffer created', 'success');
    }
    if (owners.audioBuffer) {
      log('Audio SourceBuffer created', 'success');
    }
  });

  log('✓ State subscriptions active', 'success');

  // Initialize orchestration: patch owners and state
  log('Patching mediaElement...');
  engine.owners.patch({ mediaElement: video });

  log('Patching presentation URL and preload...');
  engine.state.patch({
    presentation: { url: TEST_STREAM },
    preload: 'auto', // Triggers orchestration
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
