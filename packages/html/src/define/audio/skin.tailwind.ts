import { renderIcon } from '@videojs/icons/render';
import {
  button,
  buttonGroup,
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
  tooltipState,
} from '@videojs/skins/default/tailwind/audio.tailwind';
import { cn } from '@videojs/utils/style';
import { safeDefine } from '../safe-define';
import { SkinElement } from '../skin-element';

// Side-effect imports: register all custom elements used in the template.
import '../media/container';
import '../ui/mute-button';
import '../ui/play-button';
import '../ui/playback-rate-button';
import '../ui/popover';
import '../ui/seek-button';
import '../ui/time';
import '../ui/time-slider';
import '../ui/tooltip';
import '../ui/tooltip-group';
import '../ui/volume-slider';

const SEEK_TIME = 10;

function getTemplateHTML() {
  return /*html*/ `
    <media-container class="${root}">
      <!-- @deprecated slot="media" is no longer required, use the default slot instead -->
      <slot name="media"></slot>
      <slot></slot>

      <div class="${controls}">
        <media-tooltip-group>
          <div class="${buttonGroup}">
            <span class="${tooltipState.play.wrapper}">
              <media-play-button commandfor="play-tooltip" class="${cn(button.base, button.subtle, button.icon, iconState.play.button)}">
                ${renderIcon('restart', { class: cn(icon, iconState.play.restart) })}
                ${renderIcon('play', { class: cn(icon, iconState.play.play) })}
                ${renderIcon('pause', { class: cn(icon, iconState.play.pause) })}
              </media-play-button>
              <media-tooltip id="play-tooltip" side="top" class="${cn(popup.tooltip)}">
                <span class="${tooltipState.play.replay}">Replay</span>
                <span class="${tooltipState.play.play}">Play</span>
                <span class="${tooltipState.play.pause}">Pause</span>
              </media-tooltip>
            </span>

            <media-seek-button commandfor="seek-backward-tooltip" seconds="${-SEEK_TIME}" class="${cn(button.base, button.subtle, button.icon)}">
              <span class="${iconContainer}">
                ${renderIcon('seek', { class: cn(icon, iconFlipped) })}
                <span class="${cn(seek.label, seek.labelBackward)}">${SEEK_TIME}</span>
              </span>
            </media-seek-button>
            <media-tooltip id="seek-backward-tooltip" side="top" class="${cn(popup.tooltip)}">
              Seek backward ${SEEK_TIME} seconds
            </media-tooltip>

            <media-seek-button commandfor="seek-forward-tooltip" seconds="${SEEK_TIME}" class="${cn(button.base, button.subtle, button.icon)}">
              <span class="${iconContainer}">
                ${renderIcon('seek', { class: icon })}
                <span class="${cn(seek.label, seek.labelForward)}">${SEEK_TIME}</span>
              </span>
            </media-seek-button>
            <media-tooltip id="seek-forward-tooltip" side="top" class="${cn(popup.tooltip)}">
              Seek forward ${SEEK_TIME} seconds
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
            </media-time-slider>
            <media-time type="duration" class="${time.duration}"></media-time>
          </div>

          <div class="${buttonGroup}">
            <media-playback-rate-button commandfor="playback-rate-tooltip"  class="${cn(button.base, button.subtle, button.icon, playbackRate.button)}"></media-playback-rate-button>
            <media-tooltip id="playback-rate-tooltip" side="top" class="${cn(popup.tooltip)}">
              Toggle playback rate
            </media-tooltip>

            <media-mute-button commandfor="audio-volume-popover" class="${cn(button.base, button.subtle, button.icon, iconState.mute.button)}">
              ${renderIcon('volume-off', { class: cn(icon, iconState.mute.volumeOff) })}
              ${renderIcon('volume-low', { class: cn(icon, iconState.mute.volumeLow) })}
              ${renderIcon('volume-high', { class: cn(icon, iconState.mute.volumeHigh) })}
            </media-mute-button>

            <media-popover id="audio-volume-popover" open-on-hover delay="200" close-delay="100" side="top" class="${cn(popup.popover, popup.volume)}">
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
  static getTemplateHTML = getTemplateHTML;
}

safeDefine(AudioSkinTailwindElement);

declare global {
  interface HTMLElementTagNameMap {
    [AudioSkinTailwindElement.tagName]: AudioSkinTailwindElement;
  }
}
