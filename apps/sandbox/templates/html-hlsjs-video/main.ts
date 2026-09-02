import '@app/styles.css';
import '@videojs/html/video/player';
import '@videojs/html/media/hlsjs-video';
import { createHtmlSandbox, html } from '@app/shared/html/sandbox';

createHtmlSandbox({
  player: 'video',
  live: true,
  poster: 'image',
  // A source carrying DRM license servers has no room in the `src` attribute, so
  // it is assigned as an object below instead. Query-string playback overrides
  // need the object for the same reason, and need it before the first load so the
  // engine is built with them rather than reconfigured afterwards.
  playbackOverrides: true,
  media: ({ src, attrs, chapters, storyboard }) => html`
    <hlsjs-video${src} ${attrs} playsinline crossorigin>
      ${chapters}
      ${storyboard}
    </hlsjs-video>
  `,
  attach: ({ source }) => {
    if (source) document.querySelector('hlsjs-video')!.source = source;
  },
});
