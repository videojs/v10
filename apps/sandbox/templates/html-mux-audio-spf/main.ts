import '@app/styles.css';
import '@videojs/html/audio/player';
import '@videojs/html/live-audio/player';
import '@videojs/html/extensions/google-cast';
import '@videojs/html/media/mux-audio/spf';
import '@videojs/html/extensions/mux-data';
import { createHtmlSandbox, html } from '@app/shared/html/sandbox';

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

createHtmlSandbox({
  player: 'audio',
  live: true,
  media: ({ src, attrs }) => html`
    <mux-audio${src} ${attrs} crossorigin></mux-audio>
    <!--
      Both are opt-in media components, and no env key is needed for Mux-hosted sources.
      Mux Data monitors this flavor from the media element alone: its engine integrations are
      hls.js and dash.js, so an SPF engine gets element-level data and says so in dev.
    -->
    <mux-data player-software-name="mux-audio"></mux-data>
    <google-cast></google-cast>
  `,
  // A source carrying signed tokens has no room in the `src` attribute, so it is
  // assigned as an object instead. `source.drm` is accepted but inert here: SPF
  // prunes encrypted renditions and reports unsupported DRM rather than fetching a
  // license.
  attach: ({ source }) => {
    if (source) document.querySelector('mux-audio')!.source = source;
  },
});
