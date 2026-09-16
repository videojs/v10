import '@app/styles.css';
import '@videojs/html/audio/player';
import { createHtmlSandbox, html } from '@app/shared/html/sandbox';

createHtmlSandbox({
  player: 'audio',
  render: ({ skinTag, src, attrs }) => html`
    <div class="mx-auto w-full max-w-xl">
      <audio-player>
        <${skinTag}>
          <audio${src} ${attrs} crossorigin></audio>
        </${skinTag}>
      </audio-player>
    </div>
  `,
});
