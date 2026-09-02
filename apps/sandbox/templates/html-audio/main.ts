import '@app/styles.css';
import '@videojs/html/audio/player';
import { createHtmlSandbox, html } from '@app/shared/html/sandbox';

createHtmlSandbox({
  player: 'audio',
  media: ({ src, attrs }) => html`<audio${src} ${attrs} crossorigin></audio>`,
});
