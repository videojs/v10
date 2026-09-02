import '@app/styles.css';
import '@videojs/html/video/player';
import '@videojs/html/live-video/player';
import '@videojs/html/extensions/google-cast';
import '@videojs/html/extensions/mux-data';
import '@videojs/html/media/mux-video/spf';
import { createHtmlSandbox, html } from '@app/shared/html/sandbox';

// The SPF-backed `<mux-video>`, alongside the hls.js-backed `<mux-video>` in
// `html-mux-video`. Same element behavior — derived poster, storyboard track,
// `poster-time` — over the SPF engine.
//
// What differs is what it can play. SPF appends fMP4/CMAF only, so an MPEG-TS or
// DRM-protected playback ID is expected to surface the unsupported-source error,
// with console copy pointing at the hls.js-backed import. Those sources are left
// in the picker deliberately: failing well is part of what this page demos.
//
// Mux Data and Cast both work here, as on the hls.js-backed page. Cast is
// engine-agnostic — it hands the URL to the receiver. Mux Data monitors this
// flavor from the media element alone: its engine integrations are hls.js and
// dash.js, so an SPF engine gets element-level data and says so in dev.

createHtmlSandbox({
  player: 'video',
  live: true,
  poster: 'derived',
  media: ({ src, attrs }) => html`
    <!-- The storyboard track is derived automatically from the Mux src. -->
    <mux-video${src} ${attrs} playsinline crossorigin></mux-video>
    <!-- Opt-in media components; no env key is needed for Mux-hosted sources. -->
    <mux-data player-software-name="mux-video"></mux-data>
    <google-cast></google-cast>
  `,
  // A source carrying signed tokens has no room in the `src` attribute, so it is
  // assigned as an object instead. `source.drm` is accepted but inert here: SPF
  // prunes encrypted renditions and reports unsupported DRM rather than fetching a
  // license.
  attach: ({ source }) => {
    if (source) document.querySelector('mux-video')!.source = source;
  },
});
