import '@videojs/html/audio/player';
import '@videojs/html/audio/skin.tailwind';
import '@videojs/html/audio/minimal-skin.tailwind';
import { TAILWIND_SKIN_TAGS } from '../shared/html/skin-tags';
import { setupAudioTailwind } from '../shared/html/tailwind-setup';
import { getInitialSkin, getInitialSource, onSkinChange, onSourceChange } from '../shared/sandbox-listener';
import type { SourceId } from '../shared/sources';
import { SOURCES } from '../shared/sources';
import type { Skin } from '../types';

setupAudioTailwind();

const html = String.raw;

let currentSkin: Skin = getInitialSkin();
let currentSource: SourceId = getInitialSource(true);

function render() {
  const tag = TAILWIND_SKIN_TAGS[currentSkin].audio;

  document.getElementById('root')!.innerHTML = html`
    <div class="w-full max-w-xl mx-auto">
      <audio-player>
        <${tag}>
          <audio slot="media" src="${SOURCES[currentSource].url}"></audio>
        </${tag}>
      </audio-player>
    </div>
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
