import { ReactiveElement } from '@videojs/element';
import { renderIcon } from '@videojs/icons/render';
import {
  button,
  controls,
  icon,
  iconContainer,
  iconFlipped,
  iconState,
  playbackRate,
  popup,
  root,
  seek,
  slider,
  time,
} from '@videojs/skins/default/tailwind/audio.tailwind';
import { cn } from '@videojs/utils/style';
import { SkinMixin } from '../skin-mixin';

// Side-effect imports: register all custom elements used in the template.
import '../media/container';
import '../ui/mute-button';
import '../ui/play-button';
import '../ui/playback-rate-button';
import '../ui/popover';
import '../ui/seek-button';
import '../ui/time';
import '../ui/time-slider';
import '../ui/volume-slider';

const SEEK_TIME = 10;

function getTemplateHTML() {
  return /*html*/ `
    <media-container class="${root}">
      <slot name="media"></slot>

      <div class="${controls}">
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

        <media-time-group class="${time.group}">
          <media-time type="current" class="${time.current}"></media-time>
          <media-time-slider class="${slider.root}">
            <media-slider-track class="${slider.track}">
              <media-slider-fill class="${cn(slider.fill.base, slider.fill.fill)}"></media-slider-fill>
              <media-slider-buffer class="${cn(slider.fill.base, slider.fill.buffer)}"></media-slider-buffer>
            </media-slider-track>
            <media-slider-thumb class="${cn(slider.thumb.base, slider.thumb.interactive)}"></media-slider-thumb>
          </media-time-slider>
          <media-time type="duration" class="${time.duration}"></media-time>
        </media-time-group>

        <media-playback-rate-button class="${cn(button.base, button.icon, playbackRate.button)}">
        </media-playback-rate-button>

        <media-mute-button commandfor="audio-volume-popover" class="${cn(button.base, button.icon, iconState.mute.button)}">
          ${renderIcon('volume-off', { class: cn(icon, iconState.mute.volumeOff) })}
          ${renderIcon('volume-low', { class: cn(icon, iconState.mute.volumeLow) })}
          ${renderIcon('volume-high', { class: cn(icon, iconState.mute.volumeHigh) })}
        </media-mute-button>

        <media-popover id="audio-volume-popover" open-on-hover delay="200" close-delay="100" side="top" class="${cn(popup.base, popup.volume)}">
          <media-volume-slider class="${slider.root}" orientation="vertical" thumb-alignment="edge">
            <media-slider-track class="${slider.track}">
              <media-slider-fill class="${cn(slider.fill.base, slider.fill.fill)}"></media-slider-fill>
            </media-slider-track>
            <media-slider-thumb class="${cn(slider.thumb.base, slider.thumb.persistent)}"></media-slider-thumb>
          </media-volume-slider>
        </media-popover>
      </div>
    </media-container>
  `;
}

export class AudioSkinTailwindElement extends SkinMixin(ReactiveElement) {
  static readonly tagName = 'audio-skin-tailwind';
  static getTemplateHTML = getTemplateHTML;
}

customElements.define(AudioSkinTailwindElement.tagName, AudioSkinTailwindElement);

declare global {
  interface HTMLElementTagNameMap {
    [AudioSkinTailwindElement.tagName]: AudioSkinTailwindElement;
  }
}
