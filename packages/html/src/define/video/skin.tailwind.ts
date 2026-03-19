import { ReactiveElement } from '@videojs/element';
import { renderIcon } from '@videojs/icons/render';
import {
  bufferingIndicator,
  button,
  controls,
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
  tooltipState,
} from '@videojs/skins/default/tailwind/video.tailwind';
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
import '../ui/poster';
import '../ui/seek-button';
import '../ui/time';
import '../ui/time-slider';
import '../ui/tooltip';
import '../ui/tooltip-group';
import '../ui/volume-slider';

const SEEK_TIME = 10;

function getTemplateHTML() {
  return /*html*/ `
    <media-container class="${root(true)}">
      <slot name="media"></slot>

      <media-poster class="${poster(true)}">
        <slot name="poster"></slot>
      </media-poster>

      <media-buffering-indicator class="${bufferingIndicator.root}">
        <div class="${bufferingIndicator.container}">
          ${renderIcon('spinner')}
        </div>
      </media-buffering-indicator>

      <media-controls data-controls="" class="${controls}">
        <media-tooltip-group>
          <span class="${tooltipState.play.wrapper}">
            <media-play-button commandfor="play-tooltip" class="${cn(button.base, button.icon, iconState.play.button)}">
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

          <media-seek-button commandfor="seek-backward-tooltip" seconds="${-SEEK_TIME}" class="${cn(button.base, button.icon, seek.button)}">
            <span class="${iconContainer}">
              ${renderIcon('seek', { class: cn(icon, iconFlipped) })}
              <span class="${cn(seek.label, seek.labelBackward)}">${SEEK_TIME}</span>
            </span>
          </media-seek-button>
          <media-tooltip id="seek-backward-tooltip" side="top" class="${cn(popup.tooltip)}">
            Seek backward ${SEEK_TIME} seconds
          </media-tooltip>

          <media-seek-button commandfor="seek-forward-tooltip" seconds="${SEEK_TIME}" class="${cn(button.base, button.icon, seek.button)}">
            <span class="${iconContainer}">
              ${renderIcon('seek', { class: icon })}
              <span class="${cn(seek.label, seek.labelForward)}">${SEEK_TIME}</span>
            </span>
          </media-seek-button>
          <media-tooltip id="seek-forward-tooltip" side="top" class="${cn(popup.tooltip)}">
            Seek forward ${SEEK_TIME} seconds
          </media-tooltip>

          <media-time-group class="${time.group}">
            <media-time type="current" class="${time.current}"></media-time>
            <media-time-slider class="${slider.root}">
              <media-slider-track class="${slider.track}">
                <media-slider-fill class="${cn(slider.fill.base, slider.fill.fill)}"></media-slider-fill>
                <media-slider-buffer class="${cn(slider.fill.base, slider.fill.buffer)}"></media-slider-buffer>
              </media-slider-track>
              <media-slider-thumb class="${cn(slider.thumb.base, slider.thumb.interactive)}"></media-slider-thumb>

              <div class="${preview.root}">
                <media-slider-thumbnail class="${preview.thumbnail}"></media-slider-thumbnail>
                <media-slider-value type="pointer" class="${preview.timestamp}"></media-slider-value>
                ${renderIcon('spinner', { class: cn(icon, preview.spinner) })}
              </div>
            </media-time-slider>
            <media-time type="duration" class="${time.duration}"></media-time>
          </media-time-group>

          <media-playback-rate-button commandfor="playback-rate-tooltip"  class="${cn(button.base, button.icon, playbackRate.button)}"></media-playback-rate-button>
          <media-tooltip id="playback-rate-tooltip" side="top" class="${cn(popup.tooltip)}">
            Toggle playback rate
          </media-tooltip>

          <media-mute-button commandfor="video-volume-popover" class="${cn(button.base, button.icon, iconState.mute.button)}">
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

          <span class="${tooltipState.captions.wrapper}">
            <media-captions-button commandfor="captions-tooltip" class="${cn(button.base, button.icon, iconState.captions.button)}">
              ${renderIcon('captions-off', { class: cn(icon, iconState.captions.off) })}
              ${renderIcon('captions-on', { class: cn(icon, iconState.captions.on) })}
            </media-captions-button>
            <media-tooltip id="captions-tooltip" side="top" class="${cn(popup.tooltip)}">
              <span class="${tooltipState.captions.enable}">Enable captions</span>
              <span class="${tooltipState.captions.disable}">Disable captions</span>
            </media-tooltip>
          </span>

          <span class="${tooltipState.pip.wrapper}">
            <media-pip-button commandfor="pip-tooltip" class="${cn(button.base, button.icon, iconState.pip.button)}">
              ${renderIcon('pip-enter', { class: cn(icon, iconState.pip.off) })}
              ${renderIcon('pip-exit', { class: cn(icon, iconState.pip.on) })}
            </media-pip-button>
            <media-tooltip id="pip-tooltip" side="top" class="${cn(popup.tooltip)}">
              <span class="${tooltipState.pip.enter}">Enter picture-in-picture</span>
              <span class="${tooltipState.pip.exit}">Exit picture-in-picture</span>
            </media-tooltip>
          </span>

          <span class="${tooltipState.fullscreen.wrapper}">
            <media-fullscreen-button commandfor="fullscreen-tooltip" class="${cn(button.base, button.icon, iconState.fullscreen.button)}">
              ${renderIcon('fullscreen-enter', { class: cn(icon, iconState.fullscreen.enter) })}
              ${renderIcon('fullscreen-exit', { class: cn(icon, iconState.fullscreen.exit) })}
            </media-fullscreen-button>
            <media-tooltip id="fullscreen-tooltip" side="top" class="${cn(popup.tooltip)}">
              <span class="${tooltipState.fullscreen.enter}">Enter fullscreen</span>
              <span class="${tooltipState.fullscreen.exit}">Exit fullscreen</span>
            </media-tooltip>
          </span>
        </media-tooltip-group>
      </media-controls>

      <div class="${overlay}"></div>
    </media-container>
  `;
}

export class VideoSkinTailwindElement extends SkinMixin(ReactiveElement) {
  static readonly tagName = 'video-skin-tailwind';
  static getTemplateHTML = getTemplateHTML;
}

customElements.define(VideoSkinTailwindElement.tagName, VideoSkinTailwindElement);

declare global {
  interface HTMLElementTagNameMap {
    [VideoSkinTailwindElement.tagName]: VideoSkinTailwindElement;
  }
}
