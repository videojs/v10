import '@app/styles.css';
import { bindSandboxHtmlLocaleChange, prepareSandboxHtmlLocale, wrapSandboxHtmlI18n } from '@app/shared/html/i18n';
import '@videojs/html/video/player';
import '@videojs/html/media/google-cast';
import '@videojs/html/media/mux-data';
import '@videojs/html/media/mux-video';
import { createHtmlSandboxState, createLatestLoader, renderMediaAttrs } from '@app/shared/html/sandbox-state';
import { loadVideoSkinTag } from '@app/shared/html/skins';
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

  // A source carrying signed tokens has no room in the `src` attribute, so it is
  // assigned as an object below instead.
  const { source, url } = SOURCES[state.source];
  const srcAttr = source ? '' : ` src="${url}"`;

  document.getElementById('root')!.innerHTML = wrapSandboxHtmlI18n(html`
    <${playerTag}>
      <${tag} class="aspect-video max-w-4xl mx-auto"${placeholder ? ` placeholdersrc="${placeholder}"` : ''}>
        <!-- The storyboard track is derived automatically from the Mux src. -->
        <mux-video${srcAttr} ${mediaAttrs} playsinline crossorigin="anonymous"></mux-video>
        <!-- Mux Data and Cast are opt-in media components; no env key is needed for Mux-hosted sources. -->
        <mux-data player-software-name="mux-video"></mux-data>
        <google-cast></google-cast>
        ${poster ? html`<img slot="poster" src="${poster}" alt="Video poster" />` : ''}
      </${tag}>
    </${playerTag}>
  `);

  // A Mux `source.drm.token` becomes the FairPlay / Widevine / PlayReady license
  // servers; the playback, poster, and storyboard tokens sign the rest.
  if (source) {
    document.querySelector('mux-video')!.source = source;
  }
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
