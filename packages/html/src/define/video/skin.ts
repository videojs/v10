import { ReactiveElement } from '@videojs/element';
import { renderIcon } from '@videojs/icons/render';
import { createStyles, SkinMixin } from '../skin-mixin';
import styles from './skin.css?inline';

// Side-effect imports: register all custom elements used in the template.
import '../media/container';
import '../ui/buffering-indicator';
import '../ui/captions-button';
import '../ui/controls';
import '../ui/fullscreen-button';
import '../ui/mute-button';
import '../ui/pip-button';
import '../ui/play-button';
import '../ui/playback-rate-button';
import '../ui/popover';
import '../ui/poster';
import '../ui/seek-button';
import '../ui/time';
import '../ui/time-slider';
import '../ui/tooltip';
import '../ui/tooltip-group';
import '../ui/volume-slider';

const SEEK_TIME = 10;

function getTemplateHTML() {
  return /*html*/ `
    <media-container class="media-default-skin media-default-skin--video">
      <slot name="media"></slot>

      <media-poster>
        <slot name="poster"></slot>
      </media-poster>

      <media-buffering-indicator class="media-buffering-indicator">
        <div class="media-surface">
          ${renderIcon('spinner', { class: 'media-icon' })}
        </div>
      </media-buffering-indicator>

      <media-controls class="media-surface media-controls">
        <media-tooltip-group>
          <media-play-button commandfor="play-tooltip" class="media-button media-button--icon media-button--play">
            ${renderIcon('restart', { class: 'media-icon media-icon--restart' })}
            ${renderIcon('play', { class: 'media-icon media-icon--play' })}
            ${renderIcon('pause', { class: 'media-icon media-icon--pause' })}
          </media-play-button>
          <media-tooltip id="play-tooltip" side="top" class="media-surface media-tooltip">
            <span class="media-tooltip-label media-tooltip-label--replay">Replay</span>
            <span class="media-tooltip-label media-tooltip-label--play">Play</span>
            <span class="media-tooltip-label media-tooltip-label--pause">Pause</span>
          </media-tooltip>

          <media-seek-button commandfor="seek-backward-tooltip" seconds="${-SEEK_TIME}" class="media-button media-button--icon media-button--seek">
            <span class="media-icon__container">
              ${renderIcon('seek', { class: 'media-icon media-icon--flipped' })}
              <span class="media-icon__label">${SEEK_TIME}</span>
            </span>
          </media-seek-button>
          <media-tooltip id="seek-backward-tooltip" side="top" class="media-surface media-tooltip">
            Seek backward ${SEEK_TIME} seconds
          </media-tooltip>

          <media-seek-button commandfor="seek-forward-tooltip" seconds="${SEEK_TIME}" class="media-button media-button--icon media-button--seek">
            <span class="media-icon__container">
              ${renderIcon('seek', { class: 'media-icon' })}
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

              <div class="media-surface media-preview media-slider__preview">
                <media-slider-thumbnail class="media-preview__thumbnail"></media-slider-thumbnail>
                <media-slider-value type="pointer" class="media-preview__timestamp"></media-slider-value>
                ${renderIcon('spinner', { class: 'media-preview__spinner media-icon' })}
              </div>
            </media-time-slider>
            <media-time type="duration" class="media-time__value"></media-time>
          </media-time-group>

          <media-playback-rate-button commandfor="playback-rate-tooltip"  class="media-button media-button--icon media-button--playback-rate"></media-playback-rate-button>
          <media-tooltip id="playback-rate-tooltip" side="top" class="media-surface media-tooltip">
            Toggle playback rate
          </media-tooltip>

          <media-mute-button commandfor="video-volume-popover" class="media-button media-button--icon media-button--mute">
            ${renderIcon('volume-off', { class: 'media-icon media-icon--volume-off' })}
            ${renderIcon('volume-low', { class: 'media-icon media-icon--volume-low' })}
            ${renderIcon('volume-high', { class: 'media-icon media-icon--volume-high' })}
          </media-mute-button>

          <media-popover id="video-volume-popover" open-on-hover delay="200" close-delay="100" side="top" class="media-surface media-popover media-popover--volume">
            <media-volume-slider class="media-slider" orientation="vertical" thumb-alignment="edge">
              <media-slider-track class="media-slider__track">
                <media-slider-fill class="media-slider__fill"></media-slider-fill>
              </media-slider-track>
              <media-slider-thumb class="media-slider__thumb media-slider__thumb--persistent"></media-slider-thumb>
            </media-volume-slider>
          </media-popover>

          <media-captions-button commandfor="captions-tooltip" class="media-button media-button--icon media-button--captions">
            ${renderIcon('captions-off', { class: 'media-icon media-icon--captions-off' })}
            ${renderIcon('captions-on', { class: 'media-icon media-icon--captions-on' })}
          </media-captions-button>
          <media-tooltip id="captions-tooltip" side="top" class="media-surface media-tooltip">
            <span class="media-tooltip-label media-tooltip-label--enable-captions">Enable captions</span>
            <span class="media-tooltip-label media-tooltip-label--disable-captions">Disable captions</span>
          </media-tooltip>

          <media-pip-button commandfor="pip-tooltip" class="media-button media-button--icon media-button--pip">
            ${renderIcon('pip-enter', { class: 'media-icon media-icon--pip-enter' })}
            ${renderIcon('pip-exit', { class: 'media-icon media-icon--pip-exit' })}
          </media-pip-button>
          <media-tooltip id="pip-tooltip" side="top" class="media-surface media-tooltip">
            <span class="media-tooltip-label media-tooltip-label--enter-pip">Enter picture-in-picture</span>
            <span class="media-tooltip-label media-tooltip-label--exit-pip">Exit picture-in-picture</span>
          </media-tooltip>

          <media-fullscreen-button commandfor="fullscreen-tooltip" class="media-button media-button--icon media-button--fullscreen">
            ${renderIcon('fullscreen-enter', { class: 'media-icon media-icon--fullscreen-enter' })}
            ${renderIcon('fullscreen-exit', { class: 'media-icon media-icon--fullscreen-exit' })}
          </media-fullscreen-button>
          <media-tooltip id="fullscreen-tooltip" side="top" class="media-surface media-tooltip">
            <span class="media-tooltip-label media-tooltip-label--enter-fullscreen">Enter fullscreen</span>
            <span class="media-tooltip-label media-tooltip-label--exit-fullscreen">Exit fullscreen</span>
          </media-tooltip>
        </media-tooltip-group>
      </media-controls>

      <div class="media-overlay"></div>
    </media-container>
  `;
}

export class VideoSkinElement extends SkinMixin(ReactiveElement) {
  static readonly tagName = 'video-skin';
  static styles = createStyles(styles);
  static getTemplateHTML = getTemplateHTML;
}

customElements.define(VideoSkinElement.tagName, VideoSkinElement);

declare global {
  interface HTMLElementTagNameMap {
    [VideoSkinElement.tagName]: VideoSkinElement;
  }
}
