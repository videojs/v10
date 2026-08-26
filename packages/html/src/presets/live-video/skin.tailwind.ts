import { renderIcon } from '@videojs/icons/render';
import {
  controlsBackdrop,
  bufferingIndicator,
  button,
  buttonGroupEnd,
  buttonGroupStart,
  container,
  controls,
  dialog,
  icon,
  iconState,
  inputIndicator,
  menu,
  popup,
  poster,
  primaryControls,
  slider,
  spacer,
  statusIndicator,
  volumeIndicator,
} from '@videojs/skins/default/tailwind/video.tailwind';
import { createTemplate } from '@videojs/utils/dom';
import { cn } from '@videojs/utils/style';

import { SkinElement } from '../skin';

function getTemplateHTML() {
  return /*html*/ `
    <media-container class="${container(true)}">
      <!-- @deprecated slot="media" is no longer required, use the default slot instead -->
      <slot name="media"></slot>
      <slot></slot>

      <media-poster class="${poster(true)}">
        <slot name="poster">
          <img alt="" decoding="async">
        </slot>
      </media-poster>

      <media-buffering-indicator class="${bufferingIndicator.root}">
        ${renderIcon('spinner', { class: icon })}
      </media-buffering-indicator>

      <media-error-dialog class="${dialog.root}">
        <media-dialog-backdrop class="${dialog.backdrop}"></media-dialog-backdrop>
        <media-dialog-popup class="${dialog.popup}">
          <div class="${dialog.content}">
            <media-dialog-title class="${dialog.title}"></media-dialog-title>
            <media-dialog-description class="${dialog.description}"></media-dialog-description>
          </div>
          <div class="${dialog.actions}">
            <media-dialog-close class="${cn(button.base, button.primary)}"></media-dialog-close>
          </div>
        </media-dialog-popup>
      </media-error-dialog>

      <media-controls>
        <media-controls-backdrop class="${controlsBackdrop}"></media-controls-backdrop>
        <media-controls-content class="${controls}">
          <media-tooltip-group>
            <media-controls-group class="${primaryControls}">
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

              <div class="${spacer}" aria-hidden="true"></div>

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
                <media-captions-button menu-for="captions-menu" commandfor="captions-tooltip" class="${cn(button.base, button.subtle, button.icon, button.captions, iconState.captions.button)}">
                  ${renderIcon('captions-off', { class: cn(icon, iconState.captions.off) })}
                  ${renderIcon('captions-on', { class: cn(icon, iconState.captions.on) })}
                </media-captions-button>
                <media-menu id="captions-menu" side="top" align="center" class="${cn(popup.popover, menu.root)}">
                  <media-menu-content class="${menu.content}">
                    <media-captions-radio-group class="${menu.group}">
                      <template>
                        <media-menu-radio-item class="${menu.item}">
                          <bdi data-part="label" dir="auto"></bdi>
                          <media-menu-item-indicator force-mount class="${menu.indicator}">
                            ${renderIcon('check', { class: cn(icon, menu.icon) })}
                          </media-menu-item-indicator>
                        </media-menu-radio-item>
                      </template>
                    </media-captions-radio-group>
                  </media-menu-content>
                </media-menu>
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

                <media-airplay-button commandfor="airplay-tooltip" class="${cn(button.base, button.subtle, button.icon, iconState.airplay.button)}">
                  ${renderIcon('airplay-enter', { class: cn(icon, iconState.airplay.enter) })}
                  ${renderIcon('airplay-exit', { class: cn(icon, iconState.airplay.exit) })}
                </media-airplay-button>
                <media-tooltip id="airplay-tooltip" side="top" class="${cn(popup.tooltip)}">
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
            </media-controls-group>
          </media-tooltip-group>
        </media-controls-content>
      </media-controls>

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

      <!-- Input Indicators -->
      <media-status-announcer class="sr-only"></media-status-announcer>
      <div class="${inputIndicator}">
        <media-volume-indicator hidden class="${volumeIndicator.root}">
          <media-volume-indicator-fill class="${volumeIndicator.content}">
            ${renderIcon('volume-high', { class: cn(volumeIndicator.icon.base, volumeIndicator.icon.high) })}
            ${renderIcon('volume-low', { class: cn(volumeIndicator.icon.base, volumeIndicator.icon.low) })}
            ${renderIcon('volume-off', { class: cn(volumeIndicator.icon.base, volumeIndicator.icon.off) })}
            <media-volume-indicator-value class="${volumeIndicator.value}"></media-volume-indicator-value>
          </media-volume-indicator-fill>
        </media-volume-indicator>
        <media-status-indicator
          hidden
          actions="toggleSubtitles toggleFullscreen togglePictureInPicture"
          class="${statusIndicator.root}"
        >
          <div class="${statusIndicator.content}">
            ${renderIcon('captions-on', { class: cn(statusIndicator.icon.base, statusIndicator.icon.captionsOn) })}
            ${renderIcon('captions-off', { class: cn(statusIndicator.icon.base, statusIndicator.icon.captionsOff) })}
            ${renderIcon('fullscreen-enter', { class: cn(statusIndicator.icon.base, statusIndicator.icon.fullscreenEnter) })}
            ${renderIcon('fullscreen-exit', { class: cn(statusIndicator.icon.base, statusIndicator.icon.fullscreenExit) })}
            ${renderIcon('pip-enter', { class: cn(statusIndicator.icon.base, statusIndicator.icon.pipEnter) })}
            ${renderIcon('pip-exit', { class: cn(statusIndicator.icon.base, statusIndicator.icon.pipExit) })}
            <media-status-indicator-value class="${statusIndicator.value}"></media-status-indicator-value>
          </div>
        </media-status-indicator>
        <media-status-indicator hidden actions="togglePaused" class="${statusIndicator.playback.root}">
          ${renderIcon('play', { class: cn(statusIndicator.playback.icon.base, statusIndicator.playback.icon.play) })}
          ${renderIcon('pause', { class: cn(statusIndicator.playback.icon.base, statusIndicator.playback.icon.pause) })}
        </media-status-indicator>
      </div>
    </media-container>
  `;
}

export class LiveVideoSkinTailwindElement extends SkinElement {
  static readonly tagName = 'live-video-skin-tailwind';
  static template = createTemplate(getTemplateHTML());
}

declare global {
  interface HTMLElementTagNameMap {
    [LiveVideoSkinTailwindElement.tagName]: LiveVideoSkinTailwindElement;
  }
}
