import '@app/styles.css';
import { bindSandboxHtmlLocaleChange, prepareSandboxHtmlLocale, wrapSandboxHtmlI18n } from '@app/shared/html/i18n';
import '@videojs/html/video/player';
import '@videojs/html/media/mux-video';
import { createHtmlSandboxState, createLatestLoader, renderMediaAttrs } from '@app/shared/html/sandbox-state';
import { loadVideoSkinTag } from '@app/shared/html/skins';
import { getPlaybackId } from '@app/shared/mux';
import {
  onAutoplayChange,
  onLoopChange,
  onMutedChange,
  onPreloadChange,
  onSkinChange,
  onSourceChange,
} from '@app/shared/sandbox-listener';
import { getPlaceholderSrc, getPosterSrc, isLiveSource, SOURCES } from '@app/shared/sources';

const html = String.raw;

const state = createHtmlSandboxState();
const loadLatest = createLatestLoader();

async function render() {
  await prepareSandboxHtmlLocale();

  const live = isLiveSource(state.source);
  const tag = await loadLatest(() => loadVideoSkinTag(state.skin, state.styling, { live }));
  if (!tag) return;

  const poster = getPosterSrc(state.source);
  const placeholder = getPlaceholderSrc(state.source);
  const mediaAttrs = renderMediaAttrs(state);
  const playerTag = live ? 'live-video-player' : 'video-player';

  // Prefer the Mux playback ID; fall back to a raw src for non-Mux sources.
  const playbackId = getPlaybackId(state.source);
  const sourceAttr = playbackId ? `playback-id="${playbackId}"` : `src="${SOURCES[state.source].url}"`;

  document.getElementById('root')!.innerHTML = wrapSandboxHtmlI18n(html`
    <${playerTag}>
      <${tag} class="aspect-video max-w-4xl mx-auto"${placeholder ? ` placeholdersrc="${placeholder}"` : ''}>
        <mux-video ${sourceAttr} ${mediaAttrs} playsinline crossorigin="anonymous"></mux-video>
        ${poster ? html`<img slot="poster" src="${poster}" alt="Video poster" />` : ''}
      </${tag}>
    </${playerTag}>
  `);
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

bindSandboxHtmlLocaleChange(render);
