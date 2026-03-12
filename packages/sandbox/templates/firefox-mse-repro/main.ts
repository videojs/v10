/**
 * Firefox MSE Init Segment Order Reproduction Harness
 *
 * Tests the Firefox bug where appending a video media segment before the
 * audio SourceBuffer has received its initialization segment causes
 * mozHasAudio to be permanently false.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlaylistInfo {
  videoCodec: string;
  audioCodec: string;
  videoInitUrl: string;
  audioInitUrl: string;
  videoSegmentUrls: string[];
  audioSegmentUrls: string[];
}

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------

const video = document.getElementById('video') as HTMLVideoElement;
const logEl = document.getElementById('log')!;
const stateEl = document.getElementById('state')!;
const codecInfoEl = document.getElementById('codec-info')!;
const urlInput = document.getElementById('url') as HTMLInputElement;

const btnParse = document.getElementById('btn-parse') as HTMLButtonElement;
const btnReset = document.getElementById('btn-reset') as HTMLButtonElement;
const btnMs = document.getElementById('btn-ms') as HTMLButtonElement;
const btnVsb = document.getElementById('btn-vsb') as HTMLButtonElement;
const btnAsb = document.getElementById('btn-asb') as HTMLButtonElement;
const btnVinit = document.getElementById('btn-vinit') as HTMLButtonElement;
const btnAinit = document.getElementById('btn-ainit') as HTMLButtonElement;
const btnVseg = document.getElementById('btn-vseg') as HTMLButtonElement;
const btnAseg = document.getElementById('btn-aseg') as HTMLButtonElement;
const btnPlay = document.getElementById('btn-play') as HTMLButtonElement;
const btnTestOk = document.getElementById('btn-test-ok') as HTMLButtonElement;
const btnTestBad = document.getElementById('btn-test-bad') as HTMLButtonElement;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let info: PlaylistInfo | null = null;
let mediaSource: MediaSource | null = null;
let videoSB: SourceBuffer | null = null;
let audioSB: SourceBuffer | null = null;
let videoSegIdx = 0;
let audioSegIdx = 0;

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

function log(msg: string, type: 'info' | 'ok' | 'err' | 'warn' | 'sep' = 'info') {
  const el = document.createElement('div');
  el.className = type;
  const ts = new Date().toLocaleTimeString('en', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  el.textContent = `[${ts}] ${msg}`;
  logEl.appendChild(el);
  logEl.scrollTop = logEl.scrollHeight;
}

// ---------------------------------------------------------------------------
// State display
// ---------------------------------------------------------------------------

function updateState() {
  const rs = ['HAVE_NOTHING', 'HAVE_METADATA', 'HAVE_CURRENT_DATA', 'HAVE_FUTURE_DATA', 'HAVE_ENOUGH_DATA'];
  const mozHasAudio = (video as unknown as Record<string, unknown>).mozHasAudio;
  const mozHasVideo = (video as unknown as Record<string, unknown>).mozHasVideo;

  function row(key: string, val: string, className: string) {
    return `<div class="state-row"><span class="state-key">${key}</span><span class="${className}">${val}</span></div>`;
  }

  function boolRow(key: string, val: unknown) {
    if (val === undefined) return row(key, 'n/a', 'val-none');
    return row(key, String(val), val ? 'val-true' : 'val-false');
  }

  function rangeStr(r: TimeRanges | undefined) {
    if (!r || r.length === 0) return 'empty';
    return Array.from({ length: r.length }, (_, i) => `[${r.start(i).toFixed(2)},${r.end(i).toFixed(2)}]`).join(' ');
  }

  stateEl.innerHTML = [
    row('readyState', rs[video.readyState] ?? String(video.readyState), 'val'),
    boolRow('mozHasAudio', mozHasAudio),
    boolRow('mozHasVideo', mozHasVideo),
    row('ms.readyState', mediaSource?.readyState ?? 'none', mediaSource ? 'val' : 'val-none'),
    row('videoSB', videoSB ? rangeStr(videoSB.buffered) : 'none', videoSB ? 'val' : 'val-none'),
    row('audioSB', audioSB ? rangeStr(audioSB.buffered) : 'none', audioSB ? 'val' : 'val-none'),
  ].join('');
}

setInterval(updateState, 250);

for (const evt of ['loadedmetadata', 'loadeddata', 'canplay', 'playing', 'waiting', 'stalled', 'error'] as const) {
  video.addEventListener(evt, () => {
    log(`video: ${evt}`, evt === 'error' ? 'err' : 'info');
    updateState();
  });
}

// ---------------------------------------------------------------------------
// m3u8 parsing
// ---------------------------------------------------------------------------

function resolveUrl(url: string, base: string): string {
  if (url.startsWith('http')) return url;
  try {
    return new URL(url, base).href;
  } catch {
    return url;
  }
}

function parseMaster(text: string, baseUrl: string) {
  const lines = text.split('\n').map((l) => l.trim());
  let videoUrl = '';
  let audioUrl = '';
  let codecsAttr = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    if (line.startsWith('#EXT-X-MEDIA:') && /TYPE=AUDIO/.test(line) && !audioUrl) {
      const m = line.match(/URI="([^"]+)"/);
      if (m) audioUrl = resolveUrl(m[1]!, baseUrl);
    }

    if (line.startsWith('#EXT-X-STREAM-INF:') && !videoUrl) {
      const cm = line.match(/CODECS="([^"]+)"/);
      if (cm) codecsAttr = cm[1]!;
      const next = lines[i + 1];
      if (next && !next.startsWith('#')) videoUrl = resolveUrl(next, baseUrl);
    }
  }

  return { videoUrl, audioUrl, codecsAttr };
}

function parseMedia(text: string, baseUrl: string) {
  const lines = text.split('\n').map((l) => l.trim());
  let initUrl = '';
  const segmentUrls: string[] = [];

  for (const line of lines) {
    if (line.startsWith('#EXT-X-MAP:')) {
      const m = line.match(/URI="([^"]+)"/);
      if (m) initUrl = resolveUrl(m[1]!, baseUrl);
    }
    if (line && !line.startsWith('#')) segmentUrls.push(resolveUrl(line, baseUrl));
  }

  return { initUrl, segmentUrls };
}

function splitCodecs(codecsAttr: string) {
  const parts = codecsAttr.split(',').map((c) => c.trim());
  const video = parts.filter((c) => /^(avc|hvc|vp0|av0)/i.test(c)).join(',');
  const audio = parts.filter((c) => /^(mp4a|ac-3|ec-3|opus)/i.test(c)).join(',');
  return { video: video || 'avc1.64001f', audio: audio || 'mp4a.40.2' };
}

// ---------------------------------------------------------------------------
// Parse button
// ---------------------------------------------------------------------------

btnParse.addEventListener('click', async () => {
  btnParse.disabled = true;
  log('--- Parsing HLS playlist ---', 'sep');
  const url = urlInput.value.trim();
  log(`GET ${url}`);

  try {
    const masterText = await fetch(url).then((r) => r.text());
    const { videoUrl, audioUrl, codecsAttr } = parseMaster(masterText, url);

    if (!videoUrl) throw new Error('No video rendition found in master playlist');
    log(`Video playlist: ${videoUrl}`, 'ok');
    log(`Audio playlist: ${audioUrl || '(none — muxed?)'}`, audioUrl ? 'ok' : 'warn');

    const [videoText, audioText] = await Promise.all([
      fetch(videoUrl).then((r) => r.text()),
      audioUrl ? fetch(audioUrl).then((r) => r.text()) : Promise.resolve(''),
    ]);

    const videoMedia = parseMedia(videoText, videoUrl);
    const audioMedia = audioUrl ? parseMedia(audioText, audioUrl) : { initUrl: '', segmentUrls: [] };

    const codecs = splitCodecs(codecsAttr);
    log(`Video codec: ${codecs.video}`, 'ok');
    log(`Audio codec: ${codecs.audio}`, 'ok');
    log(`Video init: ${videoMedia.initUrl}`, 'ok');
    log(`Audio init: ${audioMedia.initUrl || '(none)'}`, audioMedia.initUrl ? 'ok' : 'warn');
    log(`Video segments: ${videoMedia.segmentUrls.length}, Audio segments: ${audioMedia.segmentUrls.length}`, 'ok');

    if (!audioUrl || !audioMedia.initUrl) {
      log('⚠ No separate audio playlist — test requires demuxed audio/video HLS', 'warn');
    }

    info = {
      videoCodec: codecs.video,
      audioCodec: codecs.audio,
      videoInitUrl: videoMedia.initUrl,
      audioInitUrl: audioMedia.initUrl,
      videoSegmentUrls: videoMedia.segmentUrls.slice(0, 6),
      audioSegmentUrls: audioMedia.segmentUrls.slice(0, 6),
    };

    codecInfoEl.textContent = `video/mp4; codecs="${info.videoCodec}"   |   audio/mp4; codecs="${info.audioCodec}"`;
    codecInfoEl.classList.add('visible');

    btnMs.disabled = false;
    btnTestOk.disabled = !audioMedia.initUrl;
    btnTestBad.disabled = !audioMedia.initUrl;
  } catch (e) {
    log(`Error: ${e}`, 'err');
    btnParse.disabled = false;
  }
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

btnReset.addEventListener('click', () => {
  if (mediaSource && mediaSource.readyState === 'open') {
    try {
      mediaSource.endOfStream();
    } catch {
      /* ignore */
    }
  }
  video.src = '';
  mediaSource = null;
  videoSB = null;
  audioSB = null;
  videoSegIdx = 0;
  audioSegIdx = 0;
  btnVseg.textContent = 'Append Video Seg 1';
  btnAseg.textContent = 'Append Audio Seg 1';
  for (const b of [btnMs, btnVsb, btnAsb, btnVinit, btnAinit, btnVseg, btnAseg, btnPlay]) b.disabled = true;
  btnParse.disabled = false;
  log('--- Reset ---', 'sep');
  updateState();
});

// ---------------------------------------------------------------------------
// Manual setup
// ---------------------------------------------------------------------------

btnMs.addEventListener('click', () => {
  mediaSource = new MediaSource();
  mediaSource.addEventListener(
    'sourceopen',
    () => {
      log('MediaSource: sourceopen', 'ok');
      btnVsb.disabled = false;
      btnAsb.disabled = false;
      updateState();
    },
    { once: true }
  );
  mediaSource.addEventListener('sourceended', () => {
    log('MediaSource: sourceended', 'info');
    updateState();
  });
  mediaSource.addEventListener('sourceclose', () => {
    log('MediaSource: sourceclose', 'warn');
    updateState();
  });
  video.src = URL.createObjectURL(mediaSource);
  btnMs.disabled = true;
  log('MediaSource created, attaching to video…');
});

function addSB(type: 'video' | 'audio') {
  if (!mediaSource || !info) return;
  const mime = type === 'video' ? `video/mp4; codecs="${info.videoCodec}"` : `audio/mp4; codecs="${info.audioCodec}"`;
  try {
    const sb = mediaSource.addSourceBuffer(mime);
    sb.addEventListener('updateend', updateState);
    sb.addEventListener('error', (e) => {
      log(`${type} SB error: ${e}`, 'err');
      updateState();
    });
    log(`${type} SourceBuffer added: ${mime}`, 'ok');
    if (type === 'video') {
      videoSB = sb;
      btnVsb.disabled = true;
      btnVinit.disabled = false;
    } else {
      audioSB = sb;
      btnAsb.disabled = true;
      btnAinit.disabled = false;
    }
    updateState();
  } catch (e) {
    log(`Failed addSourceBuffer(${mime}): ${e}`, 'err');
  }
}

btnVsb.addEventListener('click', () => addSB('video'));
btnAsb.addEventListener('click', () => addSB('audio'));

// ---------------------------------------------------------------------------
// Append helper
// ---------------------------------------------------------------------------

async function append(sb: SourceBuffer, url: string, label: string): Promise<void> {
  log(`Fetching ${label}…`);
  const data = await fetch(url).then((r) => r.arrayBuffer());
  log(`${label}: ${data.byteLength} bytes`);

  if (sb.updating)
    await new Promise<void>((resolve) => {
      sb.addEventListener('updateend', () => resolve(), { once: true });
    });

  return new Promise<void>((resolve, reject) => {
    const onEnd = () => {
      cleanup();
      log(`${label}: updateend ✓`, 'ok');
      resolve();
    };
    const onErr = () => {
      cleanup();
      reject(new Error(`${label}: SourceBuffer error`));
    };
    const cleanup = () => {
      sb.removeEventListener('updateend', onEnd);
      sb.removeEventListener('error', onErr);
    };
    sb.addEventListener('updateend', onEnd);
    sb.addEventListener('error', onErr);
    try {
      sb.appendBuffer(data);
    } catch (e) {
      cleanup();
      reject(e);
    }
  });
}

// ---------------------------------------------------------------------------
// Manual step buttons
// ---------------------------------------------------------------------------

btnVinit.addEventListener('click', async () => {
  if (!videoSB || !info?.videoInitUrl) return;
  btnVinit.disabled = true;
  try {
    await append(videoSB, info.videoInitUrl, 'video init');
    btnVseg.disabled = false;
  } catch (e) {
    log(`${e}`, 'err');
  }
  updateState();
});

btnAinit.addEventListener('click', async () => {
  if (!audioSB || !info?.audioInitUrl) return;
  btnAinit.disabled = true;
  try {
    await append(audioSB, info.audioInitUrl, 'audio init');
    btnAseg.disabled = false;
  } catch (e) {
    log(`${e}`, 'err');
  }
  updateState();
});

btnVseg.addEventListener('click', async () => {
  if (!videoSB || !info) return;
  const url = info.videoSegmentUrls[videoSegIdx];
  if (!url) {
    log('No more video segments', 'warn');
    return;
  }
  try {
    await append(videoSB, url, `video seg ${videoSegIdx + 1}`);
    videoSegIdx++;
    btnVseg.textContent = `Append Video Seg ${videoSegIdx + 1}`;
    btnPlay.disabled = false;
  } catch (e) {
    log(`${e}`, 'err');
  }
  updateState();
});

btnAseg.addEventListener('click', async () => {
  if (!audioSB || !info) return;
  const url = info.audioSegmentUrls[audioSegIdx];
  if (!url) {
    log('No more audio segments', 'warn');
    return;
  }
  try {
    await append(audioSB, url, `audio seg ${audioSegIdx + 1}`);
    audioSegIdx++;
    btnAseg.textContent = `Append Audio Seg ${audioSegIdx + 1}`;
    btnPlay.disabled = false;
  } catch (e) {
    log(`${e}`, 'err');
  }
  updateState();
});

btnPlay.addEventListener('click', () => {
  video.play().catch((e) => log(`play() rejected: ${e}`, 'warn'));
});

// ---------------------------------------------------------------------------
// Test scenarios
// ---------------------------------------------------------------------------

async function freshSetup(): Promise<void> {
  if (mediaSource && mediaSource.readyState === 'open') {
    try {
      mediaSource.endOfStream();
    } catch {
      /* ignore */
    }
  }
  video.src = '';
  videoSB = null;
  audioSB = null;
  videoSegIdx = 0;
  audioSegIdx = 0;

  mediaSource = new MediaSource();

  await new Promise<void>((resolve) => {
    mediaSource!.addEventListener(
      'sourceopen',
      () => {
        log('MediaSource: sourceopen', 'ok');

        videoSB = mediaSource!.addSourceBuffer(`video/mp4; codecs="${info!.videoCodec}"`);
        videoSB.addEventListener('updateend', updateState);
        log(`Video SB added`, 'ok');

        audioSB = mediaSource!.addSourceBuffer(`audio/mp4; codecs="${info!.audioCodec}"`);
        audioSB.addEventListener('updateend', updateState);
        log(`Audio SB added`, 'ok');

        resolve();
      },
      { once: true }
    );

    video.src = URL.createObjectURL(mediaSource!);
  });
}

async function runTest(label: string, steps: Array<() => Promise<void>>) {
  for (const b of [btnTestOk, btnTestBad, btnParse, btnReset]) b.disabled = true;
  log(`--- ${label} ---`, 'sep');

  try {
    await freshSetup();
    for (const step of steps) await step();
    updateState();
    log(`Test complete — check mozHasAudio above`, 'ok');
    video.play().catch(() => {
      /* autoplay may be blocked */
    });
  } catch (e) {
    log(`Test error: ${e}`, 'err');
  }

  for (const b of [btnTestOk, btnTestBad, btnParse, btnReset]) b.disabled = false;
  btnPlay.disabled = false;
}

btnTestOk.addEventListener('click', () => {
  if (!info) return;
  runTest('CORRECT ORDER: both inits → both segments', [
    () => {
      log('Step 1: append video init');
      return append(videoSB!, info!.videoInitUrl, 'video init');
    },
    () => {
      log('Step 2: append audio init');
      return append(audioSB!, info!.audioInitUrl, 'audio init');
    },
    () => {
      log('Step 3: append video seg 1');
      return append(videoSB!, info!.videoSegmentUrls[0]!, 'video seg 1');
    },
    () => {
      log('Step 4: append audio seg 1');
      return append(audioSB!, info!.audioSegmentUrls[0]!, 'audio seg 1');
    },
  ]);
});

btnTestBad.addEventListener('click', () => {
  if (!info) return;
  runTest('BUG ORDER: video init → video seg → audio init → audio seg', [
    () => {
      log('Step 1: append video init');
      return append(videoSB!, info!.videoInitUrl, 'video init');
    },
    () => {
      log('Step 2: append video seg 1 ← BEFORE audio init');
      return append(videoSB!, info!.videoSegmentUrls[0]!, 'video seg 1');
    },
    () => {
      log('Step 3: append audio init (too late?)');
      return append(audioSB!, info!.audioInitUrl, 'audio init');
    },
    () => {
      log('Step 4: append audio seg 1');
      return append(audioSB!, info!.audioSegmentUrls[0]!, 'audio seg 1');
    },
  ]);
});
