import { renderIcon } from '@videojs/icons/render/minimal';
import {
  button,
  buttonGroup,
  controls,
  error,
  icon,
  iconState,
  popup,
  root,
  slider,
} from '@videojs/skins/minimal/tailwind/audio.tailwind';
import { createTemplate } from '@videojs/utils/dom';
import { cn } from '@videojs/utils/style';
import { safeDefine } from '../safe-define';
import { SkinElement } from '../skin-element';

// Reuse the audio preset's minimal UI element registrations.
import '../audio/minimal-ui';

function getTemplateHTML() {
  return /*html*/ `
    <media-container class="${root}">
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
              <media-play-button commandfor="play-tooltip" class="${cn(button.base, button.subtle, button.icon, iconState.play.button)}">
                ${renderIcon('restart', { class: cn(icon, iconState.play.restart) })}
                ${renderIcon('play', { class: cn(icon, iconState.play.play) })}
                ${renderIcon('pause', { class: cn(icon, iconState.play.pause) })}
              </media-play-button>
              <media-tooltip id="play-tooltip" side="top" class="${cn(popup.tooltip)}"></media-tooltip>
          </div>

          <div class="grow" aria-hidden="true"></div>

          <div class="${buttonGroup}">
            <media-mute-button commandfor="live-audio-volume-popover" class="${cn(button.base, button.subtle, button.icon, iconState.mute.button)}">
              ${renderIcon('volume-off', { class: cn(icon, iconState.mute.volumeOff) })}
              ${renderIcon('volume-low', { class: cn(icon, iconState.mute.volumeLow) })}
              ${renderIcon('volume-high', { class: cn(icon, iconState.mute.volumeHigh) })}
            </media-mute-button>

            <media-popover id="live-audio-volume-popover" open-on-hover delay="200" close-delay="100" side="left" class="${cn(popup.volume)}">
              <media-volume-slider class="${slider.root}" orientation="horizontal" thumb-alignment="edge">
                <media-slider-track class="${slider.track}">
                  <media-slider-fill class="${cn(slider.fill.base, slider.fill.fill)}"></media-slider-fill>
                </media-slider-track>
                <media-slider-thumb class="${slider.thumb.base}"></media-slider-thumb>
              </media-volume-slider>
            </media-popover>
          </div>
        </media-tooltip-group>
      </div>
    </media-container>
  `;
}

export class MinimalLiveAudioSkinTailwindElement extends SkinElement {
  static readonly tagName = 'live-audio-minimal-skin-tailwind';
  static template = createTemplate(getTemplateHTML());
}

safeDefine(MinimalLiveAudioSkinTailwindElement);

declare global {
  interface HTMLElementTagNameMap {
    [MinimalLiveAudioSkinTailwindElement.tagName]: MinimalLiveAudioSkinTailwindElement;
  }
}
