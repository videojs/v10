import '@app/styles.css';
import '@videojs/html/video/player';
import '@videojs/html/extensions/google-cast';
import '@videojs/html/extensions/mux-data';
import '@videojs/html/media/mux-video';
import { createHtmlSandbox, html } from '@app/shared/html/sandbox';

createHtmlSandbox({
  player: 'video',
  live: true,
  poster: 'derived',
  // A source carrying signed tokens has no room in the `src` attribute, so it is
  // assigned as an object below instead. Query-string playback overrides need the
  // object for the same reason, and need it before the first load so the engine is
  // built with them rather than reconfigured afterwards.
  playbackOverrides: true,
  media: ({ src, attrs, chapters }) => html`
    <!-- The storyboard track is derived automatically from the Mux src. -->
    <mux-video${src} ${attrs} playsinline crossorigin>${chapters}</mux-video>
    <!-- Mux Data and Cast are opt-in media components; no env key is needed for Mux-hosted sources. -->
    <mux-data player-software-name="mux-video"></mux-data>
    <google-cast></google-cast>
  `,
  // A Mux `source.drm.token` becomes the FairPlay / Widevine / PlayReady license
  // servers; the playback, poster, and storyboard tokens sign the rest.
  attach: ({ source }) => {
    if (source) document.querySelector('mux-video')!.source = source;
  },
});
