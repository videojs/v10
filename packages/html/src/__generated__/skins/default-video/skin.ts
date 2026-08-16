import '../../../icons/element';
import '../../../define/i18n';
import '../../../define/media/container';
import '../../../define/ui/airplay-button';
import '../../../define/ui/audio-track-radio-group';
import '../../../define/ui/buffering-indicator';
import '../../../define/ui/captions-button';
import '../../../define/ui/captions-radio-group';
import '../../../define/ui/cast-button';
import '../../../define/ui/controls';
import '../../../define/ui/error-dialog';
import '../../../define/ui/fullscreen-button';
import '../../../define/ui/gesture';
import '../../../define/ui/hotkey';
import '../../../define/ui/menu';
import '../../../define/ui/mute-button';
import '../../../define/ui/pip-button';
import '../../../define/ui/play-button';
import '../../../define/ui/playback-rate-radio-group';
import '../../../define/ui/popover';
import '../../../define/ui/poster';
import '../../../define/ui/quality-radio-group';
import '../../../define/ui/seek-indicator';
import '../../../define/ui/status-announcer';
import '../../../define/ui/status-indicator';
import '../../../define/ui/time';
import '../../../define/ui/time-slider';
import '../../../define/ui/time-slider-chapters';
import '../../../define/ui/tooltip';
import '../../../define/ui/tooltip-group';
import '../../../define/ui/volume-indicator';
import '../../../define/ui/volume-slider';

export const skin = /* html */ `<media-container class="media-container media-skin media-skin-video media-theme-default">
  <slot></slot>
  <media-poster class="media-poster"><slot name="poster"></slot></media-poster>
  <media-buffering-indicator class="media-buffering-indicator">
    <media-icon class="media-buffering-spinner-icon" name="spinner"></media-icon>
  </media-buffering-indicator>
  <media-error-dialog class="media-error-dialog">
    <media-alert-dialog-title class="media-error-dialog-title"></media-alert-dialog-title>
    <media-alert-dialog-description class="media-error-dialog-description"></media-alert-dialog-description>
    <media-alert-dialog-close class="media-button media-error-dialog-close"></media-alert-dialog-close>
  </media-error-dialog>
  <media-controls class="media-controls-root">
    <media-tooltip-group>
      <media-controls-group class="media-controls-primary">
        <media-controls-group class="media-button-group">
          <media-play-button class="media-button media-play-button">
            <media-icon class="media-button-icon media-restart-icon" name="restart"></media-icon>
            <media-icon class="media-button-icon media-play-icon" name="play"></media-icon>
            <media-icon class="media-button-icon media-pause-icon" name="pause"></media-icon>
          </media-play-button>
          <media-tooltip side="top" class="media-surface media-tooltip">
            <media-tooltip-label></media-tooltip-label>
            <media-tooltip-shortcut class="media-tooltip-shortcut"></media-tooltip-shortcut>
          </media-tooltip>
          <media-mute-button class="media-button media-mute-button">
            <media-icon class="media-button-icon media-volume-off-icon" name="volume-off"></media-icon>
            <media-icon class="media-button-icon media-volume-low-icon" name="volume-low"></media-icon>
            <media-icon class="media-button-icon media-volume-high-icon" name="volume-high"></media-icon>
          </media-mute-button>
          <media-popover
            open-on-hover
            delay="200"
            close-delay="100"
            side="top"
            class="media-surface media-volume-popover"
          >
            <media-volume-slider class="media-slider" thumb-alignment="edge" orientation="vertical">
              <media-slider-track class="media-slider-track">
                <media-slider-fill class="media-slider-fill"></media-slider-fill>
              </media-slider-track>
              <media-slider-thumb class="media-slider-thumb media-slider-thumb-persistent"></media-slider-thumb>
            </media-volume-slider>
          </media-popover>
        </media-controls-group>
        <media-controls-group class="media-time-controls">
          <media-time class="media-time-current" type="current"></media-time>
          <media-time-slider class="media-slider">
            <media-time-slider-chapters class="media-slider-chapters">
              <template>
                <div class="media-slider-chapter">
                  <media-slider-track class="media-slider-chapter-track">
                    <media-slider-buffer class="media-slider-buffer"></media-slider-buffer>
                    <media-slider-fill class="media-slider-fill"></media-slider-fill>
                  </media-slider-track>
                </div>
              </template>
              <media-slider-track class="media-slider-track">
                <media-slider-buffer class="media-slider-buffer"></media-slider-buffer>
                <media-slider-fill class="media-slider-fill"></media-slider-fill>
              </media-slider-track>
            </media-time-slider-chapters>
            <media-slider-thumb class="media-slider-thumb media-slider-thumb-interactive"></media-slider-thumb>
            <media-slider-preview class="media-slider-preview" overflow="visible">
              <div class="media-surface media-thumbnail">
                <media-slider-thumbnail class="media-thumbnail-image"></media-slider-thumbnail>
                <media-icon class="media-spinner-icon" name="spinner"></media-icon>
              </div>
              <div class="media-preview-value">
                <media-time-slider-chapter-title class="media-chapter-title"></media-time-slider-chapter-title>
                <media-slider-value class="media-slider-value" type="pointer"></media-slider-value>
              </div>
            </media-slider-preview>
          </media-time-slider>
          <media-time class="media-time-remaining" type="remaining" toggle></media-time>
        </media-controls-group>
        <media-controls-group class="media-button-group">
          <media-captions-button class="media-button media-captions-button">
            <media-icon class="media-button-icon media-captions-off-icon" name="captions-off"></media-icon>
            <media-icon class="media-button-icon media-captions-on-icon" name="captions-on"></media-icon>
          </media-captions-button>
          <media-tooltip side="top" class="media-surface media-tooltip">
            <media-tooltip-label></media-tooltip-label>
            <media-tooltip-shortcut class="media-tooltip-shortcut"></media-tooltip-shortcut>
          </media-tooltip>
          <button class="media-button media-settings-trigger" commandfor="settings-menu" id="settings-trigger">
            <media-icon class="media-button-icon media-settings-icon" name="gear"></media-icon>
            <media-text class="media-sr-only" token="menu.settings">Settings</media-text>
          </button>
          <media-tooltip side="top" class="media-surface media-tooltip" trigger="settings-trigger">
            <media-text token="menu.settings">Settings</media-text>
          </media-tooltip>
          <media-menu
            side="top"
            align="center"
            class="media-surface media-popover media-settings media-group"
            id="settings-menu"
          >
            <media-menu-item class="media-item-base media-item" commandfor="settings-quality-menu">
              <media-icon class="media-icon" name="switches"></media-icon>
              <media-text token="menu.quality">Quality</media-text>
              <span class="media-hint">
                <span class="media-hint-label" data-part="hint"></span>
                <media-icon class="media-icon media-chevron" name="chevron"></media-icon>
              </span>
            </media-menu-item>
            <media-menu class="media-submenu-panel" id="settings-quality-menu">
              <media-menu-item class="media-item-base media-back">
                <media-icon class="media-icon media-chevron media-chevron-flipped" name="chevron"></media-icon>
                <media-text token="menu.quality">Quality</media-text>
              </media-menu-item>
              <div class="media-separator"></div>
              <media-quality-radio-group class="media-group">
                <template>
                  <media-menu-radio-item class="media-item-base media-item">
                    <span>
                      <span data-part="label"></span>
                      <sup class="media-tier" data-part="tier"></sup>
                    </span>
                    <span class="media-badge" data-part="badge"></span>
                    <media-menu-item-indicator force-mount class="media-indicator">
                      <media-icon class="media-icon" name="check"></media-icon>
                    </media-menu-item-indicator>
                  </media-menu-radio-item>
                </template>
              </media-quality-radio-group>
            </media-menu>
            <media-menu-item class="media-item-base media-item" commandfor="settings-audio-menu">
              <media-icon class="media-icon" name="speech"></media-icon>
              <media-text token="menu.audio">Audio</media-text>
              <span class="media-hint">
                <span class="media-hint-label" data-part="hint"></span>
                <media-icon class="media-icon media-chevron" name="chevron"></media-icon>
              </span>
            </media-menu-item>
            <media-menu class="media-submenu-panel" id="settings-audio-menu">
              <media-menu-item class="media-item-base media-back">
                <media-icon class="media-icon media-chevron media-chevron-flipped" name="chevron"></media-icon>
                <media-text token="menu.audio">Audio</media-text>
              </media-menu-item>
              <div class="media-separator"></div>
              <media-audio-track-radio-group class="media-group">
                <template>
                  <media-menu-radio-item class="media-item-base media-item">
                    <span data-part="label"></span>
                    <media-menu-item-indicator force-mount class="media-indicator">
                      <media-icon class="media-icon" name="check"></media-icon>
                    </media-menu-item-indicator>
                  </media-menu-radio-item>
                </template>
              </media-audio-track-radio-group>
            </media-menu>
            <media-menu-item class="media-item-base media-item" commandfor="settings-speed-menu">
              <media-icon class="media-icon" name="speed"></media-icon>
              <media-text token="menu.speed">Speed</media-text>
              <span class="media-hint">
                <span class="media-hint-label" data-part="hint"></span>
                <media-icon class="media-icon media-chevron" name="chevron"></media-icon>
              </span>
            </media-menu-item>
            <media-menu class="media-submenu-panel" id="settings-speed-menu">
              <media-menu-item class="media-item-base media-back">
                <media-icon class="media-icon media-chevron media-chevron-flipped" name="chevron"></media-icon>
                <media-text token="menu.speed">Speed</media-text>
              </media-menu-item>
              <div class="media-separator"></div>
              <media-playback-rate-radio-group class="media-group">
                <template>
                  <media-menu-radio-item class="media-item-base media-item">
                    <span data-part="label"></span>
                    <media-menu-item-indicator force-mount class="media-indicator">
                      <media-icon class="media-icon" name="check"></media-icon>
                    </media-menu-item-indicator>
                  </media-menu-radio-item>
                </template>
              </media-playback-rate-radio-group>
            </media-menu>
            <media-menu-item class="media-item-base media-item" commandfor="settings-captions-menu">
              <media-icon class="media-icon" name="captions-off"></media-icon>
              <media-text token="menu.captions">Captions</media-text>
              <span class="media-hint">
                <span class="media-hint-label" data-part="hint"></span>
                <media-icon class="media-icon media-chevron" name="chevron"></media-icon>
              </span>
            </media-menu-item>
            <media-menu class="media-submenu-panel" id="settings-captions-menu">
              <media-menu-item class="media-item-base media-back">
                <media-icon class="media-icon media-chevron media-chevron-flipped" name="chevron"></media-icon>
                <media-text token="menu.captions">Captions</media-text>
              </media-menu-item>
              <div class="media-separator"></div>
              <media-captions-radio-group class="media-group">
                <template>
                  <media-menu-radio-item class="media-item-base media-item">
                    <span data-part="label"></span>
                    <media-menu-item-indicator force-mount class="media-indicator">
                      <media-icon class="media-icon" name="check"></media-icon>
                    </media-menu-item-indicator>
                  </media-menu-radio-item>
                </template>
              </media-captions-radio-group>
            </media-menu>
          </media-menu>
        </media-controls-group>
      </media-controls-group>
      <media-controls-group class="media-controls-secondary">
        <media-controls-group class="media-button-group">
          <media-cast-button class="media-button media-cast-button">
            <media-icon class="media-button-icon media-cast-enter-icon" name="cast-enter"></media-icon>
            <media-icon class="media-button-icon media-cast-exit-icon" name="cast-exit"></media-icon>
          </media-cast-button>
          <media-tooltip side="top" class="media-surface media-tooltip">
            <media-tooltip-label></media-tooltip-label>
            <media-tooltip-shortcut class="media-tooltip-shortcut"></media-tooltip-shortcut>
          </media-tooltip>
          <media-airplay-button class="media-button media-airplay-button">
            <media-icon class="media-button-icon media-airplay-enter-icon" name="airplay-enter"></media-icon>
            <media-icon class="media-button-icon media-airplay-exit-icon" name="airplay-exit"></media-icon>
          </media-airplay-button>
          <media-tooltip side="top" class="media-surface media-tooltip">
            <media-tooltip-label></media-tooltip-label>
            <media-tooltip-shortcut class="media-tooltip-shortcut"></media-tooltip-shortcut>
          </media-tooltip>
          <media-pip-button class="media-button media-pip-button">
            <media-icon class="media-button-icon media-pip-enter-icon" name="pip-enter"></media-icon>
            <media-icon class="media-button-icon media-pip-exit-icon" name="pip-exit"></media-icon>
          </media-pip-button>
          <media-tooltip side="top" class="media-surface media-tooltip">
            <media-tooltip-label></media-tooltip-label>
            <media-tooltip-shortcut class="media-tooltip-shortcut"></media-tooltip-shortcut>
          </media-tooltip>
          <media-fullscreen-button class="media-button media-fullscreen-button">
            <media-icon class="media-button-icon media-fullscreen-enter-icon" name="fullscreen-enter"></media-icon>
            <media-icon class="media-button-icon media-fullscreen-exit-icon" name="fullscreen-exit"></media-icon>
          </media-fullscreen-button>
          <media-tooltip side="top" class="media-surface media-tooltip">
            <media-tooltip-label></media-tooltip-label>
            <media-tooltip-shortcut class="media-tooltip-shortcut"></media-tooltip-shortcut>
          </media-tooltip>
        </media-controls-group>
      </media-controls-group>
    </media-tooltip-group>
  </media-controls>
  <div class="media-overlay"></div>
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
  <media-hotkey keys="&gt;" action="speedUp"></media-hotkey>
  <media-hotkey keys="&lt;" action="speedDown"></media-hotkey>
  <media-gesture type="tap" action="togglePaused" pointer="mouse" region="center"></media-gesture>
  <media-gesture type="tap" action="toggleControls" pointer="touch"></media-gesture>
  <media-gesture type="doubletap" action="seekStep" value="-10" region="left"></media-gesture>
  <media-gesture type="doubletap" action="toggleFullscreen" region="center"></media-gesture>
  <media-gesture type="doubletap" action="seekStep" value="10" region="right"></media-gesture>
  <media-status-announcer class="media-status-announcer"></media-status-announcer>
  <div class="media-input-indicator-overlay">
    <media-volume-indicator class="media-volume-indicator">
      <media-volume-indicator-fill class="media-volume-indicator-fill">
        <media-icon
          class="media-volume-indicator-icon media-volume-high-indicator-icon"
          name="volume-high"
        ></media-icon>
        <media-icon class="media-volume-indicator-icon media-volume-low-indicator-icon" name="volume-low"></media-icon>
        <media-icon class="media-volume-indicator-icon media-volume-off-indicator-icon" name="volume-off"></media-icon>
        <media-volume-indicator-value class="media-volume-indicator-value"></media-volume-indicator-value>
      </media-volume-indicator-fill>
    </media-volume-indicator>
    <media-status-indicator
      actions="toggleSubtitles,toggleFullscreen,togglePictureInPicture"
      class="media-status-indicator"
    >
      <media-icon class="media-status-indicator-icon media-status-captions-on-icon" name="captions-on"></media-icon>
      <media-icon class="media-status-indicator-icon media-status-captions-off-icon" name="captions-off"></media-icon>
      <media-icon
        class="media-status-indicator-icon media-status-fullscreen-enter-icon"
        name="fullscreen-enter"
      ></media-icon>
      <media-icon
        class="media-status-indicator-icon media-status-fullscreen-exit-icon"
        name="fullscreen-exit"
      ></media-icon>
      <media-icon class="media-status-indicator-icon media-status-pip-enter-icon" name="pip-enter"></media-icon>
      <media-icon class="media-status-indicator-icon media-status-pip-exit-icon" name="pip-exit"></media-icon>
      <media-status-indicator-value class="media-status-indicator-value"></media-status-indicator-value>
    </media-status-indicator>
    <media-seek-indicator class="media-seek-indicator">
      <media-icon class="media-seek-indicator-icon" name="chevron"></media-icon>
      <media-seek-indicator-value class="media-seek-indicator-value"></media-seek-indicator-value>
    </media-seek-indicator>
    <media-status-indicator actions="togglePaused" class="media-playback-status-indicator">
      <media-icon class="media-playback-status-icon media-status-play-icon" name="play"></media-icon>
      <media-icon class="media-playback-status-icon media-status-pause-icon" name="pause"></media-icon>
    </media-status-indicator>
  </div>
</media-container>`;
