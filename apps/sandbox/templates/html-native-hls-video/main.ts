import '@app/styles.css';
import '@videojs/html/video/player';
import '@videojs/html/live-video/player';
import '@videojs/html/media/native-hls-video';
import { createHtmlSandbox, html } from '@app/shared/html/sandbox';

createHtmlSandbox({
  player: 'video',
  live: true,
  render: ({ playerTag, skinTag, src, attrs, chapters, storyboard, poster }) => html`
    <${playerTag}>
      <${skinTag} class="mx-auto aspect-video max-w-4xl">
        <native-hls-video${src} ${attrs} playsinline crossorigin>
          ${chapters}
          ${storyboard}
        </native-hls-video>
        ${poster ? html`<img slot="poster" src="${poster}" alt="Video poster" crossorigin />` : ''}
      </${skinTag}>
    </${playerTag}>
  `,
  // A source carrying DRM license servers has no room in the `src` attribute, so
  // it is assigned as an object instead. Only the FairPlay entry of its `drm` is
  // read here — the systems the same object names for hls.js are ignored.
  attach: ({ source }) => {
    if (source) document.querySelector('native-hls-video')!.source = source;
  },
});
