import { renderIcon } from '@videojs/icons/render/minimal';
import {
  button,
  buttonGroup,
  container,
  controls,
  dialog,
  icon,
  iconContainer,
  iconFlipped,
  iconState,
  menu,
  playButton,
  playbackRate,
  popup,
  seek,
  slider,
  time,
} from '@videojs/skins/minimal/tailwind/audio.tailwind';
import { createTemplate } from '@videojs/utils/dom';
import { cn } from '@videojs/utils/style';

import { SkinElement } from '../skin';

const SEEK_TIME = 10;

function getTemplateHTML() {
  return /*html*/ `
    <media-container class="${container}">
      <!-- @deprecated slot="media" is no longer required, use the default slot instead -->
      <slot name="media"></slot>
      <slot></slot>

      <media-error-dialog>
        <media-dialog-popup class="${dialog.root}">
        <div class="${dialog.dialog}">
          <div class="${dialog.content}">
            <media-dialog-title class="${dialog.title}"></media-dialog-title>
            <media-dialog-description class="${dialog.description}"></media-dialog-description>
          </div>
          <div class="${dialog.actions}">
            <media-dialog-close class="${cn(button.base, button.subtle)}"></media-dialog-close>
          </div>
        </div>
        </media-dialog-popup>
      </media-error-dialog>

      <div class="${controls}">
        <media-tooltip-group>
          <div class="${buttonGroup}">
            <span class="${playButton.wrapper}">
              <media-buffering-indicator class="${playButton.bufferingRoot}">
                ${renderIcon('spinner', { class: icon })}
              </media-buffering-indicator>
              <media-play-button commandfor="play-tooltip" class="${cn(button.base, button.subtle, button.icon, iconState.play.button, playButton.control)}">
                ${renderIcon('restart', { class: cn(icon, iconState.play.restart) })}
                ${renderIcon('play', { class: cn(icon, iconState.play.play) })}
                ${renderIcon('pause', { class: cn(icon, iconState.play.pause) })}
              </media-play-button>
              <media-tooltip id="play-tooltip" side="top" boundary="viewport" class="${cn(popup.tooltip)}">
                <media-tooltip-label></media-tooltip-label>
                <media-tooltip-shortcut class="${popup.tooltipShortcut}"></media-tooltip-shortcut>
              </media-tooltip>
            </span>

            <media-seek-button commandfor="seek-backward-tooltip" seconds="${-SEEK_TIME}" class="${cn(button.base, button.subtle, button.icon)}">
              <span class="${iconContainer}">
                ${renderIcon('seek', { class: cn(icon, iconFlipped) })}
                <span class="${cn(seek.label, seek.labelBackward)}">${SEEK_TIME}</span>
              </span>
            </media-seek-button>
            <media-tooltip id="seek-backward-tooltip" side="top" boundary="viewport" class="${cn(popup.tooltip)}">
              <media-tooltip-label></media-tooltip-label>
              <media-tooltip-shortcut class="${popup.tooltipShortcut}"></media-tooltip-shortcut>
            </media-tooltip>

            <media-seek-button commandfor="seek-forward-tooltip" seconds="${SEEK_TIME}" class="${cn(button.base, button.subtle, button.icon)}">
              <span class="${iconContainer}">
                ${renderIcon('seek', { class: icon })}
                <span class="${cn(seek.label, seek.labelForward)}">${SEEK_TIME}</span>
              </span>
            </media-seek-button>
            <media-tooltip id="seek-forward-tooltip" side="top" boundary="viewport" class="${cn(popup.tooltip)}">
              <media-tooltip-label></media-tooltip-label>
              <media-tooltip-shortcut class="${popup.tooltipShortcut}"></media-tooltip-shortcut>
            </media-tooltip>
          </div>

          <div class="${time.controls}">
            <media-time-group class="${time.group}">
              <media-time toggle type="current" class="${time.current}"></media-time>
              <media-time-separator class="${time.separator}"></media-time-separator>
              <media-time type="duration" class="${time.duration}"></media-time>
            </media-time-group>

            <media-time-slider class="${slider.root}">
              <media-slider-track class="${slider.track}">
                <media-slider-buffer class="${cn(slider.fill.base, slider.fill.buffer)}"></media-slider-buffer>
                <media-slider-fill class="${cn(slider.fill.base, slider.fill.fill)}"></media-slider-fill>
              </media-slider-track>
              <media-slider-thumb class="${cn(slider.thumb.base, slider.thumb.interactive)}"></media-slider-thumb>
              <media-slider-preview class="${slider.preview}">
                <media-slider-value type="pointer" class="${slider.value}"></media-slider-value>
              </media-slider-preview>
            </media-time-slider>
          </div>

          <div class="${buttonGroup}">
            <media-mute-button id="audio-mute-trigger" commandfor="audio-volume-popover" class="${cn(button.base, button.subtle, button.icon, iconState.mute.button)}">
              ${renderIcon('volume-off', { class: cn(icon, iconState.mute.volumeOff) })}
              ${renderIcon('volume-low', { class: cn(icon, iconState.mute.volumeLow) })}
              ${renderIcon('volume-high', { class: cn(icon, iconState.mute.volumeHigh) })}
            </media-mute-button>
            <media-tooltip trigger="audio-mute-trigger" delay="0" sticky side="top" class="${cn(popup.tooltip)}">
              <media-tooltip-label></media-tooltip-label>
              <media-tooltip-shortcut class="${popup.tooltipShortcut}"></media-tooltip-shortcut>
            </media-tooltip>

            <media-popover id="audio-volume-popover" open-on-hover delay="200" close-delay="100" side="left" boundary="viewport" class="${cn(popup.volume)}">
              <media-volume-slider class="${slider.root}" orientation="horizontal" thumb-alignment="edge">
                <media-slider-track class="${slider.track}">
                  <media-slider-fill class="${cn(slider.fill.base, slider.fill.fill)}"></media-slider-fill>
                </media-slider-track>
                <media-slider-thumb class="${cn(slider.thumb.base, slider.thumb.persistent)}"></media-slider-thumb>
              </media-volume-slider>
            </media-popover>

            <media-playback-rate-button id="playback-rate-trigger" commandfor="playback-rate-menu" class="${cn(button.base, button.subtle, button.icon, playbackRate.button)}">
            </media-playback-rate-button>
            <media-menu id="playback-rate-menu" side="top" align="center" boundary="viewport" class="${cn(popup.popover, menu.root)}">
              <media-menu-content class="${menu.content}">
                <media-playback-rate-radio-group class="${menu.group}">
                  <template>
                    <media-menu-radio-item class="${menu.item}">
                      <span data-part="label"></span>
                      <media-menu-item-indicator force-mount class="${menu.indicator}">
                        ${renderIcon('check', { class: cn(icon, menu.icon) })}
                      </media-menu-item-indicator>
                    </media-menu-radio-item>
                  </template>
                </media-playback-rate-radio-group>
              </media-menu-content>
            </media-menu>
            <media-tooltip trigger="playback-rate-trigger" side="top" boundary="viewport" class="${popup.tooltip}">
              <media-tooltip-label></media-tooltip-label>
              <media-tooltip-shortcut class="${popup.tooltipShortcut}"></media-tooltip-shortcut>
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

export class MinimalAudioSkinTailwindElement extends SkinElement {
  static readonly tagName = 'audio-minimal-skin-tailwind';
  static template = createTemplate(getTemplateHTML());
}

declare global {
  interface HTMLElementTagNameMap {
    [MinimalAudioSkinTailwindElement.tagName]: MinimalAudioSkinTailwindElement;
  }
}
