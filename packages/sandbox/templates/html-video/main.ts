import '@app/styles.css';
import '@videojs/html/video/player';
import '@videojs/html/video/skin';
import '@videojs/html/video/minimal-skin';
import { CSS_SKIN_TAGS } from '@app/shared/html/skin-tags';
import { loadVideoStylesheets } from '@app/shared/html/stylesheets';
import { getInitialSkin, getInitialSource, onSkinChange, onSourceChange } from '@app/shared/sandbox-listener';
import type { SourceId } from '@app/shared/sources';
import { SOURCES } from '@app/shared/sources';
import type { Skin } from '@app/types';

const html = String.raw;

let currentSkin: Skin = getInitialSkin();
let currentSource: SourceId = getInitialSource();

function render() {
  const tag = CSS_SKIN_TAGS[currentSkin].video;

  loadVideoStylesheets(currentSkin);

  document.getElementById('root')!.innerHTML = html`
    <video-player>
      <${tag} class="w-full aspect-video max-w-4xl mx-auto">
        <video slot="media" src="${SOURCES[currentSource].url}" playsinline></video>
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
