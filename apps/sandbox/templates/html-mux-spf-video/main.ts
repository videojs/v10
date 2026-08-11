import '@app/styles.css';
import { bindSandboxHtmlLocaleChange, prepareSandboxHtmlLocale, wrapSandboxHtmlI18n } from '@app/shared/html/i18n';
import '@videojs/html/video/player';
import '@videojs/html/media/mux-video/spf';
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

// The SPF-backed `<mux-video>`, alongside the hls.js-backed `<mux-video>` in
// `html-mux-video`. Same element behavior — derived poster, storyboard track,
// `poster-time` — over the SPF engine.
//
// What differs is what it can play. SPF appends fMP4/CMAF only, so an MPEG-TS or
// DRM-protected playback ID is expected to surface the unsupported-source error,
// with console copy pointing at the hls.js-backed import. Those sources are left
// in the picker deliberately: failing well is part of what this page demos.
//
// Mux Data and Cast are absent because neither is wired to this flavor yet.

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
        ${poster ? html`<img slot="poster" src="${poster}" alt="Video poster" />` : ''}
      </${tag}>
    </${playerTag}>
  `);

  // `source.drm` is accepted but inert here: SPF prunes encrypted renditions and
  // reports unsupported DRM rather than fetching a license.
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
