import { renderIcon } from '@videojs/icons/render';
import {
  buffering,
  button,
  container,
  controls,
  controlsGroup,
  error,
  icons,
  indicator,
  menu,
  overlay,
  popover,
  poster,
  slider,
  statusIndicator,
  tooltip,
  volumeIndicator,
  volumePopover,
} from '@videojs/skins/default/tailwind/video.tailwind';
import { createTemplate } from '@videojs/utils/dom';
import { cn } from '@videojs/utils/style';
import { safeDefine } from '../safe-define';
import { SkinElement } from '../skin-element';

// Register the live video player, container, and all UI custom elements.
import './ui';

function getTemplateHTML() {
  return /*html*/ `
    <media-container class="${container}">
      <!-- @deprecated slot="media" is no longer required, use the default slot instead -->
      <slot name="media"></slot>
      <slot></slot>

      <media-poster class="${poster}">
        <slot name="poster"></slot>
      </media-poster>

      <media-buffering-indicator class="${buffering.root}">
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
          <div class="${controlsGroup.start}">
              <media-play-button commandfor="play-tooltip" class="${cn(button.base, button.subtle, button.icon, icons.playButtonState)}">
                ${renderIcon('restart', { class: cn(icons.root, icons.restartIcon) })}
                ${renderIcon('play', { class: cn(icons.root, icons.playIcon) })}
                ${renderIcon('pause', { class: cn(icons.root, icons.pauseIcon) })}
              </media-play-button>
              <media-tooltip id="play-tooltip" side="top" class="${tooltip.root}">
                <media-tooltip-label></media-tooltip-label>
                <media-tooltip-shortcut class="${tooltip.shortcut}"></media-tooltip-shortcut>
              </media-tooltip>

              <media-live-button class="${cn(button.base, button.subtle, button.live)}"></media-live-button>
          </div>

          <div class="grow" aria-hidden="true"></div>

          <div class="${controlsGroup.end}">
            <media-mute-button commandfor="live-video-volume-popover" class="${cn(button.base, button.subtle, button.icon, icons.muteButtonState)}">
              ${renderIcon('volume-off', { class: cn(icons.root, icons.volumeOffIcon) })}
              ${renderIcon('volume-low', { class: cn(icons.root, icons.volumeLowIcon) })}
              ${renderIcon('volume-high', { class: cn(icons.root, icons.volumeHighIcon) })}
            </media-mute-button>

            <media-popover id="live-video-volume-popover" open-on-hover delay="200" close-delay="100" side="top" class="${cn(popover.root, volumePopover.root)}">
              <media-volume-slider class="${slider.root}" orientation="vertical" thumb-alignment="edge">
                <media-slider-track class="${slider.track}">
                  <media-slider-fill class="${cn(slider.fillBase, slider.fill)}"></media-slider-fill>
                </media-slider-track>
                <media-slider-thumb class="${cn(slider.thumbBase, slider.thumbPersistent)}"></media-slider-thumb>
              </media-volume-slider>
            </media-popover>
              <media-captions-button menu-for="captions-menu" commandfor="captions-tooltip" class="${cn(button.base, button.subtle, button.icon, icons.captionsButtonState)}">
                ${renderIcon('captions-off', { class: cn(icons.root, icons.captionsOffIcon) })}
                ${renderIcon('captions-on', { class: cn(icons.root, icons.captionsOnIcon) })}
              </media-captions-button>
              <media-menu id="captions-menu" side="top" align="center" class="${cn(popover.root, menu.root, 'media-menu--captions')}">
                <media-captions-radio-group class="${menu.group}">
                  <template>
                    <media-menu-radio-item class="${menu.item}">
                      <span data-part="label"></span>
                      <media-menu-item-indicator force-mount class="${menu.indicator}">
                        ${renderIcon('check', { class: icons.root })}
                      </media-menu-item-indicator>
                    </media-menu-radio-item>
                  </template>
                </media-captions-radio-group>
              </media-menu>
              <media-tooltip id="captions-tooltip" side="top" class="${tooltip.root}">
                <media-tooltip-label></media-tooltip-label>
                <media-tooltip-shortcut class="${tooltip.shortcut}"></media-tooltip-shortcut>
              </media-tooltip>
              <media-cast-button commandfor="cast-tooltip" class="${cn(button.base, button.subtle, button.icon, icons.castButtonState)}">
                ${renderIcon('cast-enter', { class: cn(icons.root, icons.castEnterIcon) })}
                ${renderIcon('cast-exit', { class: cn(icons.root, icons.castExitIcon) })}
              </media-cast-button>
              <media-tooltip id="cast-tooltip" side="top" class="${tooltip.root}">
                <media-tooltip-label></media-tooltip-label>
                <media-tooltip-shortcut class="${tooltip.shortcut}"></media-tooltip-shortcut>
              </media-tooltip>
              <media-airplay-button commandfor="airplay-tooltip" class="${cn(button.base, button.subtle, button.icon, icons.airplayButtonState)}">
                ${renderIcon('airplay-enter', { class: cn(icons.root, icons.airplayEnterIcon) })}
                ${renderIcon('airplay-exit', { class: cn(icons.root, icons.airplayExitIcon) })}
              </media-airplay-button>
              <media-tooltip id="airplay-tooltip" side="top" class="${tooltip.root}">
                <media-tooltip-label></media-tooltip-label>
                <media-tooltip-shortcut class="${tooltip.shortcut}"></media-tooltip-shortcut>
              </media-tooltip>
              <media-pip-button commandfor="pip-tooltip" class="${cn(button.base, button.subtle, button.icon, icons.pipButtonState)}">
                ${renderIcon('pip-enter', { class: cn(icons.root, icons.pipEnterIcon) })}
                ${renderIcon('pip-exit', { class: cn(icons.root, icons.pipExitIcon) })}
              </media-pip-button>
              <media-tooltip id="pip-tooltip" side="top" class="${tooltip.root}">
                <media-tooltip-label></media-tooltip-label>
                <media-tooltip-shortcut class="${tooltip.shortcut}"></media-tooltip-shortcut>
              </media-tooltip>
              <media-fullscreen-button commandfor="fullscreen-tooltip" class="${cn(button.base, button.subtle, button.icon, icons.fullscreenButtonState)}">
                ${renderIcon('fullscreen-enter', { class: cn(icons.root, icons.fullscreenEnterIcon) })}
                ${renderIcon('fullscreen-exit', { class: cn(icons.root, icons.fullscreenExitIcon) })}
              </media-fullscreen-button>
              <media-tooltip id="fullscreen-tooltip" side="top" class="${tooltip.root}">
                <media-tooltip-label></media-tooltip-label>
                <media-tooltip-shortcut class="${tooltip.shortcut}"></media-tooltip-shortcut>
              </media-tooltip>
          </div>
        </media-tooltip-group>
      </media-controls>

      <media-overlay class="${overlay}"></media-overlay>

      <!-- Hotkeys -->
      <media-hotkey keys="Space" action="togglePaused"></media-hotkey>
      <media-hotkey keys="k" action="togglePaused"></media-hotkey>
      <media-hotkey keys="m" action="toggleMuted"></media-hotkey>
      <media-hotkey keys="f" action="toggleFullscreen"></media-hotkey>
      <media-hotkey keys="c" action="toggleSubtitles"></media-hotkey>
      <media-hotkey keys="i" action="togglePictureInPicture"></media-hotkey>
      <media-hotkey keys="ArrowUp" action="volumeStep" value="0.05"></media-hotkey>
      <media-hotkey keys="ArrowDown" action="volumeStep" value="-0.05"></media-hotkey>

      <!-- Gestures -->
      <media-gesture type="tap" action="togglePaused" pointer="mouse" region="center"></media-gesture>
      <media-gesture type="tap" action="toggleControls" pointer="touch"></media-gesture>
      <media-gesture type="doubletap" action="toggleFullscreen" region="center"></media-gesture>

      <!-- Input Feedback -->
      <media-status-announcer></media-status-announcer>
      <media-volume-indicator hidden class="${volumeIndicator.root}">
        <media-volume-indicator-fill class="${indicator.content}">
          ${renderIcon('volume-high', { class: cn(volumeIndicator.icon, volumeIndicator.highIcon) })}
          ${renderIcon('volume-low', { class: cn(volumeIndicator.icon, volumeIndicator.lowIcon) })}
          ${renderIcon('volume-off', { class: cn(volumeIndicator.icon, volumeIndicator.offIcon) })}
          <media-volume-indicator-value class="${indicator.value}"></media-volume-indicator-value>
        </media-volume-indicator-fill>
      </media-volume-indicator>
      <media-status-indicator hidden actions="toggleSubtitles toggleFullscreen togglePictureInPicture" class="${statusIndicator.top}">
        ${renderIcon('captions-on', { class: cn(statusIndicator.topIcon, statusIndicator.captionsOnIcon) })}
        ${renderIcon('captions-off', { class: cn(statusIndicator.topIcon, statusIndicator.captionsOffIcon) })}
        ${renderIcon('fullscreen-enter', { class: cn(statusIndicator.topIcon, statusIndicator.fullscreenEnterIcon) })}
        ${renderIcon('fullscreen-exit', { class: cn(statusIndicator.topIcon, statusIndicator.fullscreenExitIcon) })}
        ${renderIcon('pip-enter', { class: cn(statusIndicator.topIcon, statusIndicator.pipEnterIcon) })}
        ${renderIcon('pip-exit', { class: cn(statusIndicator.topIcon, statusIndicator.pipExitIcon) })}
        <media-status-indicator-value class="${indicator.value}"></media-status-indicator-value>
      </media-status-indicator>
      <media-status-indicator hidden actions="togglePaused" class="${statusIndicator.center}">
        ${renderIcon('play', { class: cn(statusIndicator.centerIcon, statusIndicator.playIcon) })}
        ${renderIcon('pause', { class: cn(statusIndicator.centerIcon, statusIndicator.pauseIcon) })}
      </media-status-indicator>
    </media-container>
  `;
}

export class LiveVideoSkinTailwindElement extends SkinElement {
  static readonly tagName = 'live-video-skin-tailwind';
  static template = createTemplate(getTemplateHTML());
}

safeDefine(LiveVideoSkinTailwindElement);

declare global {
  interface HTMLElementTagNameMap {
    [LiveVideoSkinTailwindElement.tagName]: LiveVideoSkinTailwindElement;
  }
}
