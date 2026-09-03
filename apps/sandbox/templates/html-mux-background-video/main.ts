import '@app/styles.css';
import '@videojs/html/background/player';
import '@videojs/html/background/skin';
import '@videojs/html/media/mux-background-video';
import { createHtmlSandbox, html } from '@app/shared/html/sandbox';
import { withMuxMaxResolution } from '@app/shared/sources';

// `<mux-background-video>` is `<hls-background-video>` under its Mux-flavored tag
// — the same element, so `html-hls-background-video` is the same page with the
// other name. What this one adds is the reason the name is worth keeping.
//
// `?max_resolution=720p` is that reason: capping which rendition gets fetched is a
// Mux URL param rather than an attribute, so a hero video shown at 400px tall never
// has 1080p offered to it in the first place. Both pages narrow to what fits the
// screen; only this one narrows the manifest, so the renditions it excludes are
// absent rather than present and unpicked.
//
// Takes the same source picker as its HLS-named sibling — see that page for what
// each source shape is there to reach.

createHtmlSandbox({
  player: 'background',
  media: ({ url }) => html`
    <mux-background-video src="${withMuxMaxResolution(url, '720p')}" crossorigin></mux-background-video>
  `,
});
