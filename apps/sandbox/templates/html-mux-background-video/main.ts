import '@app/styles.css';
import { bindSandboxHtmlLocaleChange, prepareSandboxHtmlLocale, wrapSandboxHtmlI18n } from '@app/shared/html/i18n';
import '@videojs/html/background/player';
import '@videojs/html/background/skin';
import '@videojs/html/media/mux-background-video';
import { getInitialSource, onSourceChange } from '@app/shared/sandbox-listener';
import { SOURCES, type SourceId, withMuxMaxResolution } from '@app/shared/sources';

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

const html = String.raw;

let source: SourceId = getInitialSource();

async function render() {
  await prepareSandboxHtmlLocale();

  const src = withMuxMaxResolution(SOURCES[source].url ?? '', '720p');

  document.getElementById('root')!.innerHTML = wrapSandboxHtmlI18n(html`
    <background-video-player>
      <background-video-skin>
        <mux-background-video src="${src}" crossorigin></mux-background-video>
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
