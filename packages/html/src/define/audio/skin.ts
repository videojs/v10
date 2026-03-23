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
import '../ui/tooltip';
import '../ui/tooltip-group';
import '../ui/volume-slider';

const SEEK_TIME = 10;

function getTemplateHTML() {
  return /*html*/ `
    <media-container class="media-default-skin media-default-skin--audio">
      <!-- @deprecated slot="media" is no longer required, use the default slot instead -->
      <slot name="media"></slot>
      <slot></slot>

      <div class="media-surface media-controls">
        <media-tooltip-group>
          <media-play-button commandfor="play-tooltip" class="media-button media-button--subtle media-button--icon media-button--play">
            ${renderIcon('restart', { class: 'media-icon media-icon--restart' })}
            ${renderIcon('play', { class: 'media-icon media-icon--play' })}
            ${renderIcon('pause', { class: 'media-icon media-icon--pause' })}
          </media-play-button>
          <media-tooltip id="play-tooltip" side="top" class="media-surface media-tooltip">
            <span class="media-tooltip-label media-tooltip-label--replay">Replay</span>
            <span class="media-tooltip-label media-tooltip-label--play">Play</span>
            <span class="media-tooltip-label media-tooltip-label--pause">Pause</span>
          </media-tooltip>

          <media-seek-button commandfor="seek-backward-tooltip" seconds="${-SEEK_TIME}" class="media-button media-button--subtle media-button--icon media-button--seek">
            <span class="media-icon__container">
              ${renderIcon('seek', { class: 'media-icon media-icon--seek media-icon--flipped' })}
              <span class="media-icon__label">${SEEK_TIME}</span>
            </span>
          </media-seek-button>
          <media-tooltip id="seek-backward-tooltip" side="top" class="media-surface media-tooltip">
            Seek backward ${SEEK_TIME} seconds
          </media-tooltip>

          <media-seek-button commandfor="seek-forward-tooltip" seconds="${SEEK_TIME}" class="media-button media-button--subtle media-button--icon media-button--seek">
            <span class="media-icon__container">
              ${renderIcon('seek', { class: 'media-icon media-icon--seek' })}
              <span class="media-icon__label">${SEEK_TIME}</span>
            </span>
          </media-seek-button>
          <media-tooltip id="seek-forward-tooltip" side="top" class="media-surface media-tooltip">
            Seek forward ${SEEK_TIME} seconds
          </media-tooltip>

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

          <media-playback-rate-button commandfor="playback-rate-tooltip" class="media-button media-button--subtle media-button--icon media-button--playback-rate"></media-playback-rate-button>
          <media-tooltip id="playback-rate-tooltip" side="top" class="media-surface media-tooltip">
            Toggle playback rate
          </media-tooltip>

          <media-mute-button commandfor="audio-volume-popover" class="media-button media-button--subtle media-button--icon media-button--mute">
            ${renderIcon('volume-off', { class: 'media-icon media-icon--volume-off' })}
            ${renderIcon('volume-low', { class: 'media-icon media-icon--volume-low' })}
            ${renderIcon('volume-high', { class: 'media-icon media-icon--volume-high' })}
          </media-mute-button>

          <media-popover id="audio-volume-popover" open-on-hover delay="200" close-delay="100" side="top" class="media-surface media-popover media-popover--volume">
            <media-volume-slider class="media-slider" orientation="vertical" thumb-alignment="edge">
              <media-slider-track class="media-slider__track">
                <media-slider-fill class="media-slider__fill"></media-slider-fill>
              </media-slider-track>
              <media-slider-thumb class="media-slider__thumb media-slider__thumb--persistent"></media-slider-thumb>
            </media-volume-slider>
          </media-popover>
        </media-tooltip-group>
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
