import { renderIcon } from '@videojs/icons/render';
import { createShadowStyle, createTemplate } from '@videojs/utils/dom';
import { safeDefine } from '../safe-define';
import { SkinElement } from '../skin-element';
import styles from './skin.css?inline';

// Side-effect imports: register all custom elements used in the template.
import '../media/container';
import '../ui/buffering-indicator';
import '../ui/captions-button';
import '../ui/error-dialog';
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
      <!-- @deprecated slot="media" is no longer required, use the default slot instead -->
      <slot name="media"></slot>
      <slot></slot>

      <media-poster>
        <slot name="poster"></slot>
      </media-poster>

      <media-buffering-indicator class="media-buffering-indicator">
        <div class="media-surface">
          ${renderIcon('spinner', { class: 'media-icon' })}
        </div>
      </media-buffering-indicator>

      <media-error-dialog class="media-error">
        <div class="media-error__dialog media-surface">
          <div class="media-error__content">
            <media-alert-dialog-title class="media-error__title">Something went wrong.</media-alert-dialog-title>
            <media-alert-dialog-description class="media-error__description"></media-alert-dialog-description>
          </div>
          <div class="media-error__actions">
            <media-alert-dialog-close class="media-button media-button--primary">OK</media-alert-dialog-close>
          </div>
        </div>
      </media-error-dialog>

      <media-controls class="media-surface media-controls">
        <media-tooltip-group>
          <div class="media-button-group">
            <media-play-button commandfor="play-tooltip" class="media-button media-button--subtle media-button--icon media-button--play">
              ${renderIcon('restart', { class: 'media-icon media-icon--restart' })}
              ${renderIcon('play', { class: 'media-icon media-icon--play' })}
              ${renderIcon('pause', { class: 'media-icon media-icon--pause' })}
            </media-play-button>
            <media-tooltip id="play-tooltip" side="top" class="media-surface media-tooltip"></media-tooltip>

            <media-seek-button commandfor="seek-backward-tooltip" seconds="${-SEEK_TIME}" class="media-button media-button--subtle media-button--icon media-button--seek">
              <span class="media-icon__container">
                ${renderIcon('seek', { class: 'media-icon media-icon--flipped' })}
                <span class="media-icon__label">${SEEK_TIME}</span>
              </span>
            </media-seek-button>
            <media-tooltip id="seek-backward-tooltip" side="top" class="media-surface media-tooltip">
              Seek backward ${SEEK_TIME} seconds
            </media-tooltip>

            <media-seek-button commandfor="seek-forward-tooltip" seconds="${SEEK_TIME}" class="media-button media-button--subtle media-button--icon media-button--seek">
              <span class="media-icon__container">
                ${renderIcon('seek', { class: 'media-icon' })}
                <span class="media-icon__label">${SEEK_TIME}</span>
              </span>
            </media-seek-button>
            <media-tooltip id="seek-forward-tooltip" side="top" class="media-surface media-tooltip">
              Seek forward ${SEEK_TIME} seconds
            </media-tooltip>
          </div>

          <div class="media-time-controls">
            <media-time type="current" class="media-time"></media-time>
            <media-time-slider class="media-slider">
              <media-slider-track class="media-slider__track">
                <media-slider-fill class="media-slider__fill"></media-slider-fill>
                <media-slider-buffer class="media-slider__buffer"></media-slider-buffer>
              </media-slider-track>
              <media-slider-thumb class="media-slider__thumb"></media-slider-thumb>

              <div class="media-surface media-preview media-slider__preview">
                <media-slider-thumbnail class="media-preview__thumbnail"></media-slider-thumbnail>
                <media-slider-value type="pointer" class="media-time media-preview__time"></media-slider-value>
                ${renderIcon('spinner', { class: 'media-preview__spinner media-icon' })}
              </div>
            </media-time-slider>
            <media-time type="duration" class="media-time"></media-time>
          </div>

          <div class="media-button-group">
            <media-playback-rate-button commandfor="playback-rate-tooltip"  class="media-button media-button--subtle media-button--icon media-button--playback-rate"></media-playback-rate-button>
            <media-tooltip id="playback-rate-tooltip" side="top" class="media-surface media-tooltip">
              Toggle playback rate
            </media-tooltip>

            <media-mute-button commandfor="video-volume-popover" class="media-button media-button--subtle media-button--icon media-button--mute">
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

            <media-captions-button commandfor="captions-tooltip" class="media-button media-button--subtle media-button--icon media-button--captions">
              ${renderIcon('captions-off', { class: 'media-icon media-icon--captions-off' })}
              ${renderIcon('captions-on', { class: 'media-icon media-icon--captions-on' })}
            </media-captions-button>
            <media-tooltip id="captions-tooltip" side="top" class="media-surface media-tooltip"></media-tooltip>

            <media-pip-button commandfor="pip-tooltip" class="media-button media-button--subtle media-button--icon media-button--pip">
              ${renderIcon('pip-enter', { class: 'media-icon media-icon--pip-enter' })}
              ${renderIcon('pip-exit', { class: 'media-icon media-icon--pip-exit' })}
            </media-pip-button>
            <media-tooltip id="pip-tooltip" side="top" class="media-surface media-tooltip"></media-tooltip>

            <media-fullscreen-button commandfor="fullscreen-tooltip" class="media-button media-button--subtle media-button--icon media-button--fullscreen">
              ${renderIcon('fullscreen-enter', { class: 'media-icon media-icon--fullscreen-enter' })}
              ${renderIcon('fullscreen-exit', { class: 'media-icon media-icon--fullscreen-exit' })}
            </media-fullscreen-button>
            <media-tooltip id="fullscreen-tooltip" side="top" class="media-surface media-tooltip"></media-tooltip>
          </div>
        </media-tooltip-group>
      </media-controls>

      <div class="media-overlay"></div>
    </media-container>
  `;
}

export class VideoSkinElement extends SkinElement {
  static readonly tagName = 'video-skin';
  static styles = createShadowStyle(styles);
  static template = createTemplate(getTemplateHTML());
}

safeDefine(VideoSkinElement);

declare global {
  interface HTMLElementTagNameMap {
    [VideoSkinElement.tagName]: VideoSkinElement;
  }
}
