// @ts-nocheck -- temporary bundled output; authored types remain in packages/skins/canonical.
import './styles.css';
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
      <Tooltip.Popup className="media-tooltip">
        <Tooltip.Label />
        <Tooltip.Shortcut className="media-tooltip-shortcut" />
      </Tooltip.Popup>
    </Tooltip.Root>
  );
}
function FullscreenButton$1() {
  return (
    <ButtonTooltip>
      <FullscreenButton className="media-fullscreen-button">
        <FullscreenEnterIcon className="media-fullscreen-button-icon-enter" />
        <FullscreenExitIcon className="media-fullscreen-button-icon-exit" />
      </FullscreenButton>
    </ButtonTooltip>
  );
}
function PlayButton$1() {
  return (
    <ButtonTooltip>
      <PlayButton className="media-play-button">
        <RestartIcon className="media-play-button-icon-restart" />
        <PlayIcon className="media-play-button-icon-play" />
        <PauseIcon className="media-play-button-icon-pause" />
      </PlayButton>
    </ButtonTooltip>
  );
}
function SeekButton$1(props = {}) {
  const seconds = props.seconds ?? 10;
  return (
    <ButtonTooltip>
      <SeekButton className="media-seek-button" {...props} seconds={seconds}>
        <SeekIcon className={seconds < 0 ? 'media-seek-button-icon-backward' : 'media-seek-button-icon-forward'} />
        <span className="media-seek-button-label">{Math.abs(seconds)}</span>
      </SeekButton>
    </ButtonTooltip>
  );
}
function MuteButton$1() {
  return (
    <MuteButton className="media-mute-button">
      <VolumeOffIcon className="media-mute-button-icon-volume-off" />
      <VolumeLowIcon className="media-mute-button-icon-volume-low" />
      <VolumeHighIcon className="media-mute-button-icon-volume-high" />
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
      <Popover.Popup className="media-volume-popover">
        <VolumeSlider$1 orientation="vertical" />
      </Popover.Popup>
    </Popover.Root>
  );
}
function TimeSlider$1() {
  return (
    <TimeSlider.Root className="media-slider" thumbAlignment="edge">
      <TimeSlider.Track className="media-slider-track">
        <TimeSlider.Fill className="media-slider-fill" />
        <TimeSlider.Buffer className="media-slider-buffer" />
      </TimeSlider.Track>
      <TimeSlider.Thumb className="media-slider-thumb" />
      <div className="media-thumbnail">
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
    <Controls.Root className="media-skin media-theme-default">
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
