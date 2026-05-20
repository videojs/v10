import { renderIcon } from '@videojs/icons/render';
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
} from '@videojs/skins/default/tailwind/audio.tailwind';
import { createTemplate } from '@videojs/utils/dom';
import { cn } from '@videojs/utils/style';
import { safeDefine } from '../safe-define';
import { SkinElement } from '../skin-element';

// Register the live audio player, container, and all UI custom elements.
import './ui';

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
              <media-tooltip id="play-tooltip" side="top" boundary="viewport" class="${cn(popup.tooltip)}"></media-tooltip>

              <media-live-button class="${cn(button.base, button.subtle, button.live)}"></media-live-button>
          </div>

          <div class="grow" aria-hidden="true"></div>

          <div class="${buttonGroup}">
            <media-mute-button commandfor="live-audio-volume-popover" class="${cn(button.base, button.subtle, button.icon, iconState.mute.button)}">
              ${renderIcon('volume-off', { class: cn(icon, iconState.mute.volumeOff) })}
              ${renderIcon('volume-low', { class: cn(icon, iconState.mute.volumeLow) })}
              ${renderIcon('volume-high', { class: cn(icon, iconState.mute.volumeHigh) })}
            </media-mute-button>

            <media-popover id="live-audio-volume-popover" open-on-hover delay="200" close-delay="100" side="top" boundary="viewport" class="${cn(popup.popover, popup.volume)}">
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

/**
 * Tailwind-styled variant of `<live-audio-skin>` — default live audio player skin with a Live button.
 *
 * Same template as `<live-audio-skin>` but with Tailwind utility classes instead of a bundled
 * stylesheet. To customize, build from primitive elements like `<media-controls>`,
 * `<media-play-button>`, and `<media-live-button>`.
 *
 * @see https://videojs.org/docs/framework/html/concepts/skins
 */
export class LiveAudioSkinTailwindElement extends SkinElement {
  /** Custom element tag name. */
  static readonly tagName = 'live-audio-skin-tailwind';
  /** Shadow DOM template cloned into each instance. */
  static template = createTemplate(getTemplateHTML());
}

safeDefine(LiveAudioSkinTailwindElement);

declare global {
  interface HTMLElementTagNameMap {
    [LiveAudioSkinTailwindElement.tagName]: LiveAudioSkinTailwindElement;
  }
}
