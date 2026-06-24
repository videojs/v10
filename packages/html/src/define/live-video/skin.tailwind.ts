import { renderIcon } from '@videojs/icons/render';
import {
  airplayIcon,
  bufferingIndicator,
  button,
  buttonGroupEnd,
  buttonGroupStart,
  captionsIcon,
  castIcon,
  container,
  controls,
  error,
  fullscreenIcon,
  icon,
  inputFeedback,
  menu,
  muteIcon,
  overlay,
  pipIcon,
  playIcon,
  popup,
  poster,
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
    <media-container class="${container}">
      <!-- @deprecated slot="media" is no longer required, use the default slot instead -->
      <slot name="media"></slot>
      <slot></slot>

      <media-poster class="${poster}">
        <slot name="poster"></slot>
      </media-poster>

      <media-buffering-indicator class="${bufferingIndicator.root}">
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
              <media-play-button commandfor="play-tooltip" class="${cn(button.base, button.subtle, button.icon, playIcon.button)}">
                ${renderIcon('restart', { class: cn(icon, playIcon.restart) })}
                ${renderIcon('play', { class: cn(icon, playIcon.play) })}
                ${renderIcon('pause', { class: cn(icon, playIcon.pause) })}
              </media-play-button>
              <media-tooltip id="play-tooltip" side="top" class="${cn(popup.tooltip)}">
                <media-tooltip-label></media-tooltip-label>
                <media-tooltip-shortcut class="${popup.tooltipShortcut}"></media-tooltip-shortcut>
              </media-tooltip>

              <media-live-button class="${cn(button.base, button.subtle, button.live)}"></media-live-button>
          </div>

          <div class="grow" aria-hidden="true"></div>

          <div class="${buttonGroupEnd}">
            <media-mute-button commandfor="live-video-volume-popover" class="${cn(button.base, button.subtle, button.icon, muteIcon.button)}">
              ${renderIcon('volume-off', { class: cn(icon, muteIcon.volumeOff) })}
              ${renderIcon('volume-low', { class: cn(icon, muteIcon.volumeLow) })}
              ${renderIcon('volume-high', { class: cn(icon, muteIcon.volumeHigh) })}
            </media-mute-button>

            <media-popover id="live-video-volume-popover" open-on-hover delay="200" close-delay="100" side="top" class="${cn(popup.popover, popup.volume)}">
              <media-volume-slider class="${slider.root}" orientation="vertical" thumb-alignment="edge">
                <media-slider-track class="${slider.track}">
                  <media-slider-fill class="${cn(slider.fill.base, slider.fill.fill)}"></media-slider-fill>
                </media-slider-track>
                <media-slider-thumb class="${cn(slider.thumb.base, slider.thumb.persistent)}"></media-slider-thumb>
              </media-volume-slider>
            </media-popover>
              <media-captions-button menu-for="captions-menu" commandfor="captions-tooltip" class="${cn(button.base, button.subtle, button.icon, captionsIcon.button)}">
                ${renderIcon('captions-off', { class: cn(icon, captionsIcon.off) })}
                ${renderIcon('captions-on', { class: cn(icon, captionsIcon.on) })}
              </media-captions-button>
              <media-menu id="captions-menu" side="top" align="center" class="${cn(popup.popover, menu.root, 'media-menu--captions')}">
                <media-captions-radio-group class="${menu.group}">
                  <template>
                    <media-menu-radio-item class="${menu.item}">
                      <span data-part="label"></span>
                      <media-menu-item-indicator force-mount class="${menu.indicator}">
                        ${renderIcon('check', { class: icon })}
                      </media-menu-item-indicator>
                    </media-menu-radio-item>
                  </template>
                </media-captions-radio-group>
              </media-menu>
              <media-tooltip id="captions-tooltip" side="top" class="${cn(popup.tooltip)}">
                <media-tooltip-label></media-tooltip-label>
                <media-tooltip-shortcut class="${popup.tooltipShortcut}"></media-tooltip-shortcut>
              </media-tooltip>
              <media-cast-button commandfor="cast-tooltip" class="${cn(button.base, button.subtle, button.icon, castIcon.button)}">
                ${renderIcon('cast-enter', { class: cn(icon, castIcon.enter) })}
                ${renderIcon('cast-exit', { class: cn(icon, castIcon.exit) })}
              </media-cast-button>
              <media-tooltip id="cast-tooltip" side="top" class="${cn(popup.tooltip)}">
                <media-tooltip-label></media-tooltip-label>
                <media-tooltip-shortcut class="${popup.tooltipShortcut}"></media-tooltip-shortcut>
              </media-tooltip>
              <media-airplay-button commandfor="airplay-tooltip" class="${cn(button.base, button.subtle, button.icon, airplayIcon.button)}">
                ${renderIcon('airplay-enter', { class: cn(icon, airplayIcon.enter) })}
                ${renderIcon('airplay-exit', { class: cn(icon, airplayIcon.exit) })}
              </media-airplay-button>
              <media-tooltip id="airplay-tooltip" side="top" class="${cn(popup.tooltip)}">
                <media-tooltip-label></media-tooltip-label>
                <media-tooltip-shortcut class="${popup.tooltipShortcut}"></media-tooltip-shortcut>
              </media-tooltip>
              <media-pip-button commandfor="pip-tooltip" class="${cn(button.base, button.subtle, button.icon, pipIcon.button)}">
                ${renderIcon('pip-enter', { class: cn(icon, pipIcon.off) })}
                ${renderIcon('pip-exit', { class: cn(icon, pipIcon.on) })}
              </media-pip-button>
              <media-tooltip id="pip-tooltip" side="top" class="${cn(popup.tooltip)}">
                <media-tooltip-label></media-tooltip-label>
                <media-tooltip-shortcut class="${popup.tooltipShortcut}"></media-tooltip-shortcut>
              </media-tooltip>
              <media-fullscreen-button commandfor="fullscreen-tooltip" class="${cn(button.base, button.subtle, button.icon, fullscreenIcon.button)}">
                ${renderIcon('fullscreen-enter', { class: cn(icon, fullscreenIcon.enter) })}
                ${renderIcon('fullscreen-exit', { class: cn(icon, fullscreenIcon.exit) })}
              </media-fullscreen-button>
              <media-tooltip id="fullscreen-tooltip" side="top" class="${cn(popup.tooltip)}">
                <media-tooltip-label></media-tooltip-label>
                <media-tooltip-shortcut class="${popup.tooltipShortcut}"></media-tooltip-shortcut>
              </media-tooltip>
          </div>
        </media-tooltip-group>
      </media-controls>

      <media-overlay class="${overlay}"></media-overlay>

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
