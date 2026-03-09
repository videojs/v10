import { ReactiveElement } from '@videojs/element';
import { renderIcon } from '@videojs/icons/render/minimal';
import {
  bufferingIndicator,
  button,
  buttonGroup,
  controls,
  error,
  icon,
  iconContainer,
  iconFlipped,
  iconState,
  overlay,
  popup,
  root,
  seek,
  slider,
  time,
} from '@videojs/skins/minimal/tailwind/video.tailwind';
import { cn } from '@videojs/utils/style';
import { SkinMixin } from '../skin-mixin';

// Side-effect imports: register all custom elements used in the template.
import '../media/container';
import '../ui/buffering-indicator';
import '../ui/captions-button';
import '../ui/controls';
import '../ui/fullscreen-button';
import '../ui/mute-button';
import '../ui/pip-button';
import '../ui/play-button';
import '../ui/playback-rate-button';
import '../ui/popover';
import '../ui/seek-button';
import '../ui/time';
import '../ui/time-slider';
import '../ui/volume-slider';
import { playbackRate } from '@videojs/skins/default/tailwind/video.tailwind';

const SEEK_TIME = 10;

function getTemplateHTML() {
  return /*html*/ `
    <media-container class="${root(true)}">
      <slot name="media"></slot>

      <media-buffering-indicator class="${bufferingIndicator}">
        ${renderIcon('spinner')}
      </media-buffering-indicator>

      <!--<div class="${error.root}" role="alertdialog" aria-labelledby="media-error-title" aria-describedby="media-error-description">
        <div class="${error.dialog}">
          <div class="${error.content}">
            <p id="media-error-title" class="${error.title}">Something went wrong.</p>
            <p id="media-error-description">An error occurred while trying to play the video. Please try again.</p>
          </div>
          <div class="${error.actions}">
            <button type="button" class="${cn(button.base, button.default)}">OK</button>
          </div>
        </div>
      </div>-->

      <media-controls data-controls="" class="${controls}">
        <span class="${buttonGroup}">
          <media-play-button class="${cn(button.base, button.icon, iconState.play.button)}">
            ${renderIcon('restart', { class: cn(icon, iconState.play.restart) })}
            ${renderIcon('play', { class: cn(icon, iconState.play.play) })}
            ${renderIcon('pause', { class: cn(icon, iconState.play.pause) })}
          </media-play-button>

          <media-seek-button seconds="${-SEEK_TIME}" class="${cn(button.base, button.icon, seek.button)}">
            <span class="${iconContainer}">
              ${renderIcon('seek', { class: cn(icon, iconFlipped) })}
              <span class="${cn(seek.label, seek.labelBackward)}">${SEEK_TIME}</span>
            </span>
          </media-seek-button>

          <media-seek-button seconds="${SEEK_TIME}" class="${cn(button.base, button.icon, seek.button)}">
            <span class="${iconContainer}">
              ${renderIcon('seek', { class: icon })}
              <span class="${cn(seek.label, seek.labelForward)}">${SEEK_TIME}</span>
            </span>
          </media-seek-button>
        </span>

        <span class="${time.controls}">
          <media-time-group class="${time.group}">
            <media-time type="current" class="${time.current}"></media-time>
            <media-time-separator class="${time.separator}"></media-time-separator>
            <media-time type="duration" class="${time.duration}"></media-time>
          </media-time-group>

          <media-time-slider class="${slider.root}">
            <media-slider-track class="${slider.track}">
              <media-slider-fill class="${cn(slider.fill.base, slider.fill.fill)}"></media-slider-fill>
              <media-slider-buffer class="${cn(slider.fill.base, slider.fill.buffer)}"></media-slider-buffer>
            </media-slider-track>
            <media-slider-thumb class="${cn(slider.thumb.base, slider.thumb.interactive)}"></media-slider-thumb>
          </media-time-slider>
        </span>

        <span class="${buttonGroup}">
          <media-playback-rate-button class="${cn(button.base, button.icon, playbackRate.button)}">
          </media-playback-rate-button>

          <media-mute-button commandfor="video-volume-popover" class="${cn(button.base, button.icon, iconState.mute.button)}">
            ${renderIcon('volume-off', { class: cn(icon, iconState.mute.volumeOff) })}
            ${renderIcon('volume-low', { class: cn(icon, iconState.mute.volumeLow) })}
            ${renderIcon('volume-high', { class: cn(icon, iconState.mute.volumeHigh) })}
          </media-mute-button>

          <media-popover id="video-volume-popover" open-on-hover delay="200" close-delay="100" side="top" class="${cn(popup.base, popup.volume)}">
            <media-volume-slider class="${slider.root}" orientation="vertical" thumb-alignment="edge">
              <media-slider-track class="${slider.track}">
                <media-slider-fill class="${cn(slider.fill.base, slider.fill.fill)}"></media-slider-fill>
              </media-slider-track>
              <media-slider-thumb class="${slider.thumb.base}"></media-slider-thumb>
            </media-volume-slider>
          </media-popover>

          <media-captions-button class="${cn(button.base, button.icon, iconState.captions.button)}">
            ${renderIcon('captions-off', { class: cn(icon, iconState.captions.off) })}
            ${renderIcon('captions-on', { class: cn(icon, iconState.captions.on) })}
          </media-captions-button>

          <media-pip-button class="${cn(button.base, button.icon)}">
            ${renderIcon('pip', { class: icon })}
          </media-pip-button>

          <media-fullscreen-button class="${cn(button.base, button.icon, iconState.fullscreen.button)}">
            ${renderIcon('fullscreen-enter', { class: cn(icon, iconState.fullscreen.enter) })}
            ${renderIcon('fullscreen-exit', { class: cn(icon, iconState.fullscreen.exit) })}
          </media-fullscreen-button>
        </span>
      </media-controls>

      <div class="${overlay}"></div>
    </media-container>
  `;
}

export class MinimalVideoSkinTailwindElement extends SkinMixin(ReactiveElement) {
  static readonly tagName = 'video-minimal-skin-tailwind';
  static getTemplateHTML = getTemplateHTML;
}

customElements.define(MinimalVideoSkinTailwindElement.tagName, MinimalVideoSkinTailwindElement);

declare global {
  interface HTMLElementTagNameMap {
    [MinimalVideoSkinTailwindElement.tagName]: MinimalVideoSkinTailwindElement;
  }
}
