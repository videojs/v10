import '@app/styles.css';
import '@videojs/html/video/player';
import '@videojs/html/media/hls-video';
import { renderMuxStoryboard } from '@app/shared/html/mux-storyboard';
import { createHtmlSandboxState, createLatestLoader } from '@app/shared/html/sandbox-state';
import { loadVideoSkinTag } from '@app/shared/html/skins';
import { onSkinChange, onSourceChange } from '@app/shared/sandbox-listener';
import { SOURCES } from '@app/shared/sources';

const html = String.raw;

const state = createHtmlSandboxState();
const loadLatest = createLatestLoader();

async function render() {
  const tag = await loadLatest(() => loadVideoSkinTag(state.skin, state.styling));
  if (!tag) return;

  document.getElementById('root')!.innerHTML = html`
    <video-player>
      <${tag} class="w-full aspect-video max-w-4xl mx-auto">
        <hls-video slot="media" src="${SOURCES[state.source].url}" playsinline crossorigin="anonymous">
          ${renderMuxStoryboard(state.source)}
        </hls-video>
      </${tag}>
    </video-player>
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
