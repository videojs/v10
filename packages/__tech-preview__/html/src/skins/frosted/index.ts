import { MediaSkinElement } from '@/media/media-skin';
import { defineCustomElement } from '@/utils/custom-element';
import styles from './styles.css';
// be sure to import video-provider first for proper context initialization
import '@/define/video-provider';
import '@/define/media-container';
import '@/define/media-play-button';
import '@/define/media-mute-button';
import '@/define/media-volume-slider';
import '@/define/media-time-slider';
import '@/define/media-fullscreen-button';
import '@/define/media-duration-display';
import '@/define/media-current-time-display';
import '@/define/media-preview-time-display';
import '@/define/media-popover';
import '@/define/media-tooltip';
import '@/icons';

export function getTemplateHTML() {
  return /* html */`
    ${MediaSkinElement.getTemplateHTML()}
    <style>${styles}</style>

    <media-container>
      <slot name="media" slot="media"></slot>

      <div class="overlay"></div>

      <div class="control-bar surface">
        <!-- NOTE: We can decide if we further want to provide a further, "themed" media-play-button that comes with baked in default styles and icons. (CJP) -->

        <media-play-button commandfor="play-tooltip" class="button">
          <media-play-icon class="icon play-icon"></media-play-icon>
          <media-pause-icon class="icon pause-icon"></media-pause-icon>
        </media-play-button>
        <media-tooltip
          id="play-tooltip"
          class="surface popup-animation"
          popover="manual"
          delay="500"
          side="top"
          side-offset="12"
          collision-padding="12"
        >
          <span class="tooltip play-tooltip">Play</span>
          <span class="tooltip pause-tooltip">Pause</span>
        </media-tooltip>

        <div class="time-controls">
          <!-- Use the show-remaining attribute to show count down/remaining time -->
          <media-current-time-display></media-current-time-display>

          <media-time-slider commandfor="time-slider-tooltip" class="slider">
            <media-time-slider-track class="slider-track">
              <media-time-slider-progress class="slider-progress"></media-time-slider-progress>
              <media-time-slider-pointer class="slider-pointer"></media-time-slider-pointer>
            </media-time-slider-track>
            <media-time-slider-thumb class="slider-thumb"></media-time-slider-thumb>
          </media-time-slider>
          <media-tooltip
            id="time-slider-tooltip"
            class="surface popup-animation"
            popover="manual"
            track-cursor-axis="x"
            side="top"
            side-offset="18"
            collision-padding="12"
          >
            <media-preview-time-display></media-preview-time-display>
          </media-tooltip>

          <media-duration-display></media-duration-display>
        </div>

        <media-mute-button commandfor="volume-slider-popover" command="toggle-popover" class="button">
          <media-volume-high-icon class="icon volume-high-icon"></media-volume-high-icon>
          <media-volume-low-icon class="icon volume-low-icon"></media-volume-low-icon>
          <media-volume-off-icon class="icon volume-off-icon"></media-volume-off-icon>
        </media-mute-button>
        <media-popover
          id="volume-slider-popover"
          class="surface popup-animation"
          popover="manual"
          open-on-hover
          delay="200"
          close-delay="100"
          side="top"
          side-offset="12"
          collision-padding="12"
        >
          <media-volume-slider class="slider" orientation="vertical">
            <media-volume-slider-track class="slider-track">
              <media-volume-slider-indicator class="slider-progress"></media-volume-slider-indicator>
            </media-volume-slider-track>
            <media-volume-slider-thumb class="slider-thumb"></media-volume-slider-thumb>
          </media-volume-slider>
        </media-popover>

        <media-fullscreen-button commandfor="fullscreen-tooltip" class="button">
          <media-fullscreen-enter-icon class="icon fullscreen-enter-icon"></media-fullscreen-enter-icon>
          <media-fullscreen-exit-icon class="icon fullscreen-exit-icon"></media-fullscreen-exit-icon>
        </media-fullscreen-button>
        <media-tooltip
          id="fullscreen-tooltip"
          class="surface popup-animation"
          popover="manual"
          delay="500"
          side="top"
          side-offset="12"
          collision-padding="12"
        >
          <span class="tooltip fullscreen-enter-tooltip">Enter Fullscreen</span>
          <span class="tooltip fullscreen-exit-tooltip">Exit Fullscreen</span>
        </media-tooltip>
      </div>
    </media-container>
  `;
}

export class MediaSkinFrostedElement extends MediaSkinElement {
  static getTemplateHTML: () => string = getTemplateHTML;
}

defineCustomElement('media-skin-frosted', MediaSkinFrostedElement);
