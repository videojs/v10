import '@videojs/html/video/player';
import '@videojs/html/video/skin.tailwind';
import '@videojs/html/video/minimal-skin.tailwind';
import { TAILWIND_SKIN_TAGS } from '../shared/html/skin-tags';
import { setupVideoTailwind } from '../shared/html/tailwind-setup';
import { getInitialSkin, getInitialSource, onSkinChange, onSourceChange } from '../shared/sandbox-listener';
import type { SourceId } from '../shared/sources';
import { SOURCES } from '../shared/sources';
import type { Skin } from '../types';

setupVideoTailwind();

const html = String.raw;

let currentSkin: Skin = getInitialSkin();
let currentSource: SourceId = getInitialSource();

function render() {
  const tag = TAILWIND_SKIN_TAGS[currentSkin].video;

  document.getElementById('root')!.innerHTML = html`
    <video-player class="contents">
      <${tag} class="w-full aspect-video max-w-4xl mx-auto">
        <video slot="media" src="${SOURCES[currentSource].url}"></video>
      </${tag}>
    </video-player>
  `;
}

render();

onSkinChange((skin) => {
  currentSkin = skin;
  render();
});

onSourceChange((source) => {
  currentSource = source;
  render();
});
