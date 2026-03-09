import { ReactiveElement } from '@videojs/element';
import { renderIcon } from '@videojs/icons/render';
import { createStyles, SkinMixin } from '../skin-mixin';
import styles from './skin.css?inline';

// Side-effect imports: register all custom elements used in the template.
import '../media/container';
import '../ui/mute-button';
import '../ui/play-button';
import '../ui/playback-rate-button';
import '../ui/popover';
import '../ui/seek-button';
import '../ui/time';
import '../ui/time-slider';
import '../ui/volume-slider';

const SEEK_TIME = 10;

function getTemplateHTML() {
  return /*html*/ `
    <media-container class="media-default-skin media-default-skin--audio">
      <slot name="media"></slot>

      <div class="media-surface media-controls">
        <media-play-button class="media-button media-button--icon media-button--play">
          ${renderIcon('restart', { class: 'media-icon media-icon--restart' })}
          ${renderIcon('play', { class: 'media-icon media-icon--play' })}
          ${renderIcon('pause', { class: 'media-icon media-icon--pause' })}
        </media-play-button>

        <media-seek-button seconds="${-SEEK_TIME}" class="media-button media-button--icon media-button--seek">
          <span class="media-icon__container">
            ${renderIcon('seek', { class: 'media-icon media-icon--seek media-icon--flipped' })}
            <span class="media-icon__label">${SEEK_TIME}</span>
          </span>
        </media-seek-button>

        <media-seek-button seconds="${SEEK_TIME}" class="media-button media-button--icon media-button--seek">
          <span class="media-icon__container">
            ${renderIcon('seek', { class: 'media-icon media-icon--seek' })}
            <span class="media-icon__label">${SEEK_TIME}</span>
          </span>
        </media-seek-button>

        <media-time-group class="media-time">
          <media-time type="current" class="media-time__value"></media-time>
          <media-time-slider class="media-slider">
            <media-slider-track class="media-slider__track">
              <media-slider-fill class="media-slider__fill"></media-slider-fill>
              <media-slider-buffer class="media-slider__buffer"></media-slider-buffer>
            </media-slider-track>
            <media-slider-thumb class="media-slider__thumb"></media-slider-thumb>
          </media-time-slider>
          <media-time type="duration" class="media-time__value"></media-time>
        </media-time-group>

        <media-playback-rate-button class="media-button media-button--icon media-button--playback-rate">
        </media-playback-rate-button>

        <media-mute-button commandfor="audio-volume-popover" class="media-button media-button--icon media-button--mute">
          ${renderIcon('volume-off', { class: 'media-icon media-icon--volume-off' })}
          ${renderIcon('volume-low', { class: 'media-icon media-icon--volume-low' })}
          ${renderIcon('volume-high', { class: 'media-icon media-icon--volume-high' })}
        </media-mute-button>

        <media-popover id="audio-volume-popover" open-on-hover delay="200" close-delay="100" side="top" class="media-surface media-popup media-popup--volume media-popup-animation">
          <media-volume-slider class="media-slider" orientation="vertical" thumb-alignment="edge">
            <media-slider-track class="media-slider__track">
              <media-slider-fill class="media-slider__fill"></media-slider-fill>
            </media-slider-track>
            <media-slider-thumb class="media-slider__thumb media-slider__thumb--persistent"></media-slider-thumb>
          </media-volume-slider>
        </media-popover>
      </div>
    </media-container>
  `;
}

export class AudioSkinElement extends SkinMixin(ReactiveElement) {
  static readonly tagName = 'audio-skin';
  static styles = createStyles(styles);
  static getTemplateHTML = getTemplateHTML;
}

customElements.define(AudioSkinElement.tagName, AudioSkinElement);

declare global {
  interface HTMLElementTagNameMap {
    [AudioSkinElement.tagName]: AudioSkinElement;
  }
}
