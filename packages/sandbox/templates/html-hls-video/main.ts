import '@videojs/html/video/player';
import '@videojs/html/media/hls-video';
import '@videojs/html/video/skin';
import '@videojs/html/video/minimal-skin';
import { CSS_SKIN_TAGS } from '../shared/html/skin-tags';
import { loadVideoStylesheets } from '../shared/html/stylesheets';
import { getInitialSkin, getInitialSource, onSkinChange, onSourceChange } from '../shared/sandbox-listener';
import type { SourceId } from '../shared/sources';
import { SOURCES } from '../shared/sources';
import type { Skin } from '../types';

const html = String.raw;

let currentSkin: Skin = getInitialSkin();
let currentSource: SourceId = getInitialSource();

function render() {
  const tag = CSS_SKIN_TAGS[currentSkin].video;

  loadVideoStylesheets(currentSkin);

  document.getElementById('root')!.innerHTML = html`
    <video-player class="contents">
      <${tag} class="w-full aspect-video max-w-4xl mx-auto">
        <hls-video slot="media" src="${SOURCES[currentSource].url}"></hls-video>
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
