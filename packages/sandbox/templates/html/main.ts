// HTML sandbox — Web player with skin switching
// http://localhost:5173/html/

import '@videojs/html/video/player';
import '@videojs/html/video/skin';
import '@videojs/html/video/minimal-skin';
import { SKINS } from '../constants';
import type { Skin } from '../types';

const html = String.raw;

const VIDEO_SRC = 'https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4';

const skinTags: Record<Skin, string> = {
  default: 'video-skin',
  minimal: 'video-minimal-skin',
};

const stylesheets: Record<Skin, string> = {
  default: new URL('@videojs/html/video/skin.css', import.meta.url).href,
  minimal: new URL('@videojs/html/video/minimal-skin.css', import.meta.url).href,
};

let currentLink: HTMLLinkElement | null = null;

function loadStylesheet(url: string) {
  currentLink?.remove();
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  document.head.appendChild(link);
  currentLink = link;
}

function render(skin: Skin) {
  const tag = skinTags[skin];

  loadStylesheet(stylesheets[skin]);

  document.getElementById('player')!.innerHTML = html`
    <video-player>
      <${tag}>
        <video slot="media" src="${VIDEO_SRC}"></video>
      </${tag}>
    </video-player>
  `;
}

// Skin switcher
const select = document.getElementById('skin-select') as HTMLSelectElement;
for (const skin of SKINS) {
  const option = document.createElement('option');
  option.value = skin;
  option.textContent = skin;
  select.appendChild(option);
}
select.addEventListener('change', () => render(select.value as Skin));

// Initial render
render('default');
