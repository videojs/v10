import { renderIcon } from '@videojs/icons/render';
import {
  button,
  buttonGroup,
  controls,
  error,
  icon,
  iconContainer,
  iconFlipped,
  iconState,
  menu,
  playButton,
  playbackRate,
  popup,
  root,
  seek,
  slider,
  time,
} from '@videojs/skins/default/tailwind/audio.tailwind';
import { createTemplate } from '@videojs/utils/dom';
import { cn } from '@videojs/utils/style';
import { safeDefine } from '../safe-define';
import { SkinElement } from '../skin-element';

// Register the player, container, and all UI custom elements.
import './ui';

const SEEK_TIME = 10;

function getTemplateHTML() {
  return /*html*/ `
    <media-container class="${root}">
      <!-- @deprecated slot="media" is no longer required, use the default slot instead -->
      <slot name="media"></slot>
      <slot></slot>

      <media-error-dialog class="${error.root}">
        <div class="${error.dialog}">
          <div class="${error.content}">
            <media-alert-dialog-title class="${error.title}"></media-alert-dialog-title>
            <media-alert-dialog-description class="${error.description}"></media-alert-dialog-description>
          </div>
          <div class="${error.actions}">
            <media-alert-dialog-close class="${cn(button.base, button.subtle)}"></media-alert-dialog-close>
          </div>
        </div>
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

          <div class="${time.group}">
            <media-time type="current" class="${time.current}"></media-time>
            <media-time-slider class="${slider.root}">
              <media-slider-track class="${slider.track}">
                <media-slider-fill class="${cn(slider.fill.base, slider.fill.fill)}"></media-slider-fill>
                <media-slider-buffer class="${cn(slider.fill.base, slider.fill.buffer)}"></media-slider-buffer>
              </media-slider-track>
              <media-slider-thumb class="${cn(slider.thumb.base, slider.thumb.interactive)}"></media-slider-thumb>
              <media-slider-preview class="${slider.preview}">
                <media-slider-value type="pointer" class="${slider.value}"></media-slider-value>
              </media-slider-preview>
            </media-time-slider>
            <media-time toggle type="remaining" class="${time.duration}"></media-time>
          </div>

          <div class="${buttonGroup}">
            <media-playback-rate-button commandfor="playback-rate-menu" class="${cn(button.base, button.subtle, button.icon, playbackRate.button)}"></media-playback-rate-button>
            <media-menu id="playback-rate-menu" side="top" align="center" boundary="viewport" class="${cn(popup.popover, menu.root)}">
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
            </media-menu>

            <media-mute-button commandfor="audio-volume-popover" class="${cn(button.base, button.subtle, button.icon, iconState.mute.button)}">
              ${renderIcon('volume-off', { class: cn(icon, iconState.mute.volumeOff) })}
              ${renderIcon('volume-low', { class: cn(icon, iconState.mute.volumeLow) })}
              ${renderIcon('volume-high', { class: cn(icon, iconState.mute.volumeHigh) })}
            </media-mute-button>

            <media-popover id="audio-volume-popover" open-on-hover delay="200" close-delay="100" side="top" boundary="viewport" class="${cn(popup.popover, popup.volume)}">
              <media-volume-slider class="${slider.root}" orientation="vertical" thumb-alignment="edge">
                <media-slider-track class="${slider.track}">
                  <media-slider-fill class="${cn(slider.fill.base, slider.fill.fill)}"></media-slider-fill>
                </media-slider-track>
                <media-slider-thumb class="${cn(slider.thumb.base, slider.thumb.persistent)}"></media-slider-thumb>
              </media-volume-slider>
            </media-popover>
          </div>
        </media-tooltip-group>
      </div>
    </media-container>
  `;
}

export class AudioSkinTailwindElement extends SkinElement {
  static readonly tagName = 'audio-skin-tailwind';
  static template = createTemplate(getTemplateHTML());
}

safeDefine(AudioSkinTailwindElement);

declare global {
  interface HTMLElementTagNameMap {
    [AudioSkinTailwindElement.tagName]: AudioSkinTailwindElement;
  }
}
