import type { Skin } from '../../types';

const videoStylesheets = {
  default: new URL('@videojs/html/video/skin.css', import.meta.url).href,
  minimal: new URL('@videojs/html/video/minimal-skin.css', import.meta.url).href,
} satisfies Record<Skin, string>;

const liveVideoStylesheets = {
  default: new URL('@videojs/html/live-video/skin.css', import.meta.url).href,
  minimal: new URL('@videojs/html/live-video/minimal-skin.css', import.meta.url).href,
} satisfies Record<Skin, string>;

const audioStylesheets = {
  default: new URL('@videojs/html/audio/skin.css', import.meta.url).href,
  minimal: new URL('@videojs/html/audio/minimal-skin.css', import.meta.url).href,
} satisfies Record<Skin, string>;

const liveAudioStylesheets = {
  default: new URL('@videojs/html/live-audio/skin.css', import.meta.url).href,
  minimal: new URL('@videojs/html/live-audio/minimal-skin.css', import.meta.url).href,
} satisfies Record<Skin, string>;

function loadStylesheet(id: string, url: string): Promise<void> {
  const existing = document.querySelector(`link[rel="stylesheet"][data-sandbox-stylesheet="${id}"]`);

  existing?.remove();

  const link = document.createElement('link');

  return new Promise((resolve, reject) => {
    link.addEventListener('load', () => resolve(), { once: true });
    link.addEventListener('error', () => reject(new Error(`Could not load skin stylesheet: ${url}`)), { once: true });
    link.dataset.sandboxStylesheet = id;
    link.rel = 'stylesheet';
    link.href = url;
    document.head.appendChild(link);
  });
}

export function loadVideoStylesheets(skin: Skin, live = false): Promise<void> {
  return loadStylesheet('video-skin', (live ? liveVideoStylesheets : videoStylesheets)[skin]);
}

export function loadAudioStylesheets(skin: Skin, live = false): Promise<void> {
  return loadStylesheet('audio-skin', (live ? liveAudioStylesheets : audioStylesheets)[skin]);
}
