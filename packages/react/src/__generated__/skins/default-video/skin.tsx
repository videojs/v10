// @ts-nocheck -- temporary bundled output; authored types remain in packages/skins/canonical.
import {
  Controls,
  FullscreenButton,
  MuteButton,
  PlayButton,
  Popover,
  SeekButton,
  Slider,
  Time,
  TimeSlider,
  Tooltip,
  VolumeSlider,
} from '@videojs/react';
import {
  FullscreenEnterIcon,
  FullscreenExitIcon,
  PauseIcon,
  PlayIcon,
  RestartIcon,
  SeekIcon,
  SpinnerIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeOffIcon,
} from '@videojs/react/icons';
function ButtonTooltip({ children, ...props }) {
  return (
    <Tooltip.Root {...props}>
      <Tooltip.Trigger render={children} />
      <Tooltip.Popup className="media-surface media-tooltip">
        <Tooltip.Label />
        <Tooltip.Shortcut className="media-tooltip-shortcut" />
      </Tooltip.Popup>
    </Tooltip.Root>
  );
}
function FullscreenButton$1() {
  return (
    <ButtonTooltip side="top">
      <FullscreenButton className="media-button media-fullscreen-button">
        <FullscreenEnterIcon className="media-button-icon media-fullscreen-button-icon-enter" />
        <FullscreenExitIcon className="media-button-icon media-fullscreen-button-icon-exit" />
      </FullscreenButton>
    </ButtonTooltip>
  );
}
function PlayButton$1() {
  return (
    <ButtonTooltip side="top">
      <PlayButton className="media-button media-play-button">
        <RestartIcon className="media-button-icon media-play-button-icon-restart" />
        <PlayIcon className="media-button-icon media-play-button-icon-play" />
        <PauseIcon className="media-button-icon media-play-button-icon-pause" />
      </PlayButton>
    </ButtonTooltip>
  );
}
function SeekButton$1(props = {}) {
  const seconds = props.seconds ?? 10;
  return (
    <ButtonTooltip side="top">
      <SeekButton className="media-button media-seek-button" {...props} seconds={seconds}>
        <SeekIcon
          className={
            seconds < 0
              ? 'media-button-icon media-seek-button-icon-backward'
              : 'media-button-icon media-seek-button-icon-forward'
          }
        />
        <span className="media-seek-button-label">{Math.abs(seconds)}</span>
      </SeekButton>
    </ButtonTooltip>
  );
}
function MuteButton$1() {
  return (
    <MuteButton className="media-button media-mute-button">
      <VolumeOffIcon className="media-button-icon media-mute-button-icon-volume-off" />
      <VolumeLowIcon className="media-button-icon media-mute-button-icon-volume-low" />
      <VolumeHighIcon className="media-button-icon media-mute-button-icon-volume-high" />
    </MuteButton>
  );
}
function VolumeSlider$1(props = {}) {
  return (
    <VolumeSlider.Root className="media-slider" thumbAlignment="edge" {...props}>
      <VolumeSlider.Track className="media-slider-track">
        <VolumeSlider.Fill className="media-slider-fill" />
      </VolumeSlider.Track>
      <VolumeSlider.Thumb className="media-slider-thumb" />
    </VolumeSlider.Root>
  );
}
function VolumePopover() {
  return (
    <Popover.Root openOnHover delay={200} closeDelay={100} side="top">
      <Popover.Trigger render={<MuteButton$1 />} />
      <Popover.Popup className="media-surface media-volume-popover">
        <VolumeSlider$1 orientation="vertical" />
      </Popover.Popup>
    </Popover.Root>
  );
}
function TimeSlider$1() {
  return (
    <TimeSlider.Root className="media-slider">
      <TimeSlider.Track className="media-slider-track">
        <TimeSlider.Fill className="media-slider-fill" />
        <TimeSlider.Buffer className="media-slider-buffer" />
      </TimeSlider.Track>
      <TimeSlider.Thumb className="media-slider-thumb" />
      <div className="media-surface media-thumbnail">
        <Slider.Thumbnail className="media-thumbnail-image" />
        <TimeSlider.Value className="media-slider-value" type="pointer" />
        <SpinnerIcon className="media-spinner-icon" />
      </div>
      <TimeSlider.Preview className="media-slider-preview">
        <TimeSlider.Value className="media-slider-value" type="pointer" />
      </TimeSlider.Preview>
    </TimeSlider.Root>
  );
}
const SEEK_SECONDS = 10;
function DefaultVideoSkin() {
  return (
    <Controls.Root className="media-surface media-theme-default media-skin">
      <Tooltip.Provider>
        <Controls.Group className="media-controls-group-primary">
          <PlayButton$1 />
          <SeekButton$1 seconds={-10} />
          <SeekButton$1 seconds={SEEK_SECONDS} />
        </Controls.Group>

        <Controls.Group className="media-controls-group-time">
          <Time.Value className="media-time" type="current" />
          <TimeSlider$1 />
          <Time.Value className="media-time" type="remaining" toggle />
        </Controls.Group>

        <Controls.Group className="media-controls-group-primary">
          <VolumePopover />
          <FullscreenButton$1 />
        </Controls.Group>
      </Tooltip.Provider>
    </Controls.Root>
  );
}
export { DefaultVideoSkin };
