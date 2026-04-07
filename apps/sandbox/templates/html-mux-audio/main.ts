import '@app/styles.css';
import '@videojs/html/audio/player';
import '@videojs/html/media/mux-audio';
import { createHtmlSandboxState, createLatestLoader } from '@app/shared/html/sandbox-state';
import { loadAudioSkinTag } from '@app/shared/html/skins';
import { onSkinChange, onSourceChange } from '@app/shared/sandbox-listener';
import { SOURCES } from '@app/shared/sources';

const html = String.raw;

const state = createHtmlSandboxState();
const loadLatest = createLatestLoader();

async function render() {
  const tag = await loadLatest(() => loadAudioSkinTag(state.skin, state.styling));
  if (!tag) return;

  const sourceAttr =
    SOURCES[state.source].type === 'mp4'
      ? `src="${SOURCES[state.source].url}"`
      : `playback-id="${SOURCES[state.source].playbackId}"`;

  document.getElementById('root')!.innerHTML = html`
    <div class="w-full max-w-xl mx-auto">
      <audio-player>
        <${tag}>
          <mux-audio ${sourceAttr} debug crossorigin="anonymous"></mux-audio>
        </${tag}>
      </audio-player>
    </div>
  `;
}

render();

onSkinChange((skin) => {
  state.skin = skin;
  render();
});

onSourceChange((source) => {
  state.source = source;
  render();
});
