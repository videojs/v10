import '@app/styles.css';
import '@videojs/html/video/player';
import '@videojs/html/live-video/player';
import '@videojs/html/media/hls-video';
import { createHtmlSandbox, html } from '@app/shared/html/sandbox';
import { restrictDrmSystems } from '@app/shared/sources';

createHtmlSandbox({
  player: 'video',
  live: true,
  render: ({ playerTag, skinTag, src, attrs, chapters, storyboard, poster }) => html`
    <${playerTag}>
      <${skinTag} class="sandbox-video-frame mx-auto max-w-4xl">
        <hls-video${src} ${attrs} playsinline crossorigin>
          ${chapters}
          ${storyboard}
        </hls-video>
        ${poster ? html`<img slot="poster" src="${poster}" alt="Video poster" crossorigin />` : ''}
      </${skinTag}>
    </${playerTag}>
  `,
  // A source carrying license servers has no room in the `src` attribute, so it
  // is assigned as an object instead. `source.drm` licenses protected playback
  // here — the engine reads the license servers it names.
  // `?drm=widevine|playready|fairplay` narrows it to one key system, so a browser
  // with several CDMs negotiates the one under test rather than whichever it prefers.
  attach: ({ source }) => {
    const restricted = restrictDrmSystems(source, new URLSearchParams(location.search).get('drm'));

    if (restricted) document.querySelector('hls-video')!.source = restricted;
  },
});
