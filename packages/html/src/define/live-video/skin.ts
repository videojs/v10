import { renderIcon } from '@videojs/icons/render';
import { createShadowStyle, createTemplate } from '@videojs/utils/dom';
import { safeDefine } from '../safe-define';
import { SkinElement } from '../skin-element';
import styles from './skin.css?inline';

// Register the live video player, container, and all UI custom elements.
import './ui';

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

            <media-live-button class="media-button media-button--subtle media-button--live">
              <span class="media-live-indicator" aria-hidden="true"></span>
              <span class="media-live-label">LIVE</span>
            </media-live-button>
          </div>

          <div class="media-time-controls" aria-hidden="true"></div>

          <div class="media-button-group">
            <media-mute-button commandfor="live-video-volume-popover" class="media-button media-button--subtle media-button--icon media-button--mute">
              ${renderIcon('volume-off', { class: 'media-icon media-icon--volume-off' })}
              ${renderIcon('volume-low', { class: 'media-icon media-icon--volume-low' })}
              ${renderIcon('volume-high', { class: 'media-icon media-icon--volume-high' })}
            </media-mute-button>

            <media-popover id="live-video-volume-popover" open-on-hover delay="200" close-delay="100" side="top" class="media-surface media-popover media-popover--volume">
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

            <media-cast-button commandfor="cast-tooltip" class="media-button media-button--subtle media-button--icon media-button--cast">
              ${renderIcon('cast-enter', { class: 'media-icon media-icon--cast-enter' })}
              ${renderIcon('cast-exit', { class: 'media-icon media-icon--cast-exit' })}
            </media-cast-button>
            <media-tooltip id="cast-tooltip" side="top" class="media-surface media-tooltip"></media-tooltip>

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

      <!-- Hotkeys -->
      <media-hotkey keys="Space" action="togglePaused"></media-hotkey>
      <media-hotkey keys="k" action="togglePaused"></media-hotkey>
      <media-hotkey keys="m" action="toggleMuted"></media-hotkey>
      <media-hotkey keys="f" action="toggleFullscreen"></media-hotkey>
      <media-hotkey keys="c" action="toggleSubtitles"></media-hotkey>
      <media-hotkey keys="i" action="togglePictureInPicture"></media-hotkey>
      <media-hotkey keys="ArrowUp" action="volumeStep" value="0.05"></media-hotkey>
      <media-hotkey keys="ArrowDown" action="volumeStep" value="-0.05"></media-hotkey>

      <!-- Gestures -->
      <media-gesture type="tap" action="togglePaused" pointer="mouse" region="center"></media-gesture>
      <media-gesture type="tap" action="toggleControls" pointer="touch"></media-gesture>
      <media-gesture type="doubletap" action="toggleFullscreen" region="center"></media-gesture>
    </media-container>
  `;
}

export class LiveVideoSkinElement extends SkinElement {
  static readonly tagName = 'live-video-skin';
  static styles = createShadowStyle(styles);
  static template = createTemplate(getTemplateHTML());
}

safeDefine(LiveVideoSkinElement);

declare global {
  interface HTMLElementTagNameMap {
    [LiveVideoSkinElement.tagName]: LiveVideoSkinElement;
  }
}
