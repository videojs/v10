import type { Skin } from '../../types';

const videoStylesheets = {
  default: new URL('@videojs/html/video/skin.css', import.meta.url).href,
  neutral: new URL('@videojs/html/video/neutral-skin.css', import.meta.url).href,
  starter: new URL('@videojs/html/video/starter-skin.css', import.meta.url).href,
} satisfies Partial<Record<Skin, string>>;

const liveVideoStylesheets = {
  default: new URL('@videojs/html/live-video/skin.css', import.meta.url).href,
  neutral: new URL('@videojs/html/live-video/neutral-skin.css', import.meta.url).href,
  starter: new URL('@videojs/html/live-video/starter-skin.css', import.meta.url).href,
} satisfies Partial<Record<Skin, string>>;

const audioStylesheets = {
  default: new URL('@videojs/html/audio/skin.css', import.meta.url).href,
  neutral: new URL('@videojs/html/audio/neutral-skin.css', import.meta.url).href,
  starter: new URL('@videojs/html/audio/starter-skin.css', import.meta.url).href,
} satisfies Partial<Record<Skin, string>>;

const liveAudioStylesheets = {
  default: new URL('@videojs/html/live-audio/skin.css', import.meta.url).href,
  neutral: new URL('@videojs/html/live-audio/neutral-skin.css', import.meta.url).href,
  starter: new URL('@videojs/html/live-audio/starter-skin.css', import.meta.url).href,
} satisfies Partial<Record<Skin, string>>;

const loading = new Map<string, { href: string; promise: Promise<void> }>();

/**
 * One stylesheet per slot. A repeat request for the same URL shares the in-flight load, and a new URL replaces the old
 * sheet only once it has loaded: renders can overlap, and removing a `<link>` another render still awaits would leave
 * that render hanging.
 */
function loadStylesheet(id: string, url: string): Promise<void> {
  const current = loading.get(id);
  if (current?.href === url) return current.promise;

  const link = document.createElement('link');
  const promise = new Promise<void>((resolve, reject) => {
    link.addEventListener(
      'load',
      () => {
        for (const stale of document.querySelectorAll(`link[rel="stylesheet"][data-sandbox-stylesheet="${id}"]`)) {
          if (stale !== link) stale.remove();
        }

        resolve();
      },
      { once: true }
    );
    link.addEventListener('error', () => reject(new Error(`Could not load skin stylesheet: ${url}`)), { once: true });
    link.dataset.sandboxStylesheet = id;
    link.rel = 'stylesheet';
    link.href = url;
    document.head.appendChild(link);
  });

  loading.set(id, { href: url, promise });

  return promise;
}

export function loadVideoStylesheets(skin: Skin, live = false): Promise<void> {
  const url = (live ? liveVideoStylesheets : videoStylesheets)[skin];
  if (!url) throw new Error(`Video skin stylesheet ${skin} is unavailable.`);

  return loadStylesheet('video-skin', url);
}

export function loadAudioStylesheets(skin: Skin, live = false): Promise<void> {
  const url = (live ? liveAudioStylesheets : audioStylesheets)[skin];
  if (!url) throw new Error(`Audio skin stylesheet ${skin} is unavailable.`);

  return loadStylesheet('audio-skin', url);
}
