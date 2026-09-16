import '@app/styles.css';
import '@videojs/html/audio/player';
import '@videojs/html/live-audio/player';
import '@videojs/html/extensions/google-cast';
import '@videojs/html/media/mux-audio';
import '@videojs/html/extensions/mux-data';
import { createHtmlSandbox, html } from '@app/shared/html/sandbox';

createHtmlSandbox({
  player: 'audio',
  live: true,
  render: ({ playerTag, skinTag, src, attrs }) => html`
    <div class="mx-auto w-full max-w-xl">
      <${playerTag}>
        <${skinTag}>
          <mux-audio${src} ${attrs} crossorigin></mux-audio>
          <!-- Mux Data and Cast are opt-in media components; no env key is needed for Mux-hosted sources. -->
          <mux-data player-software-name="mux-audio"></mux-data>
          <google-cast></google-cast>
        </${skinTag}>
      </${playerTag}>
    </div>
  `,
  // A source carrying signed tokens has no room in the `src` attribute, so it is
  // assigned as an object instead — the same way `html-mux-video` does.
  attach: ({ source }) => {
    if (source) document.querySelector('mux-audio')!.source = source;
  },
});
