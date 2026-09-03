import '@app/styles.css';
import '@videojs/html/background/player';
import '@videojs/html/background/skin';
import '@videojs/html/media/hls-background-video';
import { createHtmlSandbox, html } from '@app/shared/html/sandbox';

// The SPF-backed background video, alongside the natively-played
// `<background-video>` in `html-background-video`. Same skin and player, same
// ambient framing — the difference is the engine, which streams HLS and pins one
// rendition for the session instead of handing a progressive MP4 to the browser.
//
// Unlike its native sibling this one takes the source picker, because `src` is an
// ordinary HLS URL and the engine's answer to a given manifest is the thing worth
// smoke-testing: CMAF plays, MPEG-TS has no transmuxer, encrypted renditions have
// no EME, and an audio-only ladder has no video for a video-only engine to resolve.
//
// No cap here, so the pinned rendition is the largest that fits the screen.
// `html-mux-background-video` is the same element under its Mux-flavored tag,
// pointed at a URL that caps the manifest instead — see that page for the pair.

createHtmlSandbox({
  player: 'background',
  media: ({ src }) => html`<hls-background-video${src} crossorigin></hls-background-video>`,
});
