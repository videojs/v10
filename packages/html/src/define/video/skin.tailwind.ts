import { renderIcon } from '@videojs/icons/render';
import {
  badge,
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
  seek,
  seekIndicator,
  slider,
  statusIndicator,
  thumbnail,
  time,
  tooltip,
  volumeIndicator,
  volumePopover,
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

            <media-seek-button commandfor="seek-backward-tooltip" seconds="${-SEEK_TIME}" class="${cn(button.base, button.subtle, button.icon)}">
              <span class="${icons.container}">
                ${renderIcon('seek', { class: cn(icons.root, icons.flipped) })}
                <span class="${cn(seek.label, seek.labelBackward)}">${SEEK_TIME}</span>
              </span>
            </media-seek-button>
            <media-tooltip id="seek-backward-tooltip" side="top" class="${tooltip.root}">
              <media-tooltip-label></media-tooltip-label>
              <media-tooltip-shortcut class="${tooltip.shortcut}"></media-tooltip-shortcut>
            </media-tooltip>

            <media-seek-button commandfor="seek-forward-tooltip" seconds="${SEEK_TIME}" class="${cn(button.base, button.subtle, button.icon)}">
              <span class="${icons.container}">
                ${renderIcon('seek', { class: icons.root })}
                <span class="${cn(seek.label, seek.labelForward)}">${SEEK_TIME}</span>
              </span>
            </media-seek-button>
            <media-tooltip id="seek-forward-tooltip" side="top" class="${tooltip.root}">
              <media-tooltip-label></media-tooltip-label>
              <media-tooltip-shortcut class="${tooltip.shortcut}"></media-tooltip-shortcut>
            </media-tooltip>
          </div>

          <div class="${time.group}">
            <media-time type="current" class="${time.current}"></media-time>
            <media-time-slider class="${slider.root}">
              <media-slider-track class="${slider.track}">
                <media-slider-fill class="${cn(slider.fillBase, slider.fill)}"></media-slider-fill>
                <media-slider-buffer class="${cn(slider.fillBase, slider.buffer)}"></media-slider-buffer>
              </media-slider-track>
              <media-slider-thumb class="${cn(slider.thumbBase, slider.thumb)}"></media-slider-thumb>

              <div class="${thumbnail.root}">
                <media-slider-thumbnail class="${thumbnail.image}"></media-slider-thumbnail>
                <media-slider-value type="pointer" class="${cn(time.current, thumbnail.time)}"></media-slider-value>
                ${renderIcon('spinner', { class: cn(icons.root, thumbnail.spinner) })}
              </div>
              <media-slider-preview class="${slider.preview}">
                <media-slider-value type="pointer" class="${cn(slider.value, time.current)}"></media-slider-value>
              </media-slider-preview>
            </media-time-slider>
            <media-time type="duration" class="${time.duration}"></media-time>
          </div>

          <div class="${cn(controlsGroup.end, menu.settingsGroup)}">
            <media-mute-button commandfor="video-volume-popover" class="${cn(button.base, button.subtle, button.icon, icons.muteButtonState)}">
              ${renderIcon('volume-off', { class: cn(icons.root, icons.volumeOffIcon) })}
              ${renderIcon('volume-low', { class: cn(icons.root, icons.volumeLowIcon) })}
              ${renderIcon('volume-high', { class: cn(icons.root, icons.volumeHighIcon) })}
            </media-mute-button>

            <media-popover id="video-volume-popover" open-on-hover delay="200" close-delay="100" side="top" class="${cn(popover.root, volumePopover.root)}">
              <media-volume-slider class="${slider.root}" orientation="vertical" thumb-alignment="edge">
                <media-slider-track class="${slider.track}">
                  <media-slider-fill class="${cn(slider.fillBase, slider.fill)}"></media-slider-fill>
                </media-slider-track>
                <media-slider-thumb class="${cn(slider.thumbBase, slider.thumbPersistent)}"></media-slider-thumb>
              </media-volume-slider>
            </media-popover>

            <button commandfor="settings-menu" aria-label="Settings" class="${cn(button.base, button.subtle, button.icon, menu.settingsTrigger, 'media-button--settings')}">
              ${renderIcon('gear', { class: cn(icons.root, menu.settingsIcon) })}
            </button>
            <media-menu id="settings-menu" side="top" align="center" class="${menu.settings}">
              <media-menu-view class="${menu.rootView}">
                <div class="${menu.group}">
                  <media-menu-item commandfor="settings-quality-menu" type="quality" data-setting="quality" class="${cn(menu.item, 'media-menu__item--submenu')}">
                    ${renderIcon('switches', { class: icons.root })}
                    <span>Quality</span>
                    <span class="${menu.hint}">
                      <media-menu-item-value class="${menu.hintLabel}"></media-menu-item-value>
                      ${renderIcon('chevron', { class: cn(icons.root, menu.chevron) })}
                    </span>
                  </media-menu-item>
                  <media-menu-item commandfor="settings-speed-menu" type="playback-rate" data-setting="playback-rate" class="${cn(menu.item, 'media-menu__item--submenu')}">
                    ${renderIcon('speed', { class: icons.root })}
                    <span>Speed</span>
                    <span class="${menu.hint}">
                      <media-menu-item-value class="${menu.hintLabel}"></media-menu-item-value>
                      ${renderIcon('chevron', { class: cn(icons.root, menu.chevron) })}
                    </span>
                  </media-menu-item>
                  <media-menu-item commandfor="settings-captions-menu" type="captions" data-setting="captions" class="${cn(menu.item, 'media-menu__item--submenu')}">
                    ${renderIcon('captions-off', { class: icons.root })}
                    <span>Captions</span>
                    <span class="${menu.hint}">
                      <media-menu-item-value class="${menu.hintLabel}"></media-menu-item-value>
                      ${renderIcon('chevron', { class: cn(icons.root, menu.chevron) })}
                    </span>
                  </media-menu-item>
                </div>
              </media-menu-view>

              <media-menu id="settings-quality-menu" class="${menu.submenuPanel}">
                <media-menu-back class="${menu.back}">
                  ${renderIcon('chevron', { class: cn(icons.root, menu.chevron, icons.flipped) })}
                  Quality
                </media-menu-back>
                <div class="${menu.separator}"></div>
                <media-quality-radio-group class="${menu.group}">
                  <template>
                    <media-menu-radio-item class="${menu.item}">
                      <span>
                        <span data-part="label"></span>
                        <sup data-part="tier" class="${menu.tier}"></sup>
                      </span>
                      <span data-part="badge" class="${cn(badge, menu.badge)}"></span>
                      <media-menu-item-indicator force-mount class="${menu.indicator}">
                        ${renderIcon('check', { class: icons.root })}
                      </media-menu-item-indicator>
                    </media-menu-radio-item>
                  </template>
                </media-quality-radio-group>
              </media-menu>

              <media-menu id="settings-speed-menu" class="${menu.submenuPanel}">
                <media-menu-back class="${menu.back}">
                  ${renderIcon('chevron', { class: cn(icons.root, menu.chevron, icons.flipped) })}
                  Speed
                </media-menu-back>
                <div class="${menu.separator}"></div>
                <media-playback-rate-radio-group class="${menu.group}">
                  <template>
                    <media-menu-radio-item class="${menu.item}">
                      <span data-part="label"></span>
                      <media-menu-item-indicator force-mount class="${menu.indicator}">
                        ${renderIcon('check', { class: icons.root })}
                      </media-menu-item-indicator>
                    </media-menu-radio-item>
                  </template>
                </media-playback-rate-radio-group>
              </media-menu>

              <media-menu id="settings-captions-menu" class="${menu.submenuPanel}">
                <media-menu-back class="${menu.back}">
                  ${renderIcon('chevron', { class: cn(icons.root, menu.chevron, icons.flipped) })}
                  Captions
                </media-menu-back>
                <div class="${menu.separator}"></div>
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
            </media-menu>

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
      <media-hotkey keys="ArrowRight" action="seekStep" value="5"></media-hotkey>
      <media-hotkey keys="ArrowLeft" action="seekStep" value="-5"></media-hotkey>
      <media-hotkey keys="l" action="seekStep" value="10"></media-hotkey>
      <media-hotkey keys="j" action="seekStep" value="-10"></media-hotkey>
      <media-hotkey keys="ArrowUp" action="volumeStep" value="0.05"></media-hotkey>
      <media-hotkey keys="ArrowDown" action="volumeStep" value="-0.05"></media-hotkey>
      <media-hotkey keys="0-9" action="seekToPercent"></media-hotkey>
      <media-hotkey keys="Home" action="seekToPercent" value="0"></media-hotkey>
      <media-hotkey keys="End" action="seekToPercent" value="100"></media-hotkey>
      <media-hotkey keys=">" action="speedUp"></media-hotkey>
      <media-hotkey keys="<" action="speedDown"></media-hotkey>

      <!-- Gestures -->
      <media-gesture type="tap" action="togglePaused" pointer="mouse" region="center"></media-gesture>
      <media-gesture type="tap" action="toggleControls" pointer="touch"></media-gesture>
      <media-gesture type="doubletap" action="seekStep" value="-10" region="left"></media-gesture>
      <media-gesture type="doubletap" action="toggleFullscreen" region="center"></media-gesture>
      <media-gesture type="doubletap" action="seekStep" value="10" region="right"></media-gesture>

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

      <media-seek-indicator hidden class="${seekIndicator.root}">
        ${renderIcon('chevron', { class: seekIndicator.icon })}
        <media-seek-indicator-value class="${seekIndicator.value}"></media-seek-indicator-value>
      </media-seek-indicator>

      <media-status-indicator hidden actions="togglePaused" class="${statusIndicator.center}">
        ${renderIcon('play', { class: cn(statusIndicator.centerIcon, statusIndicator.playIcon) })}
        ${renderIcon('pause', { class: cn(statusIndicator.centerIcon, statusIndicator.pauseIcon) })}
      </media-status-indicator>
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
