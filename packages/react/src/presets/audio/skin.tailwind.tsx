import {
  button,
  buttonGroup,
  controls,
  error,
  icon,
  iconContainer,
  iconFlipped,
  iconState,
  menu,
  playButton,
  playbackRate,
  popup,
  root,
  seek,
  slider,
  time,
} from '@videojs/skins/default/tailwind/audio.tailwind';
import { cn } from '@videojs/utils/style';
import { type ComponentProps, forwardRef, type ReactNode } from 'react';
import { useTranslator } from '@/i18n/context';
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
import { Container } from '@/player/container';
import { usePlayer } from '@/player/context';
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
import type { AudioSkinProps } from './skin';

const SEEK_TIME = 10;

/* --------------------------------------- Components ---------------------------------------- */

const Button = forwardRef<HTMLButtonElement, ComponentProps<'button'>>(function Button({ className, ...props }, ref) {
  return (
    <button ref={ref} type="button" className={cn(button.base, button.subtle, button.icon, className)} {...props} />
  );
});

const SliderRoot = forwardRef<HTMLDivElement, ComponentProps<'div'>>(function SliderRoot({ className, ...props }, ref) {
  return <div ref={ref} className={cn(slider.root, className)} {...props} />;
});

const SliderTrack = forwardRef<HTMLDivElement, ComponentProps<'div'>>(function SliderTrack(
  { className, ...props },
  ref
) {
  return <div ref={ref} className={cn(slider.track, className)} {...props} />;
});

const SliderFill = forwardRef<HTMLDivElement, ComponentProps<'div'> & { type?: 'fill' | 'buffer' }>(function SliderFill(
  { type = 'fill', className, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(slider.fill.base, type === 'fill' ? slider.fill.fill : slider.fill.buffer, className)}
      {...props}
    />
  );
});

const SliderBuffer = forwardRef<HTMLDivElement, ComponentProps<'div'>>(function SliderBuffer(props, ref) {
  return <SliderFill type="buffer" ref={ref} {...props} />;
});

const SliderThumb = forwardRef<HTMLDivElement, ComponentProps<'div'> & { persistent?: boolean }>(function SliderThumb(
  { persistent, className, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(slider.thumb.base, persistent ? slider.thumb.persistent : slider.thumb.interactive, className)}
      {...props}
    />
  );
});

function VolumePopover(): ReactNode {
  const volumeUnsupported = usePlayer((s) => s.volumeAvailability === 'unsupported');

  const muteButton = (
    <MuteButton className={iconState.mute.button} render={<Button />}>
      <VolumeOffIcon className={cn(icon, iconState.mute.volumeOff)} />
      <VolumeLowIcon className={cn(icon, iconState.mute.volumeLow)} />
      <VolumeHighIcon className={cn(icon, iconState.mute.volumeHigh)} />
    </MuteButton>
  );

  if (volumeUnsupported) return muteButton;

  return (
    <Popover.Root openOnHover delay={200} closeDelay={100} side="top" boundary="viewport">
      <Popover.Trigger render={muteButton} />
      <Popover.Popup className={cn(popup.popover, popup.volume)}>
        <VolumeSlider.Root orientation="vertical" thumbAlignment="edge" render={<SliderRoot />}>
          <VolumeSlider.Track render={<SliderTrack />}>
            <VolumeSlider.Fill render={<SliderFill />} />
          </VolumeSlider.Track>
          <VolumeSlider.Thumb render={(props) => <SliderThumb persistent {...props} />} />
        </VolumeSlider.Root>
      </Popover.Popup>
    </Popover.Root>
  );
}

function PlaybackRateRadioGroup(): ReactNode {
  const t = useTranslator();
  const state = usePlaybackRateOptions();
  if (!state) return null;

  const { options, setValue, value } = state;

  return (
    <Menu.RadioGroup className={menu.group} value={value} onValueChange={setValue} aria-label={t('Playback rate')}>
      {options.map((option) => (
        <Menu.RadioItem key={option.value} className={menu.item} value={option.value} disabled={option.disabled}>
          <span>{option.label}</span>
          <Menu.ItemIndicator checked={option.value === value} forceMount className={menu.indicator}>
            <CheckIcon className={cn(icon, menu.icon)} />
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
      render={<PlaybackRateButton className={playbackRate.button} render={<Button />} />}
    />
  );
}

/* ------------------------------------------ Skin ------------------------------------------- */

export function AudioSkinTailwind(props: AudioSkinProps): ReactNode {
  const { children, className, ...rest } = props;

  return (
    <Container className={cn(root, className)} {...rest}>
      {children}

      <ErrorDialog.Root>
        <ErrorDialog.Popup className={error.root}>
          <div className={error.dialog}>
            <div className={error.content}>
              <ErrorDialog.Title className={error.title}></ErrorDialog.Title>
              <ErrorDialog.Description className={error.description} />
            </div>
            <div className={error.actions}>
              <ErrorDialog.Close className={cn(button.base, button.subtle)}></ErrorDialog.Close>
            </div>
          </div>
        </ErrorDialog.Popup>
      </ErrorDialog.Root>

      <div className={controls}>
        <Tooltip.Provider>
          <div className={buttonGroup}>
            <span className={playButton.wrapper}>
              <BufferingIndicator
                render={(props) => (
                  <div {...props} className={cn(playButton.bufferingRoot, props.className)}>
                    <SpinnerIcon className={icon} />
                  </div>
                )}
              />
              <Tooltip.Root side="top" boundary="viewport">
                <Tooltip.Trigger
                  render={
                    <PlayButton className={cn(iconState.play.button, playButton.control)} render={<Button />}>
                      <RestartIcon className={cn(icon, iconState.play.restart)} />
                      <PlayIcon className={cn(icon, iconState.play.play)} />
                      <PauseIcon className={cn(icon, iconState.play.pause)} />
                    </PlayButton>
                  }
                />
                <Tooltip.Popup className={cn(popup.tooltip)}>
                  <Tooltip.Label />
                  <Tooltip.Shortcut className={popup.tooltipShortcut} />
                </Tooltip.Popup>
              </Tooltip.Root>
            </span>

            <Tooltip.Root side="top" boundary="viewport">
              <Tooltip.Trigger
                render={
                  <SeekButton seconds={-SEEK_TIME} render={<Button />}>
                    <span className={iconContainer}>
                      <SeekIcon className={cn(icon, iconFlipped)} />
                      <span className={cn(seek.label, seek.labelBackward)}>{SEEK_TIME}</span>
                    </span>
                  </SeekButton>
                }
              />
              <Tooltip.Popup className={cn(popup.tooltip)}>
                <Tooltip.Label />
                <Tooltip.Shortcut className={popup.tooltipShortcut} />
              </Tooltip.Popup>
            </Tooltip.Root>

            <Tooltip.Root side="top" boundary="viewport">
              <Tooltip.Trigger
                render={
                  <SeekButton seconds={SEEK_TIME} render={<Button />}>
                    <span className={iconContainer}>
                      <SeekIcon className={icon} />
                      <span className={cn(seek.label, seek.labelForward)}>{SEEK_TIME}</span>
                    </span>
                  </SeekButton>
                }
              />
              <Tooltip.Popup className={cn(popup.tooltip)}>
                <Tooltip.Label />
                <Tooltip.Shortcut className={popup.tooltipShortcut} />
              </Tooltip.Popup>
            </Tooltip.Root>
          </div>

          <div className={time.group}>
            <Time.Value type="current" className={time.current} />
            <TimeSlider.Root render={<SliderRoot />}>
              <TimeSlider.Track render={<SliderTrack />}>
                <TimeSlider.Fill render={<SliderFill />} />
                <TimeSlider.Buffer render={<SliderBuffer />} />
              </TimeSlider.Track>
              <TimeSlider.Thumb render={<SliderThumb />} />
              <TimeSlider.Preview className={slider.preview}>
                <TimeSlider.Value type="pointer" className={slider.value} />
              </TimeSlider.Preview>
            </TimeSlider.Root>
            <Time.Value toggle type="remaining" className={time.duration} />
          </div>

          <div className={buttonGroup}>
            <Menu.Root side="top" align="center" boundary="viewport">
              <PlaybackRateTrigger />
              <Menu.Content className={cn(popup.popover, menu.root)}>
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
