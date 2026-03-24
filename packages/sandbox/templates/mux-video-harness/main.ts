// Mux Video Test Harness
// http://localhost:5173/mux-video-harness/
//
// Supported query params:
//   src=<url>   HLS stream URL to load on start

// Side-effect import registers the <mux-video> custom element.
import '@videojs/html/media/mux-video';
import type { MuxVideoElement } from '@videojs/html/media/mux-video';

// ── Preset sources ──────────────────────────────────────────────────────────
// Add live/DVR stream URLs here to exercise stream type detection end-to-end.
const PRESETS: { label: string; url: string }[] = [
  { label: 'VOD — Big Buck Bunny', url: 'https://stream.mux.com/VcmKA6aqzIzlg3MayLJDnbF55kX00mds028Z65QxvBYaA.m3u8' },
  { label: 'VOD — Elephants Dream', url: 'https://stream.mux.com/Sc89iWAyNkhJ3P1rQ02nrEdCFTnfT01CZ2KmaEcxXfB008.m3u8' },
  { label: 'VOD — Mad Max Trailer', url: 'https://stream.mux.com/JX01bG8eB4uaoV3OpDuK602rBfvdSgrMObjwuUOBn4JrQ.m3u8' },
  // Plug in live / DVR stream URLs to test streamType = 'live' and targetLiveWindow.
  // { label: 'Live — sliding window', url: 'https://stream.mux.com/<live-playback-id>.m3u8' },
  // { label: 'DVR — EVENT playlist', url: 'https://stream.mux.com/<dvr-playback-id>.m3u8' },
];

const DEFAULT_SRC = PRESETS[0].url;

// ── DOM refs ────────────────────────────────────────────────────────────────
const muxVideo = document.getElementById('mux-video') as MuxVideoElement;
const logsDiv = document.getElementById('logs') as HTMLDivElement;
const stateDiv = document.getElementById('state') as HTMLDivElement;
const srcInput = document.getElementById('src-input') as HTMLInputElement;
const presetsDiv = document.getElementById('preset-sources') as HTMLDivElement;
const shareLink = document.getElementById('share-link') as HTMLAnchorElement;

// ── Query params ────────────────────────────────────────────────────────────
const params = new URLSearchParams(window.location.search);
const INITIAL_SRC = params.get('src') ?? DEFAULT_SRC;

srcInput.value = INITIAL_SRC;
updateShareUrl();

// ── Helpers ─────────────────────────────────────────────────────────────────
function log(msg: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${msg}`);
  const div = document.createElement('div');
  div.className = type;
  div.textContent = `[${timestamp}] ${msg}`;
  logsDiv.appendChild(div);
  logsDiv.scrollTop = logsDiv.scrollHeight;
}

function formatNum(n: number): string {
  if (Number.isNaN(n)) return 'NaN';
  if (!Number.isFinite(n)) return n > 0 ? 'Infinity' : '-Infinity';
  return n.toFixed(3);
}

function updateShareUrl() {
  const src = srcInput.value.trim();
  const p = new URLSearchParams();
  if (src && src !== DEFAULT_SRC) p.set('src', src);
  const url = `${window.location.origin}${window.location.pathname}${p.size > 0 ? `?${p}` : ''}`;
  shareLink.href = url;
  shareLink.textContent = url;
}

function updateStreamInfo() {
  const streamType = (muxVideo as any).streamType ?? 'unknown';
  const targetLiveWindow = (muxVideo as any).targetLiveWindow ?? NaN;
  const liveEdgeOffset = (muxVideo as any).liveEdgeOffset ?? NaN;
  const liveEdgeStart = (muxVideo as any).liveEdgeStart ?? NaN;

  const stEl = document.getElementById('si-streamType')!;
  stEl.textContent = streamType;
  stEl.className = `value ${streamType}`;

  document.getElementById('si-targetLiveWindow')!.textContent = formatNum(targetLiveWindow);
  document.getElementById('si-liveEdgeOffset')!.textContent = formatNum(liveEdgeOffset);
  document.getElementById('si-liveEdgeStart')!.textContent = formatNum(liveEdgeStart);
}

function inspectState() {
  const el = muxVideo as any;
  stateDiv.innerHTML = `
    <h2>State Inspector</h2>
    <h3>Stream Info (delegate properties)</h3>
    <pre>${JSON.stringify(
      {
        streamType: el.streamType,
        targetLiveWindow: formatNum(el.targetLiveWindow),
        liveEdgeOffset: formatNum(el.liveEdgeOffset),
        liveEdgeStart: formatNum(el.liveEdgeStart),
      },
      null,
      2
    )}</pre>
    <h3>Video Element State</h3>
    <pre>${JSON.stringify(
      {
        src: el.src,
        readyState: el.readyState,
        networkState: el.networkState,
        currentTime: el.currentTime.toFixed(2),
        duration: Number.isNaN(el.duration) ? 'NaN' : el.duration.toFixed(2),
        paused: el.paused,
        ended: el.ended,
        seekable:
          el.seekable.length > 0 ? `[${el.seekable.start(0).toFixed(2)}, ${el.seekable.end(0).toFixed(2)}]` : '(empty)',
      },
      null,
      2
    )}</pre>
  `;
}

// ── Preset buttons ───────────────────────────────────────────────────────────
for (const preset of PRESETS) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `preset-btn${preset.url === INITIAL_SRC ? ' active' : ''}`;
  btn.textContent = preset.label;
  btn.addEventListener('click', () => {
    srcInput.value = preset.url;
    loadSrc(preset.url);
    presetsDiv.querySelectorAll('.preset-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
  });
  presetsDiv.appendChild(btn);
}

// ── Load ────────────────────────────────────────────────────────────────────
function loadSrc(url: string) {
  log(`Loading: ${url}`);
  muxVideo.src = url;
  updateShareUrl();
  updateStreamInfo();
}

// ── stream info events ───────────────────────────────────────────────────────
muxVideo.addEventListener('streamtypechange', (e) => {
  const detail = (e as CustomEvent).detail;
  log(`🎬 streamtypechange → ${detail}`, 'success');
  updateStreamInfo();
});

muxVideo.addEventListener('targetlivewindowchange', (e) => {
  const detail = (e as CustomEvent).detail;
  const formatted = formatNum(detail);
  log(`📡 targetlivewindowchange → ${formatted}`, 'success');
  updateStreamInfo();
});

muxVideo.addEventListener('muxerror', (e) => {
  const err = (e as CustomEvent).detail;
  const label = err?.muxCode ? ` [${err.muxCode}]` : '';
  log(`⚠️ muxerror${label}: ${err?.message ?? ''}`, 'error');
});

// ── Standard video events ────────────────────────────────────────────────────
muxVideo.addEventListener('loadstart', () => log('📺 loadstart'));
muxVideo.addEventListener('loadedmetadata', () => {
  log('📺 loadedmetadata', 'success');
  updateStreamInfo();
});
muxVideo.addEventListener('canplay', () => log('📺 canplay', 'success'));
muxVideo.addEventListener('playing', () => log('📺 playing', 'success'));
muxVideo.addEventListener('pause', () => log('📺 pause'));
muxVideo.addEventListener('waiting', () => log('📺 waiting', 'warning'));
muxVideo.addEventListener('ended', () => log('📺 ended', 'success'));
muxVideo.addEventListener('error', () => log(`📺 error — ${(muxVideo as any).error?.message ?? 'unknown'}`, 'error'));

// ── Button handlers ──────────────────────────────────────────────────────────
document.getElementById('play')!.addEventListener('click', () => {
  muxVideo
    .play()
    .then(() => log('play() resolved', 'success'))
    .catch((e) => log(`play() rejected: ${e.message}`, 'error'));
});
document.getElementById('pause')!.addEventListener('click', () => {
  muxVideo.pause();
  log('paused');
});
document.getElementById('inspect')!.addEventListener('click', inspectState);
document.getElementById('clearLogs')!.addEventListener('click', () => {
  logsDiv.innerHTML = '';
});
document.getElementById('open-new-tab')!.addEventListener('click', () => {
  window.open(shareLink.href, '_blank', 'noopener');
});

document.getElementById('set-src')!.addEventListener('click', () => {
  const url = srcInput.value.trim();
  if (!url) return;
  presetsDiv.querySelectorAll('.preset-btn').forEach((b) => b.classList.remove('active'));
  loadSrc(url);
});

srcInput.addEventListener('input', updateShareUrl);
srcInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    loadSrc(srcInput.value.trim());
  }
});

// ── Initial load ─────────────────────────────────────────────────────────────
log('=== Mux Video Harness ===');
(window as any).muxVideo = muxVideo;
log('Exposed as window.muxVideo');
loadSrc(INITIAL_SRC);
