import '@app/styles.css';
import { bindSandboxHtmlLocaleChange, prepareSandboxHtmlLocale, wrapSandboxHtmlI18n } from '@app/shared/html/i18n';
import '@videojs/html/background/player';
import '@videojs/html/background/skin';
import '@videojs/html/media/mux-background-video';
import { HLS_BACKGROUND_VIDEO_SRC } from '@app/shared/sources';

// `<mux-background-video>` is `<hls-background-video>` under its Mux-flavored tag
// — the same element, so `html-hls-background-video` is the same page with the
// other name. What this one adds is the reason the name is worth keeping.
//
// `?max_resolution=720p` is that reason: capping which rendition gets fetched is a
// Mux URL param rather than an attribute, so a hero video shown at 400px tall
// never has 1080p offered to it in the first place. The element pins the largest
// rendition the manifest offers either way; the URL is what decides what that is.
// The source must be CMAF/fMP4 — SPF does no MPEG-TS transmuxing.
//
// Deliberately spare: `src` is the element's whole surface, and there is no source
// picker, matching its sibling pages.

const html = String.raw;

async function render() {
  await prepareSandboxHtmlLocale();

  document.getElementById('root')!.innerHTML = wrapSandboxHtmlI18n(html`
    <background-video-player>
      <background-video-skin>
        <mux-background-video src="${HLS_BACKGROUND_VIDEO_SRC}?max_resolution=720p"></mux-background-video>
      </background-video-skin>
    </background-video-player>
  `);
}

render();

bindSandboxHtmlLocaleChange(render);
