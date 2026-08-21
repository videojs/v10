import '@app/styles.css';
import '@videojs/html/video/player';
import '@videojs/html/media/gif-video';
import { createHtmlSandboxState, createLatestLoader } from '@app/shared/html/sandbox-state';
import { loadVideoSkinTag } from '@app/shared/html/skins';
import { onSkinChange } from '@app/shared/sandbox-listener';
import { GIF_VIDEO_SRC } from '@app/shared/sources';

const html = String.raw;

const state = createHtmlSandboxState();
const loadLatest = createLatestLoader();

async function render() {
  const tag = await loadLatest(() => loadVideoSkinTag(state.skin, state.styling));
  if (!tag) return;

  document.getElementById('root')!.innerHTML = html`
    <video-player>
      <${tag} class="aspect-video max-w-4xl mx-auto">
        <gif-video class="block w-full h-full" src="${GIF_VIDEO_SRC}" loop></gif-video>
      </${tag}>
    </video-player>
  `;
}

render();

onSkinChange((skin) => {
  state.skin = skin;
  render();
});
