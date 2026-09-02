import '@app/styles.css';
import '@videojs/html/audio/player';
import '@videojs/html/live-audio/player';
import '@videojs/html/media/hls-audio';
import { createHtmlSandbox, html } from '@app/shared/html/sandbox';

createHtmlSandbox({
  player: 'audio',
  live: true,
  media: ({ src, attrs }) => html`<hls-audio${src} ${attrs} crossorigin></hls-audio>`,
});
