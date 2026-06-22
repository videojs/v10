/**
 * Bare harness for live HLS playback — wires `createSimpleHlsEngine` (which
 * folds in live support) to a raw <video> (no player/skin) and logs playback
 * state, to validate live CMAF/LL-HLS playback end-to-end.
 */
import { createSimpleHlsEngine, type SimpleHlsEngineSignals } from '@videojs/spf/hls';

// Override per run with `?src=<m3u8 url>` (live test streams are ephemeral).
const SRC =
  new URLSearchParams(location.search).get('src') ??
  'https://stream.mux.com/1DRguGQyA2K2TIelbV7rU7uePlZXHyYWR1LEMC8iTC4.m3u8';

const video = document.getElementById('video') as HTMLVideoElement;
const logEl = document.getElementById('log')!;
const stateEl = document.getElementById('state')!;

const log = (msg: string, cls = '') => {
  const line = document.createElement('div');
  if (cls) line.className = cls;
  line.textContent = `${new Date().toISOString().slice(11, 23)}  ${msg}`;
  logEl.prepend(line);
};

const buffered = () =>
  video.buffered.length
    ? `${video.buffered.start(0).toFixed(2)}–${video.buffered.end(video.buffered.length - 1).toFixed(2)}`
    : 'none';

function renderState() {
  const rows: [string, string][] = [
    ['paused', String(video.paused)],
    ['currentTime', video.currentTime.toFixed(2)],
    ['readyState', String(video.readyState)],
    ['buffered', buffered()],
    ['duration', String(video.duration)],
    ['error', video.error ? `${video.error.code}` : 'none'],
  ];
  stateEl.innerHTML = rows.map(([k, v]) => `<div class="state-key">${k}</div><div class="val">${v}</div>`).join('');
}
setInterval(renderState, 500);

for (const ev of ['loadedmetadata', 'durationchange', 'canplay', 'playing', 'waiting', 'stalled', 'seeked', 'ended']) {
  video.addEventListener(ev, () =>
    log(`${ev}  t=${video.currentTime.toFixed(2)} buffered=${buffered()} ready=${video.readyState}`)
  );
}
video.addEventListener('error', () => log(`video error: ${video.error?.code}`, 'err'));

let signals: SimpleHlsEngineSignals | undefined;
const engine = createSimpleHlsEngine({
  onSignalsReady: (refs) => {
    signals = refs;
  },
});
if (!signals) throw new Error('live engine signals not ready');

video.preload = 'auto';
signals.context.mediaElement.set(video);
signals.state.presentation.set({ url: SRC });
log(`engine wired; presentation = ${SRC}`);

video.play().then(
  () => log('play() resolved'),
  (e) => log(`play() rejected: ${e}`, 'err')
);

// Expose for ad-hoc debugging from the console / Playwright.
Object.assign(window as unknown as Record<string, unknown>, { __live: { engine, signals, video } });
