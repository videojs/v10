import '@app/styles.css';
import '@videojs/html/video/player';
import '@videojs/html/media/dash-video';
import '@videojs/html/extensions/mux-data';
import { createHtmlSandbox, html } from '@app/shared/html/sandbox';

createHtmlSandbox({
  player: 'video',
  render: ({ skinTag, src, attrs, storyboard, poster }) => html`
    <video-player>
      <${skinTag} class="mx-auto aspect-video max-w-4xl">
        <dash-video${src} ${attrs} playsinline crossorigin>${storyboard}</dash-video>
        <!-- Mux Data is an opt-in media component. It hands the dash.js engine to the Mux Data
             SDK, so views carry stream-level detail. These streams aren't Mux-hosted, so the
             sandbox env key is what attributes the views. -->
        <mux-data player-software-name="dash-video" env-key="o9b7ge20gji31ao0rub18505f"></mux-data>
        ${poster ? html`<img slot="poster" src="${poster}" alt="Video poster" crossorigin />` : ''}
      </${skinTag}>
    </video-player>
  `,
});
