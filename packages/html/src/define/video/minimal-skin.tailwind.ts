import { renderIcon } from '@videojs/icons/render/minimal';
import {
  bufferingIndicator,
  button,
  buttonGroupEnd,
  buttonGroupStart,
  controls,
  error,
  icon,
  iconContainer,
  iconFlipped,
  iconState,
  inputFeedback,
  overlay,
  playbackRate,
  popup,
  poster,
  preview,
  root,
  seek,
  slider,
  time,
} from '@videojs/skins/minimal/tailwind/video.tailwind';
import { createTemplate } from '@videojs/utils/dom';
import { cn } from '@videojs/utils/style';
import { safeDefine } from '../safe-define';
import { SkinElement } from '../skin-element';

// Register the player, container, and all UI custom elements.
import './minimal-ui';

const SEEK_TIME = 10;

function getTemplateHTML() {
  return /*html*/ `
    <media-container class="${root(true)}">
      <!-- @deprecated slot="media" is no longer required, use the default slot instead -->
      <slot name="media"></slot>
      <slot></slot>

      <media-poster class="${poster(true)}">
        <slot name="poster"></slot>
      </media-poster>

      <media-buffering-indicator class="${bufferingIndicator}">
        ${renderIcon('spinner')}
      </media-buffering-indicator>

      <media-error-dialog class="${error.root}">
        <div class="${error.dialog}">
          <div class="${error.content}">
            <media-alert-dialog-title class="${error.title}">Something went wrong.</media-alert-dialog-title>
            <media-alert-dialog-description class="${error.description}"></media-alert-dialog-description>
          </div>
          <div class="${error.actions}">
            <media-alert-dialog-close class="${cn(button.base, button.primary)}">OK</media-alert-dialog-close>
          </div>
        </div>
      </media-error-dialog>

      <media-controls data-controls="" class="${controls}">
        <media-tooltip-group>
          <div class="${buttonGroupStart}">
              <media-play-button commandfor="play-tooltip" class="${cn(button.base, button.subtle, button.icon, iconState.play.button)}">
                ${renderIcon('restart', { class: cn(icon, iconState.play.restart) })}
                ${renderIcon('play', { class: cn(icon, iconState.play.play) })}
                ${renderIcon('pause', { class: cn(icon, iconState.play.pause) })}
              </media-play-button>
              <media-tooltip id="play-tooltip" side="top" class="${cn(popup.tooltip)}"></media-tooltip>

            <media-seek-button commandfor="seek-backward-tooltip" seconds="${-SEEK_TIME}" class="${cn(button.base, button.subtle, button.icon)}">
              <span class="${iconContainer}">
                ${renderIcon('seek', { class: cn(icon, iconFlipped) })}
                <span class="${cn(seek.label, seek.labelBackward)}">${SEEK_TIME}</span>
              </span>
            </media-seek-button>
            <media-tooltip id="seek-backward-tooltip" side="top" class="${cn(popup.tooltip)}"></media-tooltip>

            <media-seek-button commandfor="seek-forward-tooltip" seconds="${SEEK_TIME}" class="${cn(button.base, button.subtle, button.icon)}">
              <span class="${iconContainer}">
                ${renderIcon('seek', { class: icon })}
                <span class="${cn(seek.label, seek.labelForward)}">${SEEK_TIME}</span>
              </span>
            </media-seek-button>
            <media-tooltip id="seek-forward-tooltip" side="top" class="${cn(popup.tooltip)}"></media-tooltip>
          </div>

          <div class="${time.controls}">
            <media-time-group class="${time.group}">
              <media-time type="current" class="${time.current}"></media-time>
              <media-time-separator class="${time.separator}"></media-time-separator>
              <media-time type="duration" class="${time.duration}"></media-time>
            </media-time-group>

            <media-time-slider class="${slider.root}">
              <media-slider-track class="${slider.track}">
                <media-slider-fill class="${cn(slider.fill.base, slider.fill.fill)}"></media-slider-fill>
                <media-slider-buffer class="${cn(slider.fill.base, slider.fill.buffer)}"></media-slider-buffer>
              </media-slider-track>
              <media-slider-thumb class="${cn(slider.thumb.base, slider.thumb.interactive)}"></media-slider-thumb>

              <div class="${preview.root}">
                <div class="${preview.thumbnailWrapper}">
                  <media-slider-thumbnail class="${preview.thumbnail}"></media-slider-thumbnail>
                </div>
                <media-slider-value type="pointer" class="${preview.time}"></media-slider-value>
                ${renderIcon('spinner', { class: cn(icon, preview.spinner) })}
              </div>
            </media-time-slider>
          </div>

          <div class="${buttonGroupEnd}">
            <media-playback-rate-button commandfor="playback-rate-tooltip"  class="${cn(button.base, button.subtle, button.icon, playbackRate.button)}">
            </media-playback-rate-button>
            <media-tooltip id="playback-rate-tooltip" side="top" class="${cn(popup.tooltip)}"></media-tooltip>

            <media-mute-button commandfor="video-volume-popover" class="${cn(button.base, button.subtle, button.icon, iconState.mute.button)}">
              ${renderIcon('volume-off', { class: cn(icon, iconState.mute.volumeOff) })}
              ${renderIcon('volume-low', { class: cn(icon, iconState.mute.volumeLow) })}
              ${renderIcon('volume-high', { class: cn(icon, iconState.mute.volumeHigh) })}
            </media-mute-button>

            <media-popover id="video-volume-popover" open-on-hover delay="200" close-delay="100" side="top" class="${cn(popup.volume)}">
              <media-volume-slider class="${slider.root}" orientation="vertical" thumb-alignment="edge">
                <media-slider-track class="${slider.track}">
                  <media-slider-fill class="${cn(slider.fill.base, slider.fill.fill)}"></media-slider-fill>
                </media-slider-track>
                <media-slider-thumb class="${slider.thumb.base}"></media-slider-thumb>
              </media-volume-slider>
            </media-popover>
              <media-captions-button commandfor="captions-tooltip" class="${cn(button.base, button.subtle, button.icon, iconState.captions.button)}">
                ${renderIcon('captions-off', { class: cn(icon, iconState.captions.off) })}
                ${renderIcon('captions-on', { class: cn(icon, iconState.captions.on) })}
              </media-captions-button>
              <media-tooltip id="captions-tooltip" side="top" class="${cn(popup.tooltip)}"></media-tooltip>
              <media-cast-button commandfor="cast-tooltip" class="${cn(button.base, button.subtle, button.icon, iconState.cast.button)}">
                ${renderIcon('cast-enter', { class: cn(icon, iconState.cast.enter) })}
                ${renderIcon('cast-exit', { class: cn(icon, iconState.cast.exit) })}
              </media-cast-button>
              <media-tooltip id="cast-tooltip" side="top" class="${cn(popup.tooltip)}"></media-tooltip>
              <media-pip-button commandfor="pip-tooltip" class="${cn(button.base, button.subtle, button.icon, iconState.pip.button)}">
                ${renderIcon('pip-enter', { class: cn(icon, iconState.pip.off) })}
                ${renderIcon('pip-exit', { class: cn(icon, iconState.pip.on) })}
              </media-pip-button>
              <media-tooltip id="pip-tooltip" side="top" class="${cn(popup.tooltip)}"></media-tooltip>
              <media-fullscreen-button commandfor="fullscreen-tooltip" class="${cn(button.base, button.subtle, button.icon, iconState.fullscreen.button)}">
                ${renderIcon('fullscreen-enter', { class: cn(icon, iconState.fullscreen.enter) })}
                ${renderIcon('fullscreen-exit', { class: cn(icon, iconState.fullscreen.exit) })}
              </media-fullscreen-button>
              <media-tooltip id="fullscreen-tooltip" side="top" class="${cn(popup.tooltip)}"></media-tooltip>
          </div>
        </media-tooltip-group>
      </media-controls>

      <div class="${overlay}"></div>

      <!-- Hotkeys -->
      <media-hotkey keys="Space" action="togglePaused"></media-hotkey>
      <media-hotkey keys="k" action="togglePaused"></media-hotkey>
      <media-hotkey keys="m" action="toggleMuted"></media-hotkey>
      <media-hotkey keys="f" action="toggleFullscreen"></media-hotkey>
      <media-hotkey keys="c" action="toggleSubtitles"></media-hotkey>
      <media-hotkey keys="i" action="togglePictureInPicture"></media-hotkey>
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

      <!-- Gestures -->
      <media-gesture type="tap" action="togglePaused" pointer="mouse" region="center"></media-gesture>
      <media-gesture type="tap" action="toggleControls" pointer="touch"></media-gesture>
      <media-gesture type="doubletap" action="seekStep" value="-10" region="left"></media-gesture>
      <media-gesture type="doubletap" action="toggleFullscreen" region="center"></media-gesture>
      <media-gesture type="doubletap" action="seekStep" value="10" region="right"></media-gesture>

      <!-- Input Feedback -->
      <media-input-feedback class="${inputFeedback.root}">
        <media-input-feedback-item
          group="volume"
          class="${cn(inputFeedback.island.base, inputFeedback.island.volume, inputFeedback.island.shownVolume)}"
        >
          <div data-feedback-island-content="" class="${inputFeedback.island.content}">
            ${renderIcon('volume-high', { class: cn(inputFeedback.island.icon, inputFeedback.island.shownVolumeHigh) })}
            ${renderIcon('volume-low', { class: cn(inputFeedback.island.icon, inputFeedback.island.shownVolumeLow) })}
            ${renderIcon('volume-off', { class: cn(inputFeedback.island.icon, inputFeedback.island.shownVolumeOff) })}
            <div aria-hidden="true" class="${inputFeedback.island.volumeProgress}"></div>
            <media-input-feedback-value class="${inputFeedback.island.value}"></media-input-feedback-value>
          </div>
        </media-input-feedback-item>

        <media-input-feedback-item group="captions" class="${cn(inputFeedback.island.base, inputFeedback.island.shownCaptions)}">
          <div class="${inputFeedback.island.content}">
            ${renderIcon('captions-on', { class: cn(inputFeedback.island.icon, inputFeedback.island.shownCaptionsOn) })}
            ${renderIcon('captions-off', { class: cn(inputFeedback.island.icon, inputFeedback.island.shownCaptionsOff) })}
            <media-input-feedback-value class="${inputFeedback.island.value}"></media-input-feedback-value>
          </div>
        </media-input-feedback-item>

        <media-input-feedback-item group="seek" class="${inputFeedback.bubble.base}">
          <media-input-feedback-icon>
            ${renderIcon('chevron', { class: cn(inputFeedback.bubble.icon, inputFeedback.bubble.shownSeek) })}
          </media-input-feedback-icon>
          <media-input-feedback-time class="${inputFeedback.bubble.time}"></media-input-feedback-time>
        </media-input-feedback-item>

        <media-input-feedback-item group="playback" class="${inputFeedback.bubble.base}">
          <media-input-feedback-icon>
            ${renderIcon('play', { class: cn(inputFeedback.bubble.icon, inputFeedback.bubble.shownPlay) })}
            ${renderIcon('pause', { class: cn(inputFeedback.bubble.icon, inputFeedback.bubble.shownPause) })}
          </media-input-feedback-icon>
        </media-input-feedback-item>
      </media-input-feedback>
    </media-container>
  `;
}

export class MinimalVideoSkinTailwindElement extends SkinElement {
  static readonly tagName = 'video-minimal-skin-tailwind';
  static template = createTemplate(getTemplateHTML());
}

safeDefine(MinimalVideoSkinTailwindElement);

declare global {
  interface HTMLElementTagNameMap {
    [MinimalVideoSkinTailwindElement.tagName]: MinimalVideoSkinTailwindElement;
  }
}
