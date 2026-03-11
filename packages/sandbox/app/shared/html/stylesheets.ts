import type { Skin } from '../../types';

const videoStylesheets: Record<Skin, string> = {
  default: new URL('@videojs/html/video/skin.css', import.meta.url).href,
  minimal: new URL('@videojs/html/video/minimal-skin.css', import.meta.url).href,
};

const audioStylesheets: Record<Skin, string> = {
  default: new URL('@videojs/html/audio/skin.css', import.meta.url).href,
  minimal: new URL('@videojs/html/audio/minimal-skin.css', import.meta.url).href,
};

function loadStylesheet(url: string) {
  // Remove any existing link for this URL to force reload
  const existing = document.querySelector(`link[rel="stylesheet"][href="${url}"]`);
  existing?.remove();

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  document.head.appendChild(link);
}

export function loadVideoStylesheets(skin: Skin) {
  loadStylesheet(videoStylesheets[skin]);
}

export function loadAudioStylesheets(skin: Skin) {
  loadStylesheet(audioStylesheets[skin]);
}
