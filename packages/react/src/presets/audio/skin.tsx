import { cn } from '@videojs/utils/style';
import { type ComponentProps, forwardRef, type ReactNode } from 'react';
import {
  CheckIcon,
  PauseIcon,
  PlayIcon,
  RestartIcon,
  SeekIcon,
  SpinnerIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeOffIcon,
} from '@/icons';
import { Container, usePlayer } from '@/player/context';
import { BufferingIndicator } from '@/ui/buffering-indicator';
import { ErrorDialog } from '@/ui/error-dialog';
import { Hotkey } from '@/ui/hotkey';
import { Menu } from '@/ui/menu';
import { MuteButton } from '@/ui/mute-button';
import { PlayButton } from '@/ui/play-button';
import { usePlaybackRateOptions } from '@/ui/playback-rate';
import { PlaybackRateButton } from '@/ui/playback-rate-button';
import { Popover } from '@/ui/popover';
import { SeekButton } from '@/ui/seek-button';
import { StatusAnnouncer } from '@/ui/status-announcer';
import { Time } from '@/ui/time';
import { TimeSlider } from '@/ui/time-slider';
import { Tooltip } from '@/ui/tooltip';
import { VolumeSlider } from '@/ui/volume-slider';
import type { BaseSkinProps } from '../types';

const SEEK_TIME = 10;

export type AudioSkinProps = BaseSkinProps;

const Button = forwardRef<HTMLButtonElement, ComponentProps<'button'>>(function Button({ className, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn('media-button media-button--subtle media-button--icon', className)}
      {...props}
    />
  );
});

function VolumePopover(): ReactNode {
  const volumeUnsupported = usePlayer((s) => s.volumeAvailability === 'unsupported');

  const muteButton = (
    <MuteButton className="media-button--mute" render={<Button />}>
      <VolumeOffIcon className="media-icon media-icon--volume-off" />
      <VolumeLowIcon className="media-icon media-icon--volume-low" />
      <VolumeHighIcon className="media-icon media-icon--volume-high" />
    </MuteButton>
  );

  if (volumeUnsupported) return muteButton;

  return (
    <Popover.Root openOnHover delay={200} closeDelay={100} side="top" boundary="viewport">
      <Popover.Trigger render={muteButton} />
      <Popover.Popup className="media-surface media-popover media-popover--volume">
        <VolumeSlider.Root className="media-slider" orientation="vertical" thumbAlignment="edge">
          <VolumeSlider.Track className="media-slider__track">
            <VolumeSlider.Fill className="media-slider__fill" />
          </VolumeSlider.Track>
          <VolumeSlider.Thumb className="media-slider__thumb media-slider__thumb--persistent" />
        </VolumeSlider.Root>
      </Popover.Popup>
    </Popover.Root>
  );
}

function PlaybackRateRadioGroup(): ReactNode {
  const state = usePlaybackRateOptions();
  if (!state) return null;

  const { options, setValue, value } = state;

  return (
    <Menu.RadioGroup className="media-menu__group" value={value} onValueChange={setValue} aria-label="Playback rate">
      {options.map((option) => (
        <Menu.RadioItem key={option.value} className="media-menu__item" value={option.value} disabled={option.disabled}>
          <span>{option.label}</span>
          <Menu.ItemIndicator checked={option.value === value} forceMount className="media-menu__indicator">
            <CheckIcon className="media-icon" />
          </Menu.ItemIndicator>
        </Menu.RadioItem>
      ))}
    </Menu.RadioGroup>
  );
}

function PlaybackRateTrigger(): ReactNode {
  const state = usePlaybackRateOptions();
  if (!state) return null;

  return (
    <Menu.Trigger
      disabled={state.disabled}
      render={<PlaybackRateButton className="media-button--playback-rate" render={<Button />} />}
    />
  );
}

export function AudioSkin(props: AudioSkinProps): ReactNode {
  const { children, className, ...rest } = props;

  return (
    <Container className={cn('media-default-skin media-default-skin--audio', className)} {...rest}>
      {children}

      <ErrorDialog.Root>
        <ErrorDialog.Popup className="media-error">
          <div className="media-error__dialog">
            <div className="media-error__content">
              <ErrorDialog.Title className="media-error__title">Something went wrong.</ErrorDialog.Title>
              <ErrorDialog.Description className="media-error__description" />
            </div>
            <div className="media-error__actions">
              <ErrorDialog.Close className="media-button media-button--subtle">OK</ErrorDialog.Close>
            </div>
          </div>
        </ErrorDialog.Popup>
      </ErrorDialog.Root>

      <div className="media-surface media-controls">
        <Tooltip.Provider>
          <div className="media-button-group">
            <span className="media-button--play__wrapper">
              <BufferingIndicator
                render={(props) => (
                  <div {...props} className="media-buffering-indicator">
                    <SpinnerIcon className="media-icon" />
                  </div>
                )}
              />
              <Tooltip.Root side="top" boundary="viewport">
                <Tooltip.Trigger
                  render={
                    <PlayButton className="media-button--play" render={<Button />}>
                      <RestartIcon className="media-icon media-icon--restart" />
                      <PlayIcon className="media-icon media-icon--play" />
                      <PauseIcon className="media-icon media-icon--pause" />
                    </PlayButton>
                  }
                />
                <Tooltip.Popup className="media-surface media-tooltip">
                  <Tooltip.Label />
                  <Tooltip.Shortcut className="media-tooltip__kbd" />
                </Tooltip.Popup>
              </Tooltip.Root>
            </span>

            <Tooltip.Root side="top" boundary="viewport">
              <Tooltip.Trigger
                render={
                  <SeekButton seconds={-SEEK_TIME} className="media-button--seek" render={<Button />}>
                    <span className="media-icon__container">
                      <SeekIcon className="media-icon media-icon--seek media-icon--flipped" />
                      <span className="media-icon__label">{SEEK_TIME}</span>
                    </span>
                  </SeekButton>
                }
              />
              <Tooltip.Popup className="media-surface media-tooltip">
                <Tooltip.Label />
                <Tooltip.Shortcut className="media-tooltip__kbd" />
              </Tooltip.Popup>
            </Tooltip.Root>

            <Tooltip.Root side="top" boundary="viewport">
              <Tooltip.Trigger
                render={
                  <SeekButton seconds={SEEK_TIME} className="media-button--seek" render={<Button />}>
                    <span className="media-icon__container">
                      <SeekIcon className="media-icon media-icon--seek" />
                      <span className="media-icon__label">{SEEK_TIME}</span>
                    </span>
                  </SeekButton>
                }
              />
              <Tooltip.Popup className="media-surface media-tooltip">
                <Tooltip.Label />
                <Tooltip.Shortcut className="media-tooltip__kbd" />
              </Tooltip.Popup>
            </Tooltip.Root>
          </div>

          <div className="media-time-controls">
            <Time.Value type="current" className="media-time" />
            <TimeSlider.Root className="media-slider">
              <TimeSlider.Track className="media-slider__track">
                <TimeSlider.Fill className="media-slider__fill" />
                <TimeSlider.Buffer className="media-slider__buffer" />
              </TimeSlider.Track>
              <TimeSlider.Thumb className="media-slider__thumb" />
              <TimeSlider.Preview className="media-slider__preview">
                <TimeSlider.Value type="pointer" className="media-slider__value media-time" />
              </TimeSlider.Preview>
            </TimeSlider.Root>
            <Time.Value type="duration" className="media-time" />
          </div>

          <div className="media-button-group">
            <Menu.Root side="top" align="center" boundary="viewport">
              <PlaybackRateTrigger />
              <Menu.Content className="media-surface media-popover media-menu media-menu--playback-rate">
                <PlaybackRateRadioGroup />
              </Menu.Content>
            </Menu.Root>

            <VolumePopover />
          </div>
        </Tooltip.Provider>
      </div>

      {/* Hotkeys */}
      <Hotkey keys="Space" action="togglePaused" />
      <Hotkey keys="k" action="togglePaused" />
      <Hotkey keys="m" action="toggleMuted" />
      <Hotkey keys="ArrowRight" action="seekStep" value={5} />
      <Hotkey keys="ArrowLeft" action="seekStep" value={-5} />
      <Hotkey keys="l" action="seekStep" value={10} />
      <Hotkey keys="j" action="seekStep" value={-10} />
      <Hotkey keys="ArrowUp" action="volumeStep" value={0.05} />
      <Hotkey keys="ArrowDown" action="volumeStep" value={-0.05} />
      <Hotkey keys="0-9" action="seekToPercent" />
      <Hotkey keys="Home" action="seekToPercent" value={0} />
      <Hotkey keys="End" action="seekToPercent" value={100} />
      <Hotkey keys=">" action="speedUp" />
      <Hotkey keys="<" action="speedDown" />

      {/* Input Feedback */}
      <StatusAnnouncer />
    </Container>
  );
}
