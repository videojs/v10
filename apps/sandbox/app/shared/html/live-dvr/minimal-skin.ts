// Importing the minimal live-video skin registers the live player, container,
// and minimal UI custom elements (including the time slider + time elements the
// DVR skin adds back in) and exposes the base skin element we extend below.
import { MinimalLiveVideoSkinElement } from '@videojs/html/live-video/minimal-skin';
import { renderIcon } from '@videojs/icons/render/minimal';
import { createTemplate } from '@videojs/utils/dom';

function getTemplateHTML() {
  return /*html*/ `
    <media-container class="media-minimal-skin media-minimal-skin--video">
      <slot name="media"></slot>
      <slot></slot>

      <media-poster>
        <slot name="poster"></slot>
      </media-poster>

      <media-buffering-indicator class="media-buffering-indicator">
        ${renderIcon('spinner', { class: 'media-icon' })}
      </media-buffering-indicator>

      <media-error-dialog class="media-error">
        <div class="media-error__dialog">
          <div class="media-error__content">
            <media-alert-dialog-title class="media-error__title">Something went wrong.</media-alert-dialog-title>
            <media-alert-dialog-description class="media-error__description"></media-alert-dialog-description>
          </div>
          <div class="media-error__actions">
            <media-alert-dialog-close class="media-button media-button--primary">OK</media-alert-dialog-close>
          </div>
        </div>
      </media-error-dialog>

      <media-controls class="media-controls">
        <media-tooltip-group>
          <div class="media-button-group">
            <media-play-button commandfor="play-tooltip" class="media-button media-button--subtle media-button--icon media-button--play">
              ${renderIcon('restart', { class: 'media-icon media-icon--restart' })}
              ${renderIcon('play', { class: 'media-icon media-icon--play' })}
              ${renderIcon('pause', { class: 'media-icon media-icon--pause' })}
            </media-play-button>
            <media-tooltip id="play-tooltip" side="top" class="media-tooltip"></media-tooltip>

            <media-live-button class="media-button media-button--subtle media-button--live"></media-live-button>
          </div>

          <div class="media-time-controls">
            <media-time-group class="media-time-group">
              <media-time type="current" class="media-time media-time--current"></media-time>
              <media-time-separator class="media-time-separator"></media-time-separator>
              <media-time type="duration" class="media-time media-time--duration"></media-time>
            </media-time-group>

            <media-time-slider class="media-slider">
              <media-slider-track class="media-slider__track">
                <media-slider-fill class="media-slider__fill"></media-slider-fill>
                <media-slider-buffer class="media-slider__buffer"></media-slider-buffer>
              </media-slider-track>
              <media-slider-thumb class="media-slider__thumb"></media-slider-thumb>

              <div class="media-preview media-slider__preview">
                <div class="media-preview__thumbnail-wrapper">
                  <media-slider-thumbnail class="media-preview__thumbnail"></media-slider-thumbnail>
                </div>
                <media-slider-value type="pointer" class="media-time media-preview__time"></media-slider-value>
                ${renderIcon('spinner', { class: 'media-preview__spinner media-icon' })}
              </div>
            </media-time-slider>
          </div>

          <div class="media-button-group">
            <media-mute-button commandfor="live-dvr-volume-popover" class="media-button media-button--subtle media-button--icon media-button--mute">
              ${renderIcon('volume-off', { class: 'media-icon media-icon--volume-off' })}
              ${renderIcon('volume-low', { class: 'media-icon media-icon--volume-low' })}
              ${renderIcon('volume-high', { class: 'media-icon media-icon--volume-high' })}
            </media-mute-button>

            <media-popover id="live-dvr-volume-popover" open-on-hover delay="200" close-delay="100" side="top" class="media-popover media-popover--volume">
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
            <media-tooltip id="captions-tooltip" side="top" class="media-tooltip"></media-tooltip>

            <media-cast-button commandfor="cast-tooltip" class="media-button media-button--subtle media-button--icon media-button--cast">
              ${renderIcon('cast-enter', { class: 'media-icon media-icon--cast-enter' })}
              ${renderIcon('cast-exit', { class: 'media-icon media-icon--cast-exit' })}
            </media-cast-button>
            <media-tooltip id="cast-tooltip" side="top" class="media-tooltip"></media-tooltip>

            <media-airplay-button commandfor="airplay-tooltip" class="media-button media-button--subtle media-button--icon media-button--airplay">
              ${renderIcon('airplay-enter', { class: 'media-icon media-icon--airplay-enter' })}
              ${renderIcon('airplay-exit', { class: 'media-icon media-icon--airplay-exit' })}
            </media-airplay-button>
            <media-tooltip id="airplay-tooltip" side="top" class="media-tooltip"></media-tooltip>

            <media-pip-button commandfor="pip-tooltip" class="media-button media-button--subtle media-button--icon media-button--pip">
              ${renderIcon('pip-enter', { class: 'media-icon media-icon--pip-enter' })}
              ${renderIcon('pip-exit', { class: 'media-icon media-icon--pip-exit' })}
            </media-pip-button>
            <media-tooltip id="pip-tooltip" side="top" class="media-tooltip"></media-tooltip>

            <media-fullscreen-button commandfor="fullscreen-tooltip" class="media-button media-button--subtle media-button--icon media-button--fullscreen">
              ${renderIcon('fullscreen-enter', { class: 'media-icon media-icon--fullscreen-enter' })}
              ${renderIcon('fullscreen-exit', { class: 'media-icon media-icon--fullscreen-exit' })}
            </media-fullscreen-button>
            <media-tooltip id="fullscreen-tooltip" side="top" class="media-tooltip"></media-tooltip>
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

      <!-- Input Feedback -->
      <media-status-announcer></media-status-announcer>
      <div class="media-input-feedback">
        <media-volume-indicator hidden class="media-input-feedback-island media-input-feedback-island--volume">
          <media-volume-indicator-fill class="media-input-feedback-island__content">
            ${renderIcon('volume-high', { class: 'media-icon media-icon--volume-high' })}
            ${renderIcon('volume-low', { class: 'media-icon media-icon--volume-low' })}
            ${renderIcon('volume-off', { class: 'media-icon media-icon--volume-off' })}
            <div class="media-input-feedback-island__progress" aria-hidden="true"></div>
            <media-volume-indicator-value class="media-input-feedback-island__value"></media-volume-indicator-value>
          </media-volume-indicator-fill>
        </media-volume-indicator>
        <media-status-indicator
          hidden
          actions="toggleSubtitles toggleFullscreen togglePictureInPicture"
          class="media-input-feedback-island media-input-feedback-island--status"
        >
          <div class="media-input-feedback-island__content">
            ${renderIcon('captions-on', { class: 'media-icon media-icon--captions-on' })}
            ${renderIcon('captions-off', { class: 'media-icon media-icon--captions-off' })}
            ${renderIcon('fullscreen-enter', { class: 'media-icon media-icon--fullscreen-enter' })}
            ${renderIcon('fullscreen-exit', { class: 'media-icon media-icon--fullscreen-exit' })}
            ${renderIcon('pip-enter', { class: 'media-icon media-icon--pip-enter' })}
            ${renderIcon('pip-exit', { class: 'media-icon media-icon--pip-exit' })}
            <media-status-indicator-value class="media-input-feedback-island__value"></media-status-indicator-value>
          </div>
        </media-status-indicator>
        <media-status-indicator hidden actions="togglePaused" class="media-input-feedback-bubble">
          ${renderIcon('play', { class: 'media-icon media-icon--play' })}
          ${renderIcon('pause', { class: 'media-icon media-icon--pause' })}
        </media-status-indicator>
      </div>
    </media-container>
  `;
}

const TAG_NAME = 'live-dvr-minimal-skin';

/**
 * Sandbox-only minimal live DVR skin. Extends the library
 * `live-video-minimal-skin` element (inheriting its shared/skin styles) and
 * swaps in a template that keeps the time slider and current / duration time
 * displays so viewers can scrub within the seekable DVR window.
 */
export class MinimalLiveDvrSkinElement extends MinimalLiveVideoSkinElement {
  static template = createTemplate(getTemplateHTML());
}

if (!customElements.get(TAG_NAME)) {
  customElements.define(TAG_NAME, MinimalLiveDvrSkinElement);
}

declare global {
  interface HTMLElementTagNameMap {
    'live-dvr-minimal-skin': MinimalLiveDvrSkinElement;
  }
}
