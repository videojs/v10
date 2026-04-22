import { renderIcon } from '@videojs/icons/render/minimal';
import {
  bufferingIndicator,
  button,
  buttonGroupEnd,
  buttonGroupStart,
  controls,
  error,
  icon,
  iconState,
  overlay,
  popup,
  poster,
  preview,
  root,
  slider,
  time,
} from '@videojs/skins/minimal/tailwind/video.tailwind';
import { createTemplate } from '@videojs/utils/dom';
import { cn } from '@videojs/utils/style';
import { safeDefine } from '../safe-define';
import { SkinElement } from '../skin-element';

// Reuse the video preset's minimal UI element registrations.
import '../video/minimal-ui';

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
          </div>

          <div class="${time.controls}">
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
                ${renderIcon('spinner', { class: cn(icon, preview.spinner) })}
              </div>
            </media-time-slider>
          </div>

          <div class="${buttonGroupEnd}">
            <media-mute-button commandfor="live-video-volume-popover" class="${cn(button.base, button.subtle, button.icon, iconState.mute.button)}">
              ${renderIcon('volume-off', { class: cn(icon, iconState.mute.volumeOff) })}
              ${renderIcon('volume-low', { class: cn(icon, iconState.mute.volumeLow) })}
              ${renderIcon('volume-high', { class: cn(icon, iconState.mute.volumeHigh) })}
            </media-mute-button>

            <media-popover id="live-video-volume-popover" open-on-hover delay="200" close-delay="100" side="top" class="${cn(popup.volume)}">
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
    </media-container>
  `;
}

export class MinimalLiveVideoSkinTailwindElement extends SkinElement {
  static readonly tagName = 'live-video-minimal-skin-tailwind';
  static template = createTemplate(getTemplateHTML());
}

safeDefine(MinimalLiveVideoSkinTailwindElement);

declare global {
  interface HTMLElementTagNameMap {
    [MinimalLiveVideoSkinTailwindElement.tagName]: MinimalLiveVideoSkinTailwindElement;
  }
}
