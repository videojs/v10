import '@app/styles.css';
import '@videojs/html/audio/player';
import '@videojs/html/live-audio/player';
import '@videojs/html/media/hls-audio';
import { createHtmlSandbox, html } from '@app/shared/html/sandbox';

createHtmlSandbox({
  player: 'audio',
  live: true,
  render: ({ playerTag, skinTag, src, attrs }) => html`
    <div class="mx-auto w-full max-w-xl">
      <${playerTag}>
        <${skinTag}>
          <hls-audio${src} ${attrs} crossorigin></hls-audio>
        </${skinTag}>
      </${playerTag}>
    </div>
  `,
});
