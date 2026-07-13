import { renderIcon } from '@videojs/icons/render';
import {
  button,
  buttonGroup,
  container,
  controls,
  error,
  icons,
  popover,
  slider,
  tooltip,
  volumePopover,
} from '@videojs/skins/default/tailwind/audio.tailwind';
import { createTemplate } from '@videojs/utils/dom';
import { cn } from '@videojs/utils/style';
import { safeDefine } from '../safe-define';
import { SkinElement } from '../skin-element';

// Register the live audio player, container, and all UI custom elements.
import './ui';

function getTemplateHTML() {
  return /*html*/ `
    <media-container class="${container}">
      <!-- @deprecated slot="media" is no longer required, use the default slot instead -->
      <slot name="media"></slot>
      <slot></slot>

      <media-error-dialog class="${error.root}">
        <div class="${error.dialog}">
          <div class="${error.content}">
            <media-alert-dialog-title class="${error.title}">Something went wrong.</media-alert-dialog-title>
            <media-alert-dialog-description class="${error.description}"></media-alert-dialog-description>
          </div>
          <div class="${error.actions}">
            <media-alert-dialog-close class="${cn(button.base, button.subtle)}">OK</media-alert-dialog-close>
          </div>
        </div>
      </media-error-dialog>

      <div class="${controls}">
        <media-tooltip-group>
          <div class="${buttonGroup}">
              <media-play-button commandfor="play-tooltip" class="${cn(button.base, button.subtle, button.icon, icons.playButtonState)}">
                ${renderIcon('restart', { class: cn(icons.root, icons.restartIcon) })}
                ${renderIcon('play', { class: cn(icons.root, icons.playIcon) })}
                ${renderIcon('pause', { class: cn(icons.root, icons.pauseIcon) })}
              </media-play-button>
              <media-tooltip id="play-tooltip" side="top" boundary="viewport" class="${tooltip.root}">
              <media-tooltip-label></media-tooltip-label>
              <media-tooltip-shortcut class="${tooltip.shortcut}"></media-tooltip-shortcut>
            </media-tooltip>

              <media-live-button class="${cn(button.base, button.subtle, button.live)}"></media-live-button>
          </div>

          <div class="grow" aria-hidden="true"></div>

          <div class="${buttonGroup}">
            <media-mute-button commandfor="live-audio-volume-popover" class="${cn(button.base, button.subtle, button.icon, icons.muteButtonState)}">
              ${renderIcon('volume-off', { class: cn(icons.root, icons.volumeOffIcon) })}
              ${renderIcon('volume-low', { class: cn(icons.root, icons.volumeLowIcon) })}
              ${renderIcon('volume-high', { class: cn(icons.root, icons.volumeHighIcon) })}
            </media-mute-button>

            <media-popover id="live-audio-volume-popover" open-on-hover delay="200" close-delay="100" side="top" boundary="viewport" class="${cn(popover.root, volumePopover.root)}">
              <media-volume-slider class="${slider.root}" orientation="vertical" thumb-alignment="edge">
                <media-slider-track class="${slider.track}">
                  <media-slider-fill class="${cn(slider.fillBase, slider.fill)}"></media-slider-fill>
                </media-slider-track>
                <media-slider-thumb class="${cn(slider.thumbBase, slider.thumbPersistent)}"></media-slider-thumb>
              </media-volume-slider>
            </media-popover>
          </div>
        </media-tooltip-group>
      </div>
    </media-container>
  `;
}

export class LiveAudioSkinTailwindElement extends SkinElement {
  static readonly tagName = 'live-audio-skin-tailwind';
  static template = createTemplate(getTemplateHTML());
}

safeDefine(LiveAudioSkinTailwindElement);

declare global {
  interface HTMLElementTagNameMap {
    [LiveAudioSkinTailwindElement.tagName]: LiveAudioSkinTailwindElement;
  }
}
