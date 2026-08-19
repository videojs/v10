import '@app/styles.css';
import { bindSandboxHtmlLocaleChange, prepareSandboxHtmlLocale, wrapSandboxHtmlI18n } from '@app/shared/html/i18n';
import '@videojs/html/background/player';
import '@videojs/html/background/skin';
import '@videojs/html/media/hls-background-video';
import { getInitialSource, onSourceChange } from '@app/shared/sandbox-listener';
import { SOURCES, type SourceId } from '@app/shared/sources';

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

const html = String.raw;

let source: SourceId = getInitialSource();

async function render() {
  await prepareSandboxHtmlLocale();

  document.getElementById('root')!.innerHTML = wrapSandboxHtmlI18n(html`
    <background-video-player>
      <background-video-skin>
        <hls-background-video src="${SOURCES[source].url ?? ''}" crossorigin></hls-background-video>
      </background-video-skin>
    </background-video-player>
  `);
}

render();

onSourceChange((next) => {
  source = next;
  render();
});

bindSandboxHtmlLocaleChange(render);
