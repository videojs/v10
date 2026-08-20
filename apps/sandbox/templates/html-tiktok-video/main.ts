import '@app/styles.css';
import '@videojs/html/video/player';
import '@videojs/html/media/tiktok-video';
import { createHtmlSandboxState, createLatestLoader } from '@app/shared/html/sandbox-state';
import { loadVideoSkinTag } from '@app/shared/html/skins';
import { onSkinChange } from '@app/shared/sandbox-listener';
import { TIKTOK_VIDEO_SRC } from '@app/shared/sources';

const html = String.raw;

const state = createHtmlSandboxState();
const loadLatest = createLatestLoader();

async function render() {
  const tag = await loadLatest(() => loadVideoSkinTag(state.skin, state.styling));
  if (!tag) return;

  document.getElementById('root')!.innerHTML = html`
    <video-player>
      <${tag} class="aspect-video max-w-4xl mx-auto">
        <!-- The host element floors itself at TikTok's portrait 325x578; clear that so it fits a landscape box. -->
        <tiktok-video class="block w-full h-full min-w-0 min-h-0" src="${TIKTOK_VIDEO_SRC}" playsinline></tiktok-video>
      </${tag}>
    </video-player>
  `;
}

render();

onSkinChange((skin) => {
  state.skin = skin;
  render();
});
