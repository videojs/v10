import '@app/styles.css';
import '@videojs/html/video/player';
import '@videojs/html/media/native-hls-video';
import { createHtmlSandboxState, createLatestLoader, renderMediaAttrs } from '@app/shared/html/sandbox-state';
import { loadVideoSkinTag } from '@app/shared/html/skins';
import { renderStoryboard } from '@app/shared/html/storyboard';
import {
  onAutoplayChange,
  onLoopChange,
  onMutedChange,
  onPreloadChange,
  onSkinChange,
  onSourceChange,
} from '@app/shared/sandbox-listener';
import { getPosterSrc, getStoryboardSrc, isLiveSource, SOURCES } from '@app/shared/sources';

const html = String.raw;

const state = createHtmlSandboxState();
const loadLatest = createLatestLoader();

async function render() {
  const live = isLiveSource(state.source);
  const tag = await loadLatest(() => loadVideoSkinTag(state.skin, state.styling, { live }));
  if (!tag) return;

  const storyboard = getStoryboardSrc(state.source);
  const poster = getPosterSrc(state.source);
  const mediaAttrs = renderMediaAttrs(state);
  const playerTag = live ? 'live-video-player' : 'video-player';

  document.getElementById('root')!.innerHTML = html`
    <${playerTag}>
      <${tag} class="w-full aspect-video max-w-4xl mx-auto">
        <native-hls-video src="${SOURCES[state.source].url}" ${mediaAttrs} playsinline crossorigin="anonymous">
          ${renderStoryboard(storyboard)}
        </native-hls-video>
        ${poster ? html`<img slot="poster" src="${poster}" alt="Video poster" />` : ''}
      </${tag}>
    </${playerTag}>
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

onPreloadChange((preload) => {
  state.preload = preload;
  render();
});
