import { renderIcon } from '@videojs/icons/render/minimal';
import { createShadowStyle, createTemplate } from '@videojs/utils/dom';
import { safeDefine } from '../safe-define';
import { SkinElement } from '../skin-element';
import styles from './minimal-skin.css?inline';

// Register the live audio player, container, and minimal UI custom elements.
import './minimal-ui';

function getTemplateHTML() {
  return /*html*/ `
    <media-container class="media-minimal-skin media-minimal-skin--audio">
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

      <div class="media-controls">
        <media-tooltip-group>
          <div class="media-button-group">
            <media-play-button commandfor="play-tooltip" class="media-button media-button--subtle media-button--icon media-button--play">
              ${renderIcon('restart', { class: 'media-icon media-icon--restart' })}
              ${renderIcon('play', { class: 'media-icon media-icon--play' })}
              ${renderIcon('pause', { class: 'media-icon media-icon--pause' })}
            </media-play-button>
            <media-tooltip id="play-tooltip" side="top" class="media-tooltip">
              <media-tooltip-label></media-tooltip-label>
              <media-tooltip-shortcut class="media-tooltip__kbd"></media-tooltip-shortcut>
            </media-tooltip>

            <media-live-button class="media-button media-button--subtle media-button--live"></media-live-button>
          </div>

          <div class="media-time-controls" aria-hidden="true"></div>

          <div class="media-button-group">
            <media-mute-button commandfor="live-audio-volume-popover" class="media-button media-button--subtle media-button--icon media-button--mute">
              ${renderIcon('volume-off', { class: 'media-icon media-icon--volume-off' })}
              ${renderIcon('volume-low', { class: 'media-icon media-icon--volume-low' })}
              ${renderIcon('volume-high', { class: 'media-icon media-icon--volume-high' })}
            </media-mute-button>

            <media-popover id="live-audio-volume-popover" open-on-hover delay="200" close-delay="100" side="left" class="media-popover media-popover--volume">
              <media-volume-slider class="media-slider" orientation="horizontal" thumb-alignment="edge">
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
      <media-hotkey keys="ArrowUp" action="volumeStep" value="0.05"></media-hotkey>
      <media-hotkey keys="ArrowDown" action="volumeStep" value="-0.05"></media-hotkey>
    </media-container>
  `;
}

export class MinimalLiveAudioSkinElement extends SkinElement {
  static readonly tagName = 'live-audio-minimal-skin';
  static styles = createShadowStyle(styles);
  static template = createTemplate(getTemplateHTML());
}

safeDefine(MinimalLiveAudioSkinElement);

declare global {
  interface HTMLElementTagNameMap {
    [MinimalLiveAudioSkinElement.tagName]: MinimalLiveAudioSkinElement;
  }
}
