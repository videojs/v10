import { audioText, captionsText, qualityText, settingsText, speedText } from '@videojs/core/i18n/text/menu';
import { renderIcon } from '@videojs/icons/render/minimal';
import {
  badge,
  controlsBackdrop,
  bufferingIndicator,
  button,
  buttonGroupEnd,
  buttonGroupStart,
  container,
  controls,
  dialog,
  icon,
  iconFlipped,
  iconState,
  inputIndicator,
  menu,
  popup,
  poster,
  seekIndicator,
  slider,
  statusIndicator,
  thumbnail,
  time,
  volumeIndicator,
} from '@videojs/skins/minimal/tailwind/video.tailwind';
import { createTemplate } from '@videojs/utils/dom';
import { cn } from '@videojs/utils/style';

import { renderText } from '../../i18n/render-text';
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

      <media-buffering-indicator class="${bufferingIndicator}">
        ${renderIcon('spinner')}
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

              <media-mute-button id="video-mute-trigger" commandfor="video-volume-popover" class="${cn(button.base, button.subtle, button.icon, iconState.mute.button)}">
                ${renderIcon('volume-off', { class: cn(icon, iconState.mute.volumeOff) })}
                ${renderIcon('volume-low', { class: cn(icon, iconState.mute.volumeLow) })}
                ${renderIcon('volume-high', { class: cn(icon, iconState.mute.volumeHigh) })}
              </media-mute-button>
              <media-tooltip trigger="video-mute-trigger" delay="0" sticky side="top" class="${cn(popup.tooltip)}">
                <media-tooltip-label></media-tooltip-label>
                <media-tooltip-shortcut class="${popup.tooltipShortcut}"></media-tooltip-shortcut>
              </media-tooltip>
              <media-popover id="video-volume-popover" open-on-hover delay="200" close-delay="100" side="right" class="${popup.volume}">
                <media-volume-slider class="${slider.root}" orientation="horizontal" thumb-alignment="edge">
                  <media-slider-track class="${slider.track}">
                    <media-slider-fill class="${cn(slider.fill.base, slider.fill.fill)}"></media-slider-fill>
                  </media-slider-track>
                  <media-slider-thumb class="${cn(slider.thumb.base, slider.thumb.persistent)}"></media-slider-thumb>
                </media-volume-slider>
              </media-popover>
            </div>

            <div class="${time.controls}">
              <media-time-group class="${time.group}">
                <media-time toggle type="current" class="${time.current}"></media-time>
                <media-time-separator class="${time.separator}"></media-time-separator>
                <media-time type="duration" class="${time.duration}"></media-time>
              </media-time-group>

              <media-time-slider class="${slider.root}">
                <media-time-slider-chapters class="${slider.chapters}">
                  <template>
                    <div class="${slider.chapter.base}">
                      <media-slider-track class="${slider.chapter.track}">
                        <media-slider-buffer class="${cn(slider.fill.base, slider.fill.buffer)}"></media-slider-buffer>
                        <media-slider-fill class="${cn(slider.fill.base, slider.fill.fill)}"></media-slider-fill>
                      </media-slider-track>
                    </div>
                  </template>
                </media-time-slider-chapters>
                <media-slider-thumb class="${cn(slider.thumb.base, slider.thumb.interactive)}"></media-slider-thumb>

                <media-slider-preview class="${slider.preview}">
                  <div class="${cn(thumbnail.root, slider.thumbnail)}">
                    <media-slider-thumbnail class="${thumbnail.image}"></media-slider-thumbnail>
                    ${renderIcon('spinner', { class: cn(icon, thumbnail.spinner) })}
                  </div>
                  <div class="${slider.value}">
                    <media-time-slider-chapter-title class="${slider.chapterTitle}"></media-time-slider-chapter-title>
                    <media-slider-value type="pointer"></media-slider-value>
                  </div>
                </media-slider-preview>
              </media-time-slider>
            </div>

            <div class="${cn(buttonGroupEnd, menu.settingsGroup)}">
              <media-captions-button commandfor="captions-tooltip" class="${cn(button.base, button.subtle, button.icon, iconState.captions.button)}">
                ${renderIcon('captions-off', { class: cn(icon, iconState.captions.off) })}
                ${renderIcon('captions-on', { class: cn(icon, iconState.captions.on) })}
              </media-captions-button>
              <media-tooltip id="captions-tooltip" side="top" class="${cn(popup.tooltip)}">
                <media-tooltip-label></media-tooltip-label>
                <media-tooltip-shortcut class="${popup.tooltipShortcut}"></media-tooltip-shortcut>
              </media-tooltip>

              <button id="settings-trigger" commandfor="settings-menu" aria-labelledby="settings-label" class="${cn(button.base, button.subtle, button.icon, menu.settingsTrigger)}">
                ${renderIcon('gear', { class: cn(icon, menu.settingsIcon) })}
                ${renderText(settingsText, { id: 'settings-label', class: 'sr-only' })}
              </button>
              <media-menu id="settings-menu" side="top" align="center" class="${menu.settings}">
                <media-menu-content class="${menu.settingsContent}">
                  <media-menu-item commandfor="settings-quality-menu" class="${menu.item}">
                    ${renderIcon('switches', { class: cn(icon, menu.icon) })}
                    ${renderText(qualityText)}
                    <span class="${menu.hint}">
                      <bdi data-part="hint" dir="auto" class="${menu.hintLabel}"></bdi>
                      ${renderIcon('chevron', { class: cn(icon, menu.icon, menu.chevron) })}
                    </span>
                  </media-menu-item>
                  <media-menu-item commandfor="settings-audio-menu" class="${menu.item}">
                    ${renderIcon('speech', { class: icon })}
                    ${renderText(audioText)}
                    <span class="${menu.hint}">
                      <bdi data-part="hint" dir="auto" class="${menu.hintLabel}"></bdi>
                      ${renderIcon('chevron', { class: cn(icon, menu.chevron) })}
                    </span>
                  </media-menu-item>
                  <media-menu-item commandfor="settings-speed-menu" class="${menu.item}">
                    ${renderIcon('speed', { class: cn(icon, menu.icon) })}
                    ${renderText(speedText)}
                    <span class="${menu.hint}">
                      <bdi data-part="hint" dir="auto" class="${menu.hintLabel}"></bdi>
                      ${renderIcon('chevron', { class: cn(icon, menu.icon, menu.chevron) })}
                    </span>
                  </media-menu-item>
                  <media-menu-item commandfor="settings-captions-menu" class="${menu.item}">
                    ${renderIcon('captions-off', { class: cn(icon, menu.icon) })}
                    ${renderText(captionsText)}
                    <span class="${menu.hint}">
                      <bdi data-part="hint" dir="auto" class="${menu.hintLabel}"></bdi>
                      ${renderIcon('chevron', { class: cn(icon, menu.icon, menu.chevron) })}
                    </span>
                  </media-menu-item>
                </media-menu-content>
                <media-menu-content id="settings-quality-menu" class="${menu.submenuPanel}">
                  <media-menu-item class="${menu.back}">
                    ${renderIcon('chevron', { class: cn(icon, menu.icon, menu.chevron, iconFlipped, menu.backChevron) })}
                    ${renderText(qualityText)}
                  </media-menu-item>
                  <div class="${menu.separator}"></div>
                  <media-quality-radio-group class="${menu.group}">
                    <template>
                      <media-menu-radio-item class="${menu.item}">
                        <span>
                          <bdi data-part="label" dir="auto"></bdi>
                          <sup data-part="tier" class="${menu.tier}"></sup>
                        </span>
                        <span data-part="badge" class="${badge}"></span>
                        <media-menu-item-indicator force-mount class="${menu.indicator}">
                          ${renderIcon('check', { class: cn(icon, menu.icon) })}
                        </media-menu-item-indicator>
                      </media-menu-radio-item>
                    </template>
                  </media-quality-radio-group>
                </media-menu-content>
                <media-menu-content id="settings-audio-menu" class="${menu.submenuPanel}">
                  <media-menu-item class="${menu.back}">
                    ${renderIcon('chevron', { class: cn(icon, menu.icon, menu.chevron, iconFlipped, menu.backChevron) })}
                    ${renderText(audioText)}
                  </media-menu-item>
                  <div class="${menu.separator}"></div>
                  <media-audio-track-radio-group class="${menu.group}">
                    <template>
                      <media-menu-radio-item class="${menu.item}">
                        <bdi data-part="label" dir="auto"></bdi>
                        <media-menu-item-indicator force-mount class="${menu.indicator}">
                          ${renderIcon('check', { class: icon })}
                        </media-menu-item-indicator>
                      </media-menu-radio-item>
                    </template>
                  </media-audio-track-radio-group>
                </media-menu-content>
                <media-menu-content id="settings-speed-menu" class="${menu.submenuPanel}">
                  <media-menu-item class="${menu.back}">
                    ${renderIcon('chevron', { class: cn(icon, menu.icon, menu.chevron, iconFlipped, menu.backChevron) })}
                    ${renderText(speedText)}
                  </media-menu-item>
                  <div class="${menu.separator}"></div>
                  <media-playback-rate-radio-group class="${menu.group}">
                    <template>
                      <media-menu-radio-item class="${menu.item}">
                        <bdi data-part="label" dir="auto"></bdi>
                        <media-menu-item-indicator force-mount class="${menu.indicator}">
                          ${renderIcon('check', { class: cn(icon, menu.icon) })}
                        </media-menu-item-indicator>
                      </media-menu-radio-item>
                    </template>
                  </media-playback-rate-radio-group>
                </media-menu-content>
                <media-menu-content id="settings-captions-menu" class="${menu.submenuPanel}">
                  <media-menu-item class="${menu.back}">
                    ${renderIcon('chevron', { class: cn(icon, menu.icon, menu.chevron, iconFlipped, menu.backChevron) })}
                    ${renderText(captionsText)}
                  </media-menu-item>
                  <div class="${menu.separator}"></div>
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
              <media-tooltip id="settings-tooltip" trigger="settings-trigger" side="top" class="${cn(popup.tooltip)}">
                ${renderText(settingsText)}
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

      <!-- Input Indicators -->
      <media-status-announcer class="sr-only"></media-status-announcer>
      <div class="${inputIndicator}">
        <media-volume-indicator
          hidden
          class="${volumeIndicator.root}"
        >
          <media-volume-indicator-fill class="${volumeIndicator.content}">
            ${renderIcon('volume-high', { class: cn(volumeIndicator.icon.base, volumeIndicator.icon.high) })}
            ${renderIcon('volume-low', { class: cn(volumeIndicator.icon.base, volumeIndicator.icon.low) })}
            ${renderIcon('volume-off', { class: cn(volumeIndicator.icon.base, volumeIndicator.icon.off) })}
            <div aria-hidden="true" class="${volumeIndicator.progress}"></div>
            <media-volume-indicator-value class="${volumeIndicator.value}"></media-volume-indicator-value>
          </media-volume-indicator-fill>
        </media-volume-indicator>

        <media-status-indicator hidden actions="toggleSubtitles toggleFullscreen togglePictureInPicture" class="${statusIndicator.root}">
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

        <media-seek-indicator hidden class="${seekIndicator.root}">
          ${renderIcon('chevron', { class: seekIndicator.icon })}
          <media-seek-indicator-value class="${seekIndicator.value}"></media-seek-indicator-value>
        </media-seek-indicator>

        <media-status-indicator hidden actions="togglePaused" class="${statusIndicator.playback.root}">
          ${renderIcon('play', { class: cn(statusIndicator.playback.icon.base, statusIndicator.playback.icon.play) })}
          ${renderIcon('pause', { class: cn(statusIndicator.playback.icon.base, statusIndicator.playback.icon.pause) })}
        </media-status-indicator>
      </div>
    </media-container>
  `;
}

export class MinimalVideoSkinTailwindElement extends SkinElement {
  static readonly tagName = 'video-minimal-skin-tailwind';
  static template = createTemplate(getTemplateHTML());
}

declare global {
  interface HTMLElementTagNameMap {
    [MinimalVideoSkinTailwindElement.tagName]: MinimalVideoSkinTailwindElement;
  }
}
