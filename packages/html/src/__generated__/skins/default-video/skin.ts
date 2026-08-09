import '@videojs/html/icons/element';
import '@videojs/html/ui/controls';
import '@videojs/html/ui/fullscreen-button';
import '@videojs/html/ui/mute-button';
import '@videojs/html/ui/play-button';
import '@videojs/html/ui/popover';
import '@videojs/html/ui/seek-button';
import '@videojs/html/ui/time';
import '@videojs/html/ui/time-slider';
import '@videojs/html/ui/tooltip';
import '@videojs/html/ui/tooltip-group';
import '@videojs/html/ui/volume-slider';

export const skin = /* html */ `<media-controls class="media-surface media-skin media-theme-default">
  <media-tooltip-group>
    <media-controls-group class="media-controls-group-primary">
      <media-play-button class="media-button media-play-button" commandfor="play-tooltip">
        <media-icon class="media-button-icon media-play-button-icon-restart" name="restart"></media-icon>
        <media-icon class="media-button-icon media-play-button-icon-play" name="play"></media-icon>
        <media-icon class="media-button-icon media-play-button-icon-pause" name="pause"></media-icon>
      </media-play-button>
      <media-tooltip side="top" class="media-surface media-tooltip" id="play-tooltip">
        <media-tooltip-label></media-tooltip-label>
        <media-tooltip-shortcut class="media-tooltip-shortcut"></media-tooltip-shortcut>
      </media-tooltip>
      <media-seek-button class="media-button media-seek-button" seconds="-10" commandfor="seek-backward-tooltip">
        <media-icon class="media-button-icon media-seek-button-icon-backward" name="seek"></media-icon>
        <span class="media-seek-button-label">10</span>
      </media-seek-button>
      <media-tooltip side="top" class="media-surface media-tooltip" id="seek-backward-tooltip">
        <media-tooltip-label></media-tooltip-label>
        <media-tooltip-shortcut class="media-tooltip-shortcut"></media-tooltip-shortcut>
      </media-tooltip>
      <media-seek-button class="media-button media-seek-button" seconds="10" commandfor="seek-forward-tooltip">
        <media-icon class="media-button-icon media-seek-button-icon-forward" name="seek"></media-icon>
        <span class="media-seek-button-label">10</span>
      </media-seek-button>
      <media-tooltip side="top" class="media-surface media-tooltip" id="seek-forward-tooltip">
        <media-tooltip-label></media-tooltip-label>
        <media-tooltip-shortcut class="media-tooltip-shortcut"></media-tooltip-shortcut>
      </media-tooltip>
    </media-controls-group>
    <media-controls-group class="media-controls-group-time">
      <media-time class="media-time" type="current"></media-time>
      <media-time-slider class="media-slider">
        <media-slider-track class="media-slider-track">
          <media-slider-fill class="media-slider-fill"></media-slider-fill>
          <media-slider-buffer class="media-slider-buffer"></media-slider-buffer>
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
      <media-mute-button class="media-button media-mute-button" commandfor="volume-popover">
        <media-icon class="media-button-icon media-mute-button-icon-volume-off" name="volume-off"></media-icon>
        <media-icon class="media-button-icon media-mute-button-icon-volume-low" name="volume-low"></media-icon>
        <media-icon class="media-button-icon media-mute-button-icon-volume-high" name="volume-high"></media-icon>
      </media-mute-button>
      <media-popover
        open-on-hover
        delay="200"
        close-delay="100"
        side="top"
        class="media-surface media-volume-popover"
        id="volume-popover"
      >
        <media-volume-slider class="media-slider" thumb-alignment="edge" orientation="vertical">
          <media-slider-track class="media-slider-track">
            <media-slider-fill class="media-slider-fill"></media-slider-fill>
          </media-slider-track>
          <media-slider-thumb class="media-slider-thumb"></media-slider-thumb>
        </media-volume-slider>
      </media-popover>
      <media-fullscreen-button class="media-button media-fullscreen-button" commandfor="fullscreen-tooltip">
        <media-icon class="media-button-icon media-fullscreen-button-icon-enter" name="fullscreen-enter"></media-icon>
        <media-icon class="media-button-icon media-fullscreen-button-icon-exit" name="fullscreen-exit"></media-icon>
      </media-fullscreen-button>
      <media-tooltip side="top" class="media-surface media-tooltip" id="fullscreen-tooltip">
        <media-tooltip-label></media-tooltip-label>
        <media-tooltip-shortcut class="media-tooltip-shortcut"></media-tooltip-shortcut>
      </media-tooltip>
    </media-controls-group>
  </media-tooltip-group>
</media-controls>`;
