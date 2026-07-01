import {
  badge,
  bufferingIndicator,
  button,
  buttonGroupEnd,
  buttonGroupStart,
  controls,
  error,
  icon,
  iconContainer,
  iconFlipped,
  iconState,
  inputFeedback,
  menu,
  overlay,
  popup,
  poster,
  root,
  seek,
  slider,
  thumbnail,
  time,
} from '@videojs/skins/minimal/tailwind/video.tailwind';
import { isString } from '@videojs/utils/predicate';
import { cn } from '@videojs/utils/style';
import { type ComponentProps, type CSSProperties, forwardRef, type ReactNode } from 'react';
import {
  AirPlayEnterIcon,
  AirPlayExitIcon,
  CaptionsOffIcon,
  CaptionsOnIcon,
  CastEnterIcon,
  CastExitIcon,
  CheckIcon,
  ChevronIcon,
  FullscreenEnterIcon,
  FullscreenExitIcon,
  GearIcon,
  PauseIcon,
  PipEnterIcon,
  PipExitIcon,
  PlayIcon,
  QualityIcon,
  RestartIcon,
  SeekIcon,
  SpeechIcon,
  SpeedIcon,
  SpinnerIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeOffIcon,
} from '@/icons/minimal';
import { Container, usePlayer } from '@/player/context';
import { AirPlayButton } from '@/ui/airplay-button';
import { useAudioTrackOptions } from '@/ui/audio-track';
import { BufferingIndicator } from '@/ui/buffering-indicator';
import { useCaptionsOptions } from '@/ui/captions-radio-group';
import { CastButton } from '@/ui/cast-button';
import { Controls } from '@/ui/controls';
import { ErrorDialog } from '@/ui/error-dialog';
import { FullscreenButton } from '@/ui/fullscreen-button';
import { Gesture } from '@/ui/gesture';
import { Hotkey } from '@/ui/hotkey';
import { Menu } from '@/ui/menu';
import { MuteButton } from '@/ui/mute-button';
import { PiPButton } from '@/ui/pip-button';
import { PlayButton } from '@/ui/play-button';
import { usePlaybackRateOptions } from '@/ui/playback-rate';
import { Popover } from '@/ui/popover';
import { Poster } from '@/ui/poster';
import { useQualityOptions } from '@/ui/quality';
import { SeekButton } from '@/ui/seek-button';
import { SeekIndicator } from '@/ui/seek-indicator';
import { Slider } from '@/ui/slider';
import { StatusAnnouncer } from '@/ui/status-announcer';
import { StatusIndicator } from '@/ui/status-indicator';
import { Time } from '@/ui/time';
import { TimeSlider } from '@/ui/time-slider';
import { Tooltip } from '@/ui/tooltip';
import { VolumeIndicator } from '@/ui/volume-indicator';
import { VolumeSlider } from '@/ui/volume-slider';
import { isRenderProp } from '@/utils/use-render';
import type { MinimalVideoSkinProps } from './minimal-skin';

const SEEK_TIME = 10;
const TOP_STATUS_ACTIONS = ['toggleSubtitles', 'toggleFullscreen', 'togglePictureInPicture'] as const;
const CENTER_STATUS_ACTIONS = ['togglePaused'] as const;

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
      className={cn(slider.thumb.base, persistent ? undefined : slider.thumb.interactive, className)}
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
    <Popover.Root openOnHover delay={200} closeDelay={100} side="top">
      <Popover.Trigger render={muteButton} />
      <Popover.Popup className={cn(popup.volume)}>
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

function MenuChevron({ flipped = false }: { flipped?: boolean }): ReactNode {
  return <ChevronIcon className={cn(icon, menu.icon, menu.chevron, flipped ? iconFlipped : undefined)} />;
}

function SettingsMenu(): ReactNode {
  const playbackRate = usePlaybackRateOptions();
  const quality = useQualityOptions();
  const audioTrack = useAudioTrackOptions();
  const captions = useCaptionsOptions();
  const hasPlaybackRate = playbackRate?.state.availability === 'available';
  const hasQuality = quality?.state.availability === 'available';
  const hasAudioTrack = audioTrack?.state.availability === 'available';
  const hasCaptions = captions?.state.availability === 'available';

  if (!hasPlaybackRate && !hasQuality && !hasAudioTrack && !hasCaptions) return null;

  return (
    <Menu.Root side="top" align="center">
      <Menu.Trigger
        aria-label="Settings"
        className="media-button--settings"
        render={<Button className={cn(button.icon, menu.settingsTrigger)} />}
      >
        <GearIcon className={cn(icon, menu.settingsIcon)} />
      </Menu.Trigger>
      <Menu.Content className={menu.settings}>
        <Menu.View className={menu.rootView}>
          <div className={menu.group}>
            {hasQuality ? (
              <Menu.Root>
                <Menu.Trigger
                  type="quality"
                  className={cn(menu.item, 'media-menu__item--submenu')}
                  render={(props) => (
                    <div {...props}>
                      <QualityIcon className={cn(icon, menu.icon)} />
                      <span>Quality</span>
                      <span className={menu.hint}>
                        <Menu.ItemValue className={menu.hintLabel} />
                        <MenuChevron />
                      </span>
                    </div>
                  )}
                />
                <Menu.Content className={menu.submenuPanel}>
                  <Menu.Back className={menu.back}>
                    <MenuChevron flipped />
                    Quality
                  </Menu.Back>
                  <Menu.Separator className={menu.separator} />
                  <Menu.RadioGroup
                    className={menu.group}
                    value={quality.value}
                    onValueChange={quality.setValue}
                    aria-label="Quality"
                  >
                    {quality.options.map((option) => (
                      <Menu.RadioItem
                        key={option.value}
                        className={menu.item}
                        value={option.value}
                        disabled={option.disabled}
                      >
                        <span>
                          {option.label}
                          {option.tier ? <sup className={menu.tier}>{option.tier}</sup> : null}
                        </span>
                        {option.badge ? <span className={badge}>{option.badge}</span> : null}
                        <Menu.ItemIndicator
                          checked={option.value === quality.value}
                          forceMount
                          className={menu.indicator}
                        >
                          <CheckIcon className={cn(icon, menu.icon)} />
                        </Menu.ItemIndicator>
                      </Menu.RadioItem>
                    ))}
                  </Menu.RadioGroup>
                </Menu.Content>
              </Menu.Root>
            ) : null}

            {hasAudioTrack ? (
              <Menu.Root>
                <Menu.Trigger
                  type="audio-track"
                  className={cn(menu.item, 'media-menu__item--submenu')}
                  render={(props) => (
                    <div {...props}>
                      <SpeechIcon className={icon} />
                      <span>Audio</span>
                      <span className={menu.hint}>
                        <Menu.ItemValue className={menu.hintLabel} />
                        <MenuChevron />
                      </span>
                    </div>
                  )}
                />
                <Menu.Content className={menu.submenuPanel}>
                  <Menu.Back className={menu.back}>
                    <MenuChevron flipped />
                    Audio
                  </Menu.Back>
                  <Menu.Separator className={menu.separator} />
                  <Menu.RadioGroup
                    className={menu.group}
                    value={audioTrack.value}
                    onValueChange={audioTrack.setValue}
                    aria-label="Audio tracks"
                  >
                    {audioTrack.options.map((option) => (
                      <Menu.RadioItem
                        key={option.value}
                        className={menu.item}
                        value={option.value}
                        disabled={option.disabled}
                      >
                        <span>{option.label}</span>
                        <Menu.ItemIndicator
                          checked={option.value === audioTrack.value}
                          forceMount
                          className={menu.indicator}
                        >
                          <CheckIcon className={icon} />
                        </Menu.ItemIndicator>
                      </Menu.RadioItem>
                    ))}
                  </Menu.RadioGroup>
                </Menu.Content>
              </Menu.Root>
            ) : null}

            {hasPlaybackRate ? (
              <Menu.Root>
                <Menu.Trigger
                  type="playback-rate"
                  className={cn(menu.item, 'media-menu__item--submenu')}
                  render={(props) => (
                    <div {...props}>
                      <SpeedIcon className={cn(icon, menu.icon)} />
                      <span>Speed</span>
                      <span className={menu.hint}>
                        <Menu.ItemValue className={menu.hintLabel} />
                        <MenuChevron />
                      </span>
                    </div>
                  )}
                />
                <Menu.Content className={menu.submenuPanel}>
                  <Menu.Back className={menu.back}>
                    <MenuChevron flipped />
                    Speed
                  </Menu.Back>
                  <Menu.Separator className={menu.separator} />
                  <Menu.RadioGroup
                    className={menu.group}
                    value={playbackRate.value}
                    onValueChange={playbackRate.setValue}
                    aria-label="Playback rate"
                  >
                    {playbackRate.options.map((option) => (
                      <Menu.RadioItem
                        key={option.value}
                        className={menu.item}
                        value={option.value}
                        disabled={option.disabled}
                      >
                        <span>{option.label}</span>
                        <Menu.ItemIndicator
                          checked={option.value === playbackRate.value}
                          forceMount
                          className={menu.indicator}
                        >
                          <CheckIcon className={cn(icon, menu.icon)} />
                        </Menu.ItemIndicator>
                      </Menu.RadioItem>
                    ))}
                  </Menu.RadioGroup>
                </Menu.Content>
              </Menu.Root>
            ) : null}

            {hasCaptions ? (
              <Menu.Root>
                <Menu.Trigger
                  type="captions"
                  className={cn(menu.item, 'media-menu__item--submenu')}
                  render={(props) => (
                    <div {...props}>
                      <CaptionsOffIcon className={cn(icon, menu.icon)} />
                      <span>Captions</span>
                      <span className={menu.hint}>
                        <Menu.ItemValue className={menu.hintLabel} />
                        <MenuChevron />
                      </span>
                    </div>
                  )}
                />
                <Menu.Content className={menu.submenuPanel}>
                  <Menu.Back className={menu.back}>
                    <MenuChevron flipped />
                    Captions
                  </Menu.Back>
                  <Menu.Separator className={menu.separator} />
                  <Menu.RadioGroup
                    className={menu.group}
                    value={captions.value}
                    onValueChange={captions.setValue}
                    aria-label="Captions"
                  >
                    {captions.options.map((option) => (
                      <Menu.RadioItem
                        key={option.value}
                        className={menu.item}
                        value={option.value}
                        disabled={option.disabled}
                      >
                        <span>{option.label}</span>
                        <Menu.ItemIndicator
                          checked={option.value === captions.value}
                          forceMount
                          className={menu.indicator}
                        >
                          <CheckIcon className={cn(icon, menu.icon)} />
                        </Menu.ItemIndicator>
                      </Menu.RadioItem>
                    ))}
                  </Menu.RadioGroup>
                </Menu.Content>
              </Menu.Root>
            ) : null}
          </div>
        </Menu.View>
      </Menu.Content>
    </Menu.Root>
  );
}

/* ------------------------------------------ Skin ------------------------------------------- */

export function MinimalVideoSkinTailwind(props: MinimalVideoSkinProps): ReactNode {
  const { children, className, poster: posterProp, placeholder, style, ...rest } = props;

  const containerStyle = placeholder
    ? ({ '--media-poster-placeholder': `url(${placeholder})`, ...style } as CSSProperties)
    : style;

  return (
    <Container className={cn(root(false), className)} style={containerStyle} {...rest}>
      {children}

      {posterProp && (
        <Poster
          src={isString(posterProp) ? posterProp : undefined}
          render={isRenderProp(posterProp) ? posterProp : undefined}
          className={poster(false)}
        />
      )}

      <BufferingIndicator
        render={(props) => (
          <div {...props} className={bufferingIndicator}>
            <SpinnerIcon className={icon} />
          </div>
        )}
      />

      <ErrorDialog.Root>
        <ErrorDialog.Popup className={error.root}>
          <div className={error.dialog}>
            <div className={error.content}>
              <ErrorDialog.Title className={error.title}>Something went wrong.</ErrorDialog.Title>
              <ErrorDialog.Description className={error.description} />
            </div>
            <div className={error.actions}>
              <ErrorDialog.Close className={cn(button.base, button.primary)}>OK</ErrorDialog.Close>
            </div>
          </div>
        </ErrorDialog.Popup>
      </ErrorDialog.Root>

      <Controls.Root
        data-controls="" // Used as a hook for Tailwind has-[] styles
        className={controls}
      >
        <Tooltip.Provider>
          <div className={buttonGroupStart}>
            <Tooltip.Root side="top">
              <Tooltip.Trigger
                render={
                  <PlayButton className={iconState.play.button} render={<Button />}>
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

            <Tooltip.Root side="top">
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

            <Tooltip.Root side="top">
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

          <div className={time.controls}>
            <Time.Group className={time.group}>
              <Time.Value toggle type="current" className={time.current} />
              <Time.Separator className={time.separator} />
              <Time.Value type="duration" className={time.duration} />
            </Time.Group>

            <TimeSlider.Root render={<SliderRoot />}>
              <TimeSlider.Track render={<SliderTrack />}>
                <TimeSlider.Fill render={<SliderFill />} />
                <TimeSlider.Buffer render={<SliderBuffer />} />
              </TimeSlider.Track>
              <TimeSlider.Thumb render={<SliderThumb />} />
              <div className={thumbnail.root}>
                <div className={thumbnail.imageWrapper}>
                  <Slider.Thumbnail className={thumbnail.image} />
                </div>
                <TimeSlider.Value type="pointer" className={thumbnail.time} />
                <SpinnerIcon className={cn(icon, thumbnail.spinner)} />
              </div>
              <TimeSlider.Preview className={slider.preview}>
                <TimeSlider.Value type="pointer" className={slider.value} />
              </TimeSlider.Preview>
            </TimeSlider.Root>
          </div>

          <div className={cn(buttonGroupEnd, menu.settingsGroup)}>
            <VolumePopover />

            <SettingsMenu />

            <Tooltip.Root side="top">
              <Tooltip.Trigger
                render={
                  <CastButton className={iconState.cast.button} render={<Button />}>
                    <CastEnterIcon className={cn(icon, iconState.cast.enter)} />
                    <CastExitIcon className={cn(icon, iconState.cast.exit)} />
                  </CastButton>
                }
              />
              <Tooltip.Popup className={cn(popup.tooltip)}>
                <Tooltip.Label />
                <Tooltip.Shortcut className={popup.tooltipShortcut} />
              </Tooltip.Popup>
            </Tooltip.Root>

            <Tooltip.Root side="top">
              <Tooltip.Trigger
                render={
                  <AirPlayButton className={iconState.airplay.button} render={<Button />}>
                    <AirPlayEnterIcon className={cn(icon, iconState.airplay.enter)} />
                    <AirPlayExitIcon className={cn(icon, iconState.airplay.exit)} />
                  </AirPlayButton>
                }
              />
              <Tooltip.Popup className={cn(popup.tooltip)}>
                <Tooltip.Label />
                <Tooltip.Shortcut className={popup.tooltipShortcut} />
              </Tooltip.Popup>
            </Tooltip.Root>

            <Tooltip.Root side="top">
              <Tooltip.Trigger
                render={
                  <PiPButton className={iconState.pip.button} render={<Button />}>
                    <PipEnterIcon className={cn(icon, iconState.pip.off)} />
                    <PipExitIcon className={cn(icon, iconState.pip.on)} />
                  </PiPButton>
                }
              />
              <Tooltip.Popup className={cn(popup.tooltip)}>
                <Tooltip.Label />
                <Tooltip.Shortcut className={popup.tooltipShortcut} />
              </Tooltip.Popup>
            </Tooltip.Root>

            <Tooltip.Root side="top">
              <Tooltip.Trigger
                render={
                  <FullscreenButton className={iconState.fullscreen.button} render={<Button />}>
                    <FullscreenEnterIcon className={cn(icon, iconState.fullscreen.enter)} />
                    <FullscreenExitIcon className={cn(icon, iconState.fullscreen.exit)} />
                  </FullscreenButton>
                }
              />
              <Tooltip.Popup className={cn(popup.tooltip)}>
                <Tooltip.Label />
                <Tooltip.Shortcut className={popup.tooltipShortcut} />
              </Tooltip.Popup>
            </Tooltip.Root>
          </div>
        </Tooltip.Provider>
      </Controls.Root>

      <div className={overlay} />

      {/* Hotkeys */}
      <Hotkey keys="Space" action="togglePaused" />
      <Hotkey keys="k" action="togglePaused" />
      <Hotkey keys="m" action="toggleMuted" />
      <Hotkey keys="f" action="toggleFullscreen" />
      <Hotkey keys="c" action="toggleSubtitles" />
      <Hotkey keys="i" action="togglePictureInPicture" />
      <Hotkey keys="ArrowRight" action="seekStep" value={SEEK_TIME / 2} />
      <Hotkey keys="ArrowLeft" action="seekStep" value={-(SEEK_TIME / 2)} />
      <Hotkey keys="l" action="seekStep" value={SEEK_TIME} />
      <Hotkey keys="j" action="seekStep" value={-SEEK_TIME} />
      <Hotkey keys="ArrowUp" action="volumeStep" value={0.05} />
      <Hotkey keys="ArrowDown" action="volumeStep" value={-0.05} />
      <Hotkey keys="0-9" action="seekToPercent" />
      <Hotkey keys="Home" action="seekToPercent" value={0} />
      <Hotkey keys="End" action="seekToPercent" value={100} />
      <Hotkey keys=">" action="speedUp" />
      <Hotkey keys="<" action="speedDown" />

      {/* Gestures */}
      <Gesture type="tap" action="togglePaused" pointer="mouse" region="center" />
      <Gesture type="tap" action="toggleControls" pointer="touch" />
      <Gesture type="doubletap" action="seekStep" value={-SEEK_TIME} region="left" />
      <Gesture type="doubletap" action="toggleFullscreen" region="center" />
      <Gesture type="doubletap" action="seekStep" value={SEEK_TIME} region="right" />

      {/* Input Feedback */}
      <StatusAnnouncer />
      <div className={inputFeedback.root}>
        <VolumeIndicator.Root
          className={cn(inputFeedback.island.base, inputFeedback.island.volume, inputFeedback.island.shownVolume)}
        >
          <VolumeIndicator.Fill data-feedback-island-content="" className={inputFeedback.island.content}>
            <VolumeHighIcon className={cn(inputFeedback.island.icon, inputFeedback.island.shownVolumeHigh)} />
            <VolumeLowIcon className={cn(inputFeedback.island.icon, inputFeedback.island.shownVolumeLow)} />
            <VolumeOffIcon className={cn(inputFeedback.island.icon, inputFeedback.island.shownVolumeOff)} />
            <div aria-hidden="true" className={inputFeedback.island.volumeProgress} />
            <VolumeIndicator.Value className={inputFeedback.island.value} />
          </VolumeIndicator.Fill>
        </VolumeIndicator.Root>

        <StatusIndicator.Root
          actions={TOP_STATUS_ACTIONS}
          className={cn(inputFeedback.island.base, inputFeedback.island.shownStatus)}
        >
          <div className={inputFeedback.island.content}>
            <CaptionsOnIcon className={cn(inputFeedback.island.icon, inputFeedback.island.shownCaptionsOn)} />
            <CaptionsOffIcon className={cn(inputFeedback.island.icon, inputFeedback.island.shownCaptionsOff)} />
            <FullscreenEnterIcon className={cn(inputFeedback.island.icon, inputFeedback.island.shownFullscreenEnter)} />
            <FullscreenExitIcon className={cn(inputFeedback.island.icon, inputFeedback.island.shownFullscreenExit)} />
            <PipEnterIcon className={cn(inputFeedback.island.icon, inputFeedback.island.shownPipEnter)} />
            <PipExitIcon className={cn(inputFeedback.island.icon, inputFeedback.island.shownPipExit)} />
            <StatusIndicator.Value className={inputFeedback.island.value} />
          </div>
        </StatusIndicator.Root>

        <SeekIndicator.Root className={inputFeedback.bubble.base}>
          <ChevronIcon className={cn(inputFeedback.bubble.icon, inputFeedback.bubble.shownSeek)} />
          <SeekIndicator.Value className={inputFeedback.bubble.time} />
        </SeekIndicator.Root>

        <StatusIndicator.Root actions={CENTER_STATUS_ACTIONS} className={inputFeedback.bubble.base}>
          <PlayIcon className={cn(inputFeedback.bubble.icon, inputFeedback.bubble.shownPlay)} />
          <PauseIcon className={cn(inputFeedback.bubble.icon, inputFeedback.bubble.shownPause)} />
        </StatusIndicator.Root>
      </div>
    </Container>
  );
}
