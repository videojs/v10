import '@app/styles.css';
import './theme.css';
import '@videojs/html/i18n';
import '@videojs/html/video/player';
import '@videojs/html/icons/element/default';
import '@videojs/html/ui/container';
import '@videojs/html/ui/poster';
import '@videojs/html/ui/gesture';
import '@videojs/html/ui/hotkey';
import '@videojs/html/ui/error-dialog';
import '@videojs/html/ui/dialog-backdrop';
import '@videojs/html/ui/dialog-popup';
import '@videojs/html/ui/dialog-title';
import '@videojs/html/ui/dialog-description';
import '@videojs/html/ui/dialog-close';
import '@videojs/html/ui/play-button';
import '@videojs/html/ui/mute-button';
import '@videojs/html/ui/time-slider';
import '@videojs/html/ui/slider-track';
import '@videojs/html/ui/slider-buffer';
import '@videojs/html/ui/slider-fill';
import '@videojs/html/ui/slider-preview';
import '@videojs/html/ui/slider-thumbnail';
import '@videojs/html/ui/slider-value';
import { defineTemplateSkin } from '@app/shared/html/registry-skins';
import { createHtmlSandbox, html } from '@app/shared/html/sandbox';

import markup from './theme.html?raw';

/**
 * The theme is markup plus a stylesheet, stamped into an element the same way an ejected registry skin is. The authored
 * markup keeps a bare `<slot>` where the media goes and the poster's own `<img>` as its target.
 *
 * The page names this tag itself rather than the shell's `skinTag`, since the shell's picker only knows the packaged
 * skins.
 */
const skinTag = defineTemplateSkin('player-style-instaplay-skin', {
  markup,
  media: (container) => container.querySelector('slot:not([name])'),
  poster: (container) => container.querySelector('media-poster img'),
});

createHtmlSandbox({
  player: 'video',
  render: ({ src, attrs, chapters, storyboard, poster }) => html`
    <video-player>
      <${skinTag} class="mx-auto aspect-video max-w-4xl">
        <video${src} ${attrs} playsinline crossorigin>
          ${chapters}
          ${storyboard}
        </video>
        ${poster ? html`<img slot="poster" src="${poster}" alt="Video poster" crossorigin />` : ''}
      </${skinTag}>
    </video-player>
  `,
});
