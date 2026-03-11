import '@app/styles.css';
import '@videojs/html/audio/player';
import '@videojs/html/audio/skin';
import '@videojs/html/audio/minimal-skin';
import { CSS_SKIN_TAGS } from '@app/shared/html/skin-tags';
import { loadAudioStylesheets } from '@app/shared/html/stylesheets';
import { getInitialSkin, getInitialSource, onSkinChange, onSourceChange } from '@app/shared/sandbox-listener';
import type { SourceId } from '@app/shared/sources';
import { SOURCES } from '@app/shared/sources';
import type { Skin } from '@app/types';

const html = String.raw;

let currentSkin: Skin = getInitialSkin();
let currentSource: SourceId = getInitialSource(true);

function render() {
  const tag = CSS_SKIN_TAGS[currentSkin].audio;

  loadAudioStylesheets(currentSkin);

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
