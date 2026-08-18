import '@app/styles.css';
import { bindSandboxHtmlLocaleChange, prepareSandboxHtmlLocale, wrapSandboxHtmlI18n } from '@app/shared/html/i18n';
import '@videojs/html/background/player';
import '@videojs/html/background/skin';
import '@videojs/html/media/hls-background-video';
import { HLS_BACKGROUND_VIDEO_SRC } from '@app/shared/sources';

// The SPF-backed background video, alongside the natively-played
// `<background-video>` in `html-background-video`. Same skin and player, same
// ambient framing — the difference is the engine, which streams HLS and pins one
// rendition for the session instead of handing a progressive MP4 to the browser.
// The source must be CMAF/fMP4; SPF does no MPEG-TS transmuxing.
//
// No cap here, so the pinned rendition is the largest the manifest offers.
// `html-mux-background-video` is the same element under its Mux-flavored tag,
// pointed at a URL that caps the manifest instead — see that page for the pair.
//
// Deliberately spare: `src` is the element's whole surface, and there is no source
// picker, matching its sibling pages.

const html = String.raw;

async function render() {
  await prepareSandboxHtmlLocale();

  document.getElementById('root')!.innerHTML = wrapSandboxHtmlI18n(html`
    <background-video-player>
      <background-video-skin>
        <hls-background-video src="${HLS_BACKGROUND_VIDEO_SRC}"></hls-background-video>
      </background-video-skin>
    </background-video-player>
  `);
}

render();

bindSandboxHtmlLocaleChange(render);
