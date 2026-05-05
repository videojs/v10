import { renderIcon } from '@videojs/icons/render';
import {
  bufferingIndicator,
  button,
  buttonGroupEnd,
  buttonGroupStart,
  controls,
  error,
  icon,
  iconState,
  inputFeedback,
  overlay,
  popup,
  poster,
  root,
  slider,
} from '@videojs/skins/default/tailwind/video.tailwind';
import { createTemplate } from '@videojs/utils/dom';
import { cn } from '@videojs/utils/style';
import { safeDefine } from '../safe-define';
import { SkinElement } from '../skin-element';

// Register the live video player, container, and all UI custom elements.
import './ui';

function getTemplateHTML() {
  return /*html*/ `
    <media-container class="${root(true)}">
      <!-- @deprecated slot="media" is no longer required, use the default slot instead -->
      <slot name="media"></slot>
      <slot></slot>

      <media-poster class="${poster(true)}">
        <slot name="poster"></slot>
      </media-poster>

      <media-buffering-indicator class="${bufferingIndicator.root}">
        <div class="${bufferingIndicator.container}">
          ${renderIcon('spinner')}
        </div>
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
              <media-tooltip id="play-tooltip" side="top" class="${cn(popup.tooltip)}">
                <media-tooltip-label></media-tooltip-label>
                <media-tooltip-shortcut class="${popup.tooltipShortcut}"></media-tooltip-shortcut>
              </media-tooltip>

              <media-live-button class="${cn(button.base, button.subtle, button.live)}"></media-live-button>
          </div>

          <div class="grow" aria-hidden="true"></div>

          <div class="${buttonGroupEnd}">
            <media-mute-button commandfor="live-video-volume-popover" class="${cn(button.base, button.subtle, button.icon, iconState.mute.button)}">
              ${renderIcon('volume-off', { class: cn(icon, iconState.mute.volumeOff) })}
              ${renderIcon('volume-low', { class: cn(icon, iconState.mute.volumeLow) })}
              ${renderIcon('volume-high', { class: cn(icon, iconState.mute.volumeHigh) })}
            </media-mute-button>

            <media-popover id="live-video-volume-popover" open-on-hover delay="200" close-delay="100" side="top" class="${cn(popup.popover, popup.volume)}">
              <media-volume-slider class="${slider.root}" orientation="vertical" thumb-alignment="edge">
                <media-slider-track class="${slider.track}">
                  <media-slider-fill class="${cn(slider.fill.base, slider.fill.fill)}"></media-slider-fill>
                </media-slider-track>
                <media-slider-thumb class="${cn(slider.thumb.base, slider.thumb.persistent)}"></media-slider-thumb>
              </media-volume-slider>
            </media-popover>
              <media-captions-button commandfor="captions-tooltip" class="${cn(button.base, button.subtle, button.icon, iconState.captions.button)}">
                ${renderIcon('captions-off', { class: cn(icon, iconState.captions.off) })}
                ${renderIcon('captions-on', { class: cn(icon, iconState.captions.on) })}
              </media-captions-button>
              <media-tooltip id="captions-tooltip" side="top" class="${cn(popup.tooltip)}">
                <media-tooltip-label></media-tooltip-label>
                <media-tooltip-shortcut class="${popup.tooltipShortcut}"></media-tooltip-shortcut>
              </media-tooltip>
              <media-cast-button commandfor="cast-tooltip" class="${cn(button.base, button.subtle, button.icon, iconState.cast.button)}">
                ${renderIcon('cast-enter', { class: cn(icon, iconState.cast.enter) })}
                ${renderIcon('cast-exit', { class: cn(icon, iconState.cast.exit) })}
              </media-cast-button>
              <media-tooltip id="cast-tooltip" side="top" class="${cn(popup.tooltip)}">
                <media-tooltip-label></media-tooltip-label>
                <media-tooltip-shortcut class="${popup.tooltipShortcut}"></media-tooltip-shortcut>
              </media-tooltip>
              <media-pip-button commandfor="pip-tooltip" class="${cn(button.base, button.subtle, button.icon, iconState.pip.button)}">
                ${renderIcon('pip-enter', { class: cn(icon, iconState.pip.off) })}
                ${renderIcon('pip-exit', { class: cn(icon, iconState.pip.on) })}
              </media-pip-button>
              <media-tooltip id="pip-tooltip" side="top" class="${cn(popup.tooltip)}">
                <media-tooltip-label></media-tooltip-label>
                <media-tooltip-shortcut class="${popup.tooltipShortcut}"></media-tooltip-shortcut>
              </media-tooltip>
              <media-fullscreen-button commandfor="fullscreen-tooltip" class="${cn(button.base, button.subtle, button.icon, iconState.fullscreen.button)}">
                ${renderIcon('fullscreen-enter', { class: cn(icon, iconState.fullscreen.enter) })}
                ${renderIcon('fullscreen-exit', { class: cn(icon, iconState.fullscreen.exit) })}
              </media-fullscreen-button>
              <media-tooltip id="fullscreen-tooltip" side="top" class="${cn(popup.tooltip)}">
                <media-tooltip-label></media-tooltip-label>
                <media-tooltip-shortcut class="${popup.tooltipShortcut}"></media-tooltip-shortcut>
              </media-tooltip>
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
      <media-hotkey keys="ArrowUp" action="volumeStep" value="0.05"></media-hotkey>
      <media-hotkey keys="ArrowDown" action="volumeStep" value="-0.05"></media-hotkey>

      <!-- Gestures -->
      <media-gesture type="tap" action="togglePaused" pointer="mouse" region="center"></media-gesture>
      <media-gesture type="tap" action="toggleControls" pointer="touch"></media-gesture>
      <media-gesture type="doubletap" action="toggleFullscreen" region="center"></media-gesture>

      <!-- Input Feedback -->
      <media-status-announcer></media-status-announcer>
      <div class="${inputFeedback.root}">
        <media-volume-indicator hidden class="${cn(inputFeedback.island.base, inputFeedback.island.volume, inputFeedback.island.shownVolume)}">
          <media-volume-indicator-fill class="${inputFeedback.island.content}">
            ${renderIcon('volume-high', { class: cn(inputFeedback.island.icon, inputFeedback.island.shownVolumeHigh) })}
            ${renderIcon('volume-low', { class: cn(inputFeedback.island.icon, inputFeedback.island.shownVolumeLow) })}
            ${renderIcon('volume-off', { class: cn(inputFeedback.island.icon, inputFeedback.island.shownVolumeOff) })}
            <media-volume-indicator-value class="${inputFeedback.island.value}"></media-volume-indicator-value>
          </media-volume-indicator-fill>
        </media-volume-indicator>
        <media-status-indicator
          hidden
          actions="toggleSubtitles toggleFullscreen togglePictureInPicture"
          class="${cn(inputFeedback.island.base, inputFeedback.island.shownStatus)}"
        >
          <div class="${inputFeedback.island.content}">
            ${renderIcon('captions-on', { class: cn(inputFeedback.island.icon, inputFeedback.island.shownCaptionsOn) })}
            ${renderIcon('captions-off', { class: cn(inputFeedback.island.icon, inputFeedback.island.shownCaptionsOff) })}
            ${renderIcon('fullscreen-enter', { class: cn(inputFeedback.island.icon, inputFeedback.island.shownFullscreenEnter) })}
            ${renderIcon('fullscreen-exit', { class: cn(inputFeedback.island.icon, inputFeedback.island.shownFullscreenExit) })}
            ${renderIcon('pip-enter', { class: cn(inputFeedback.island.icon, inputFeedback.island.shownPipEnter) })}
            ${renderIcon('pip-exit', { class: cn(inputFeedback.island.icon, inputFeedback.island.shownPipExit) })}
            <media-status-indicator-value class="${inputFeedback.island.value}"></media-status-indicator-value>
          </div>
        </media-status-indicator>
        <media-status-indicator hidden actions="togglePaused" class="${inputFeedback.bubble.base}">
          ${renderIcon('play', { class: cn(inputFeedback.bubble.icon, inputFeedback.bubble.shownPlay) })}
          ${renderIcon('pause', { class: cn(inputFeedback.bubble.icon, inputFeedback.bubble.shownPause) })}
        </media-status-indicator>
      </div>
    </media-container>
  `;
}

export class LiveVideoSkinTailwindElement extends SkinElement {
  static readonly tagName = 'live-video-skin-tailwind';
  static template = createTemplate(getTemplateHTML());
}

safeDefine(LiveVideoSkinTailwindElement);

declare global {
  interface HTMLElementTagNameMap {
    [LiveVideoSkinTailwindElement.tagName]: LiveVideoSkinTailwindElement;
  }
}
