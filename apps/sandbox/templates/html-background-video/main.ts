import '@app/styles.css';
import { bindSandboxHtmlLocaleChange, prepareSandboxHtmlLocale, wrapSandboxHtmlI18n } from '@app/shared/html/i18n';
import '@videojs/html/background/player';
import '@videojs/html/background/skin';
import '@videojs/html/background/video';
import { BACKGROUND_VIDEO_SRC } from '@app/shared/sources';

const html = String.raw;

async function render() {
  await prepareSandboxHtmlLocale();

  document.getElementById('root')!.innerHTML = wrapSandboxHtmlI18n(html`
    <background-video-player>
      <background-video-skin>
        <background-video src="${BACKGROUND_VIDEO_SRC}"></background-video>
      </background-video-skin>
    </background-video-player>
  `);
}

render();

bindSandboxHtmlLocaleChange(render);
