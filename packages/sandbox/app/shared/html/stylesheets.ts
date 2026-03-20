import type { Skin } from '../../types';

const videoStylesheets: Record<Skin, string> = {
  default: new URL('@videojs/html/video/skin.css', import.meta.url).href,
  minimal: new URL('@videojs/html/video/minimal-skin.css', import.meta.url).href,
};

const audioStylesheets: Record<Skin, string> = {
  default: new URL('@videojs/html/audio/skin.css', import.meta.url).href,
  minimal: new URL('@videojs/html/audio/minimal-skin.css', import.meta.url).href,
};

function loadStylesheet(id: string, url: string) {
  const existing = document.querySelector(`link[rel="stylesheet"][data-sandbox-stylesheet="${id}"]`);
  existing?.remove();

  const link = document.createElement('link');
  link.dataset.sandboxStylesheet = id;
  link.rel = 'stylesheet';
  link.href = url;
  document.head.appendChild(link);
}

export function loadVideoStylesheets(skin: Skin) {
  loadStylesheet('video-skin', videoStylesheets[skin]);
}

export function loadAudioStylesheets(skin: Skin) {
  loadStylesheet('audio-skin', audioStylesheets[skin]);
}
