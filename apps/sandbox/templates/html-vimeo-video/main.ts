import '@app/styles.css';
import '@videojs/html/video/player';
import '@videojs/html/media/vimeo-video';
import { createHtmlSandboxState, createLatestLoader } from '@app/shared/html/sandbox-state';
import { loadVideoSkinTag } from '@app/shared/html/skins';
import {
  onAutoplayChange,
  onLoopChange,
  onMutedChange,
  onSkinChange,
  onSourceChange,
} from '@app/shared/sandbox-listener';
import { SOURCES } from '@app/shared/sources';

const html = String.raw;

const state = createHtmlSandboxState(false, true);
const loadLatest = createLatestLoader();

async function render() {
  const tag = await loadLatest(() => loadVideoSkinTag(state.skin, state.styling));
  if (!tag) return;

  const autoplay = state.autoplay ? 'autoplay' : '';
  const muted = state.muted ? 'muted' : '';
  const loop = state.loop ? 'loop' : '';

  document.getElementById('root')!.innerHTML = html`
    <video-player>
      <${tag} class="aspect-video max-w-4xl mx-auto">
        <vimeo-video
          src="${SOURCES[state.source].url}"
          ${autoplay}
          ${muted}
          ${loop}
        ></vimeo-video>
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

onAutoplayChange((autoplay) => {
  state.autoplay = autoplay;
  render();
});

onMutedChange((muted) => {
  state.muted = muted;
  render();
});

onLoopChange((loop) => {
  state.loop = loop;
  render();
});
