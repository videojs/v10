import '@app/styles.css';
import '@videojs/html/video/player';
import '@videojs/html/live-video/player';
import '@videojs/html/media/hlsjs-video';
import { createHtmlSandbox, html } from '@app/shared/html/sandbox';

createHtmlSandbox({
  player: 'video',
  live: true,
  // A source carrying DRM license servers has no room in the `src` attribute, so
  // it is assigned as an object below instead. Query-string playback overrides
  // need the object for the same reason, and need it before the first load so the
  // engine is built with them rather than reconfigured afterwards.
  playbackOverrides: true,
  render: ({ playerTag, skinTag, src, attrs, chapters, storyboard, poster }) => html`
    <${playerTag}>
      <${skinTag} class="sandbox-video-frame mx-auto max-w-4xl">
        <hlsjs-video${src} ${attrs} playsinline crossorigin>
          ${chapters}
          ${storyboard}
        </hlsjs-video>
        ${poster ? html`<img slot="poster" src="${poster}" alt="Video poster" crossorigin />` : ''}
      </${skinTag}>
    </${playerTag}>
  `,
  attach: ({ source }) => {
    if (source) document.querySelector('hlsjs-video')!.source = source;
  },
});
