import { renderIcon } from '@videojs/icons/render';
import { createShadowStyle, createTemplate } from '@videojs/utils/dom';
import { safeDefine } from '../safe-define';
import { SkinElement } from '../skin-element';
import styles from './skin.css?inline';

// Register the player, container, and all UI custom elements.
import './ui';

const SEEK_TIME = 10;

function getTemplateHTML() {
  return /*html*/ `
    <media-container class="media-default-skin media-default-skin--audio">
      <!-- @deprecated slot="media" is no longer required, use the default slot instead -->
      <slot name="media"></slot>
      <slot></slot>

      <media-error-dialog class="media-error">
        <div class="media-error__dialog">
          <div class="media-error__content">
            <media-alert-dialog-title class="media-error__title">Something went wrong.</media-alert-dialog-title>
            <media-alert-dialog-description class="media-error__description"></media-alert-dialog-description>
          </div>
          <div class="media-error__actions">
            <media-alert-dialog-close class="media-button media-button--subtle">OK</media-alert-dialog-close>
          </div>
        </div>
      </media-error-dialog>

      <div class="media-surface media-controls">
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
                ${renderIcon('seek', { class: 'media-icon media-icon--seek media-icon--flipped' })}
                <span class="media-icon__label">${SEEK_TIME}</span>
              </span>
            </media-seek-button>
            <media-tooltip id="seek-backward-tooltip" side="top" class="media-surface media-tooltip"></media-tooltip>

            <media-seek-button commandfor="seek-forward-tooltip" seconds="${SEEK_TIME}" class="media-button media-button--subtle media-button--icon media-button--seek">
              <span class="media-icon__container">
                ${renderIcon('seek', { class: 'media-icon media-icon--seek' })}
                <span class="media-icon__label">${SEEK_TIME}</span>
              </span>
            </media-seek-button>
            <media-tooltip id="seek-forward-tooltip" side="top" class="media-surface media-tooltip"></media-tooltip>
          </div>

          <div class="media-time-controls">
            <media-time type="current" class="media-time"></media-time>
            <media-time-slider class="media-slider">
              <media-slider-track class="media-slider__track">
                <media-slider-fill class="media-slider__fill"></media-slider-fill>
                <media-slider-buffer class="media-slider__buffer"></media-slider-buffer>
              </media-slider-track>
              <media-slider-thumb class="media-slider__thumb"></media-slider-thumb>
            </media-time-slider>
            <media-time type="duration" class="media-time"></media-time>
          </div>

          <div class="media-button-group">
            <media-playback-rate-button commandfor="playback-rate-tooltip" class="media-button media-button--subtle media-button--icon media-button--playback-rate"></media-playback-rate-button>
            <media-tooltip id="playback-rate-tooltip" side="top" class="media-surface media-tooltip"></media-tooltip>

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
          </div>
        </media-tooltip-group>
      </div>

      <!-- Hotkeys -->
      <media-hotkey keys="Space" action="togglePaused"></media-hotkey>
      <media-hotkey keys="k" action="togglePaused"></media-hotkey>
      <media-hotkey keys="m" action="toggleMuted"></media-hotkey>
      <media-hotkey keys="ArrowRight" action="seekStep" value="5"></media-hotkey>
      <media-hotkey keys="ArrowLeft" action="seekStep" value="-5"></media-hotkey>
      <media-hotkey keys="l" action="seekStep" value="10"></media-hotkey>
      <media-hotkey keys="j" action="seekStep" value="-10"></media-hotkey>
      <media-hotkey keys="ArrowUp" action="volumeStep" value="0.05"></media-hotkey>
      <media-hotkey keys="ArrowDown" action="volumeStep" value="-0.05"></media-hotkey>
      <media-hotkey keys="0-9" action="seekToPercent"></media-hotkey>
      <media-hotkey keys="Home" action="seekToPercent" value="0"></media-hotkey>
      <media-hotkey keys="End" action="seekToPercent" value="100"></media-hotkey>
      <media-hotkey keys=">" action="speedUp"></media-hotkey>
      <media-hotkey keys="<" action="speedDown"></media-hotkey>
    </media-container>
  `;
}

export class AudioSkinElement extends SkinElement {
  static readonly tagName = 'audio-skin';
  static styles = createShadowStyle(styles);
  static template = createTemplate(getTemplateHTML());
}

safeDefine(AudioSkinElement);

declare global {
  interface HTMLElementTagNameMap {
    [AudioSkinElement.tagName]: AudioSkinElement;
  }
}
