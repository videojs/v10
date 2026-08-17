import '../../../icons/element';
import '../../../define/media/container';
import '../../../define/ui/controls';
import '../../../define/ui/fullscreen-button';
import '../../../define/ui/mute-button';
import '../../../define/ui/play-button';
import '../../../define/ui/popover';
import '../../../define/ui/poster';
import '../../../define/ui/seek-button';
import '../../../define/ui/time';
import '../../../define/ui/time-slider';
import '../../../define/ui/tooltip';
import '../../../define/ui/tooltip-group';
import '../../../define/ui/volume-slider';

export const skin = /* html */ `<media-container class="media-container media-skin media-skin-video media-theme-default">
  <slot></slot>
  <media-poster class="media-poster"><slot name="poster"></slot></media-poster>
  <media-controls class="media-controls">
    <media-tooltip-group>
      <media-controls-group class="media-controls-group-primary">
        <media-play-button class="media-button media-play-button">
          <media-icon class="media-button-icon media-restart-icon" name="restart"></media-icon>
          <media-icon class="media-button-icon media-play-icon" name="play"></media-icon>
          <media-icon class="media-button-icon media-pause-icon" name="pause"></media-icon>
        </media-play-button>
        <media-tooltip side="top" class="media-surface media-tooltip">
          <media-tooltip-label></media-tooltip-label>
          <media-tooltip-shortcut class="media-tooltip-shortcut"></media-tooltip-shortcut>
        </media-tooltip>
        <media-seek-button class="media-button media-seek-button" seconds="-10">
          <media-icon class="media-button-icon media-seek-backward-icon" name="seek"></media-icon>
          <span class="media-seek-button-label">10</span>
        </media-seek-button>
        <media-tooltip side="top" class="media-surface media-tooltip">
          <media-tooltip-label></media-tooltip-label>
          <media-tooltip-shortcut class="media-tooltip-shortcut"></media-tooltip-shortcut>
        </media-tooltip>
        <media-seek-button class="media-button media-seek-button" seconds="10">
          <media-icon class="media-button-icon" name="seek"></media-icon>
          <span class="media-seek-button-label">10</span>
        </media-seek-button>
        <media-tooltip side="top" class="media-surface media-tooltip">
          <media-tooltip-label></media-tooltip-label>
          <media-tooltip-shortcut class="media-tooltip-shortcut"></media-tooltip-shortcut>
        </media-tooltip>
      </media-controls-group>
      <media-controls-group class="media-controls-group-time">
        <media-time class="media-time" type="current"></media-time>
        <media-time-slider class="media-slider">
          <media-slider-track class="media-slider-track">
            <media-slider-buffer class="media-slider-buffer"></media-slider-buffer>
            <media-slider-fill class="media-slider-fill"></media-slider-fill>
          </media-slider-track>
          <media-slider-thumb class="media-slider-thumb"></media-slider-thumb>
          <div class="media-surface media-thumbnail">
            <media-slider-thumbnail class="media-thumbnail-image"></media-slider-thumbnail>
            <media-slider-value class="media-slider-value" type="pointer"></media-slider-value>
            <media-icon class="media-spinner-icon" name="spinner"></media-icon>
          </div>
          <media-slider-preview class="media-slider-preview">
            <media-slider-value class="media-slider-value" type="pointer"></media-slider-value>
          </media-slider-preview>
        </media-time-slider>
        <media-time class="media-time" type="remaining" toggle></media-time>
      </media-controls-group>
      <media-controls-group class="media-controls-group-primary">
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
            <media-slider-thumb class="media-slider-thumb"></media-slider-thumb>
          </media-volume-slider>
        </media-popover>
        <media-fullscreen-button class="media-button media-fullscreen-button">
          <media-icon class="media-button-icon media-fullscreen-enter-icon" name="fullscreen-enter"></media-icon>
          <media-icon class="media-button-icon media-fullscreen-exit-icon" name="fullscreen-exit"></media-icon>
        </media-fullscreen-button>
        <media-tooltip side="top" class="media-surface media-tooltip">
          <media-tooltip-label></media-tooltip-label>
          <media-tooltip-shortcut class="media-tooltip-shortcut"></media-tooltip-shortcut>
        </media-tooltip>
      </media-controls-group>
    </media-tooltip-group>
  </media-controls>
  <div class="media-overlay"></div>
</media-container>`;
