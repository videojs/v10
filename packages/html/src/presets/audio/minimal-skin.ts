import { renderIcon } from '@videojs/icons/render/minimal';
import { createShadowStyle, createTemplate } from '@videojs/utils/dom';

import { SkinElement } from '../skin';

import styles from '../../define/audio/minimal-skin.css?inline';

const SEEK_TIME = 10;

function getTemplateHTML() {
  return /*html*/ `
    <media-container class="media-minimal-skin media-minimal-skin--audio">
      <!-- @deprecated slot="media" is no longer required, use the default slot instead -->
      <slot name="media"></slot>
      <slot></slot>

      <media-error-dialog>
        <media-dialog-popup class="media-dialog__popup">
          <div class="media-dialog__dialog">
          <div class="media-dialog__content">
            <media-dialog-title class="media-dialog__title"></media-dialog-title>
            <media-dialog-description class="media-dialog__description"></media-dialog-description>
          </div>
          <div class="media-dialog__actions">
            <media-dialog-close class="media-button media-button--subtle"></media-dialog-close>
          </div>
          </div>
        </media-dialog-popup>
      </media-error-dialog>

      <div class="media-controls">
        <media-tooltip-group>
          <div class="media-button-group">
            <span class="media-button--play__wrapper">
              <media-buffering-indicator class="media-buffering-indicator">
                ${renderIcon('spinner', { class: 'media-icon' })}
              </media-buffering-indicator>
              <media-play-button commandfor="play-tooltip" class="media-button media-button--subtle media-button--icon media-button--play">
                ${renderIcon('restart', { class: 'media-icon media-icon--restart' })}
                ${renderIcon('play', { class: 'media-icon media-icon--play' })}
                ${renderIcon('pause', { class: 'media-icon media-icon--pause' })}
              </media-play-button>
              <media-tooltip id="play-tooltip" side="top" boundary="viewport" class="media-tooltip">
                <media-tooltip-label></media-tooltip-label>
                <media-tooltip-shortcut class="media-tooltip__kbd"></media-tooltip-shortcut>
              </media-tooltip>
            </span>

            <media-seek-button commandfor="seek-backward-tooltip" seconds="${-SEEK_TIME}" class="media-button media-button--subtle media-button--icon media-button--seek">
              <span class="media-icon__container">
                ${renderIcon('seek', { class: 'media-icon media-icon--seek media-icon--flipped' })}
                <span class="media-icon__label">${SEEK_TIME}</span>
              </span>
            </media-seek-button>
            <media-tooltip id="seek-backward-tooltip" side="top" boundary="viewport" class="media-tooltip">
              <media-tooltip-label></media-tooltip-label>
              <media-tooltip-shortcut class="media-tooltip__kbd"></media-tooltip-shortcut>
            </media-tooltip>

            <media-seek-button commandfor="seek-forward-tooltip" seconds="${SEEK_TIME}" class="media-button media-button--subtle media-button--icon media-button--seek">
              <span class="media-icon__container">
                ${renderIcon('seek', { class: 'media-icon media-icon--seek' })}
                <span class="media-icon__label">${SEEK_TIME}</span>
              </span>
            </media-seek-button>
            <media-tooltip id="seek-forward-tooltip" side="top" boundary="viewport" class="media-tooltip">
              <media-tooltip-label></media-tooltip-label>
              <media-tooltip-shortcut class="media-tooltip__kbd"></media-tooltip-shortcut>
            </media-tooltip>
          </div>

          <div class="media-time-controls">
            <media-time-group class="media-time-group">
              <media-time toggle type="current" class="media-time media-time--current"></media-time>
              <media-time-separator class="media-time-separator"></media-time-separator>
              <media-time type="duration" class="media-time media-time--duration"></media-time>
            </media-time-group>

            <media-time-slider class="media-slider">
              <media-slider-track class="media-slider__track">
                <media-slider-buffer class="media-slider__buffer"></media-slider-buffer>
                <media-slider-fill class="media-slider__fill"></media-slider-fill>
              </media-slider-track>
              <media-slider-thumb class="media-slider__thumb"></media-slider-thumb>
              <media-slider-preview class="media-slider__preview">
                <media-slider-value type="pointer" class="media-tooltip media-slider__value media-time"></media-slider-value>
              </media-slider-preview>
            </media-time-slider>
          </div>

          <div class="media-button-group">
            <media-mute-button id="audio-mute-trigger" commandfor="audio-volume-popover" class="media-button media-button--subtle media-button--icon media-button--mute">
              ${renderIcon('volume-off', { class: 'media-icon media-icon--volume-off' })}
              ${renderIcon('volume-low', { class: 'media-icon media-icon--volume-low' })}
              ${renderIcon('volume-high', { class: 'media-icon media-icon--volume-high' })}
            </media-mute-button>
            <media-tooltip trigger="audio-mute-trigger" delay="0" sticky side="top" class="media-tooltip">
              <media-tooltip-label></media-tooltip-label>
              <media-tooltip-shortcut class="media-tooltip__kbd"></media-tooltip-shortcut>
            </media-tooltip>

            <media-popover id="audio-volume-popover" open-on-hover delay="200" close-delay="100" side="left" boundary="viewport" class="media-popover media-popover--volume">
              <media-volume-slider class="media-slider" orientation="horizontal" thumb-alignment="edge">
                <media-slider-track class="media-slider__track">
                  <media-slider-fill class="media-slider__fill"></media-slider-fill>
                </media-slider-track>
                <media-slider-thumb class="media-slider__thumb media-slider__thumb--persistent"></media-slider-thumb>
              </media-volume-slider>
            </media-popover>

            <media-playback-rate-button id="playback-rate-trigger" commandfor="playback-rate-menu" class="media-button media-button--subtle media-button--icon media-button--playback-rate"></media-playback-rate-button>
            <media-menu id="playback-rate-menu" side="top" align="center" boundary="viewport" class="media-popover media-menu">
              <media-menu-content class="media-menu__content">
                <media-playback-rate-radio-group class="media-menu__group">
                  <template>
                    <media-menu-radio-item class="media-menu__item">
                      <span data-part="label"></span>
                      <media-menu-item-indicator force-mount class="media-menu__indicator">
                        ${renderIcon('check', { class: 'media-icon' })}
                      </media-menu-item-indicator>
                    </media-menu-radio-item>
                  </template>
                </media-playback-rate-radio-group>
              </media-menu-content>
            </media-menu>
            <media-tooltip trigger="playback-rate-trigger" side="top" boundary="viewport" class="media-tooltip">
              <media-tooltip-label></media-tooltip-label>
              <media-tooltip-shortcut class="media-tooltip__kbd"></media-tooltip-shortcut>
            </media-tooltip>

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

export class MinimalAudioSkinElement extends SkinElement {
  static readonly tagName = 'audio-minimal-skin';
  static styles = createShadowStyle(styles);
  static template = createTemplate(getTemplateHTML());
}

declare global {
  interface HTMLElementTagNameMap {
    [MinimalAudioSkinElement.tagName]: MinimalAudioSkinElement;
  }
}
