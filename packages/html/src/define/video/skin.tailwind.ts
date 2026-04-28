import { renderIcon } from '@videojs/icons/render';
import {
  bufferingIndicator,
  button,
  buttonGroupEnd,
  buttonGroupStart,
  controls,
  error,
  icon,
  iconContainer,
  iconFlipped,
  iconState,
  overlay,
  playbackRate,
  popup,
  poster,
  preview,
  root,
  seek,
  slider,
  time,
} from '@videojs/skins/default/tailwind/video.tailwind';
import { createTemplate } from '@videojs/utils/dom';
import { cn } from '@videojs/utils/style';
import { safeDefine } from '../safe-define';
import { SkinElement } from '../skin-element';

// Register the player, container, and all UI custom elements.
import './ui';

const SEEK_TIME = 10;

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
              <media-tooltip id="play-tooltip" side="top" class="${cn(popup.tooltip)}"></media-tooltip>

            <media-seek-button commandfor="seek-backward-tooltip" seconds="${-SEEK_TIME}" class="${cn(button.base, button.subtle, button.icon)}">
              <span class="${iconContainer}">
                ${renderIcon('seek', { class: cn(icon, iconFlipped) })}
                <span class="${cn(seek.label, seek.labelBackward)}">${SEEK_TIME}</span>
              </span>
            </media-seek-button>
            <media-tooltip id="seek-backward-tooltip" side="top" class="${cn(popup.tooltip)}"></media-tooltip>

            <media-seek-button commandfor="seek-forward-tooltip" seconds="${SEEK_TIME}" class="${cn(button.base, button.subtle, button.icon)}">
              <span class="${iconContainer}">
                ${renderIcon('seek', { class: icon })}
                <span class="${cn(seek.label, seek.labelForward)}">${SEEK_TIME}</span>
              </span>
            </media-seek-button>
            <media-tooltip id="seek-forward-tooltip" side="top" class="${cn(popup.tooltip)}"></media-tooltip>
          </div>

          <div class="${time.group}">
            <media-time type="current" class="${time.current}"></media-time>
            <media-time-slider class="${slider.root}">
              <media-slider-track class="${slider.track}">
                <media-slider-fill class="${cn(slider.fill.base, slider.fill.fill)}"></media-slider-fill>
                <media-slider-buffer class="${cn(slider.fill.base, slider.fill.buffer)}"></media-slider-buffer>
              </media-slider-track>
              <media-slider-thumb class="${cn(slider.thumb.base, slider.thumb.interactive)}"></media-slider-thumb>

              <div class="${preview.root}">
                <media-slider-thumbnail class="${preview.thumbnail}"></media-slider-thumbnail>
                <media-slider-value type="pointer" class="${preview.time}"></media-slider-value>
                ${renderIcon('spinner', { class: cn(icon, preview.spinner) })}
              </div>
            </media-time-slider>
            <media-time type="duration" class="${time.duration}"></media-time>
          </div>

          <div class="${buttonGroupEnd}">
            <media-playback-rate-button commandfor="playback-rate-tooltip"  class="${cn(button.base, button.subtle, button.icon, playbackRate.button)}"></media-playback-rate-button>
            <media-tooltip id="playback-rate-tooltip" side="top" class="${cn(popup.tooltip)}"></media-tooltip>

            <media-mute-button commandfor="video-volume-popover" class="${cn(button.base, button.subtle, button.icon, iconState.mute.button)}">
              ${renderIcon('volume-off', { class: cn(icon, iconState.mute.volumeOff) })}
              ${renderIcon('volume-low', { class: cn(icon, iconState.mute.volumeLow) })}
              ${renderIcon('volume-high', { class: cn(icon, iconState.mute.volumeHigh) })}
            </media-mute-button>

            <media-popover id="video-volume-popover" open-on-hover delay="200" close-delay="100" side="top" class="${cn(popup.popover, popup.volume)}">
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

export class VideoSkinTailwindElement extends SkinElement {
  static readonly tagName = 'video-skin-tailwind';
  static template = createTemplate(getTemplateHTML());
}

safeDefine(VideoSkinTailwindElement);

declare global {
  interface HTMLElementTagNameMap {
    [VideoSkinTailwindElement.tagName]: VideoSkinTailwindElement;
  }
}
