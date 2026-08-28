import '@app/styles.css';
import '@videojs/html/audio/player';
import '@videojs/html/live-audio/player';
import '@videojs/html/media/hls-audio';
import { createHtmlSandboxState, createLatestLoader, renderMediaAttrs } from '@app/shared/html/sandbox-state';
import { loadAudioSkinTag } from '@app/shared/html/skins';
import {
  onAutoplayChange,
  onLoopChange,
  onMutedChange,
  onPreloadChange,
  onSkinChange,
  onSourceChange,
} from '@app/shared/sandbox-listener';
import { isLiveSource, SOURCES } from '@app/shared/sources';

const html = String.raw;

const state = createHtmlSandboxState();
const loadLatest = createLatestLoader();

async function render() {
  const live = isLiveSource(state.source);
  const tag = await loadLatest(() => loadAudioSkinTag(state.skin, state.styling, { live }));
  if (!tag) return;

  const mediaAttrs = renderMediaAttrs(state);
  const playerTag = live ? 'live-audio-player' : 'audio-player';

  document.getElementById('root')!.innerHTML = html`
    <div class="w-full max-w-xl mx-auto">
      <${playerTag}>
        <${tag}>
          <hls-audio src="${SOURCES[state.source].url}" ${mediaAttrs} crossorigin></hls-audio>
        </${tag}>
      </${playerTag}>
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
