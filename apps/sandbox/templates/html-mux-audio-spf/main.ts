import '@app/styles.css';
import { bindSandboxHtmlLocaleChange, prepareSandboxHtmlLocale, wrapSandboxHtmlI18n } from '@app/shared/html/i18n';
import '@videojs/html/audio/player';
import '@videojs/html/media/google-cast';
import '@videojs/html/media/mux-audio/spf';
import '@videojs/html/media/mux-data';
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
import { SOURCES } from '@app/shared/sources';

// The SPF-backed `<mux-audio>`, alongside the hls.js-backed one in
// `html-mux-audio`. Same element behavior over the SPF *audio-only* engine, so
// only the audio renditions of the playback ID are fetched — the hls.js-backed
// flavor runs the full engine and downloads video renditions it never plays.
//
// What differs otherwise is what it can play. SPF appends fMP4/CMAF only, so an
// MPEG-TS or DRM-protected playback ID is expected to surface the
// unsupported-source error, with console copy pointing at the hls.js-backed
// import. Those sources are left in the picker deliberately: failing well is part
// of what this page demos.

const html = String.raw;

const state = createHtmlSandboxState();
const loadLatest = createLatestLoader();

async function render() {
  await prepareSandboxHtmlLocale();

  const tag = await loadLatest(() => loadAudioSkinTag(state.skin, state.styling));
  if (!tag) return;

  const mediaAttrs = renderMediaAttrs(state);

  // A source carrying signed tokens has no room in the `src` attribute, so it is
  // assigned as an object below instead.
  const { source, url } = SOURCES[state.source];
  const srcAttr = source ? '' : ` src="${url}"`;

  document.getElementById('root')!.innerHTML = wrapSandboxHtmlI18n(html`
    <div class="w-full max-w-xl mx-auto">
      <audio-player>
        <${tag}>
          <mux-audio${srcAttr} ${mediaAttrs} crossorigin="anonymous"></mux-audio>
          <!--
            Both are opt-in media components, and no env key is needed for Mux-hosted sources.
            Mux Data monitors this flavor from the media element alone: its engine integrations are
            hls.js and dash.js, so an SPF engine gets element-level data and says so in dev.
          -->
          <mux-data player-software-name="mux-audio"></mux-data>
          <google-cast></google-cast>
        </${tag}>
      </audio-player>
    </div>
  `);

  // `source.drm` is accepted but inert here: SPF prunes encrypted renditions and
  // reports unsupported DRM rather than fetching a license.
  if (source) {
    document.querySelector('mux-audio')!.source = source;
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
