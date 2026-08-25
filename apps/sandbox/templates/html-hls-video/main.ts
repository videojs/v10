import '@app/styles.css';
import '@videojs/html/video/player';
import '@videojs/html/live-video/player';
import '@videojs/html/media/hls-video';
import { createHtmlSandbox, html } from '@app/shared/html/sandbox';

createHtmlSandbox({
  player: 'video',
  live: true,
  poster: 'image',
  media: ({ src, attrs, chapters, storyboard }) => html`
    <hls-video${src} ${attrs} playsinline crossorigin>
      ${chapters}
      ${storyboard}
    </hls-video>
  `,
  // A source carrying license servers has no room in the `src` attribute, so it
  // is assigned as an object instead. `source.drm` licenses protected playback
  // here — the engine reads the license servers it names.
  attach: ({ source }) => {
    if (source) document.querySelector('hls-video')!.source = source;
  },
});
