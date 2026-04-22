import '@app/styles.css';
import '@videojs/html/video/player';
import '@videojs/html/media/hls-video';
import { createHtmlSandboxState, createLatestLoader } from '@app/shared/html/sandbox-state';
import { loadVideoSkinTag } from '@app/shared/html/skins';
import { renderStoryboard } from '@app/shared/html/storyboard';
import { onSkinChange, onSourceChange } from '@app/shared/sandbox-listener';
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
  const liveAttrs = live ? 'autoplay muted' : '';

  document.getElementById('root')!.innerHTML = html`
    <video-player>
      <${tag} class="aspect-video max-w-4xl mx-auto">
        <hls-video src="${SOURCES[state.source].url}" ${liveAttrs} playsinline crossorigin="anonymous">
          ${renderStoryboard(storyboard)}
        </hls-video>
        ${poster ? html`<img slot="poster" src="${poster}" alt="Video poster" />` : ''}
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
