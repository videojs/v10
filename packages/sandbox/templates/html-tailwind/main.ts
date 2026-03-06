// HTML & Tailwind sandbox — Web player with Tailwind skins
// http://localhost:5173/html-tailwind/

import '@videojs/html/video/player';
import '@videojs/html/video/skin.tailwind';
import '@videojs/html/video/minimal-skin.tailwind';
import { SKINS } from '../constants';
import type { Skin } from '../types';

const html = String.raw;

const VIDEO_SRC = 'https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4';

const skinTags: Record<Skin, string> = {
  default: 'video-skin-tailwind',
  minimal: 'video-minimal-skin-tailwind',
};

function render(skin: Skin) {
  const tag = skinTags[skin];

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
