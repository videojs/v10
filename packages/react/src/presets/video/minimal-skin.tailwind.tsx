'use client';

import {
  audioText,
  captionsText,
  playbackRateText,
  qualityText,
  settingsText,
  speedText,
} from '@videojs/core/i18n/text/menu';
import {
  badge,
  bufferingIndicator,
  button,
  buttonGroupEnd,
  buttonGroupStart,
  container,
  controls,
  dialog,
  icon,
  iconFlipped,
  iconState,
  inputIndicator,
  menu,
  controlsBackdrop,
  popup,
  poster,
  seekIndicator,
  slider,
  statusIndicator,
  thumbnail,
  time,
  volumeIndicator,
} from '@videojs/skins/minimal/tailwind/video.tailwind';
import { cn } from '@videojs/utils/style';
import { type ComponentProps, forwardRef, type ReactNode } from 'react';

import { useTranslator } from '@/i18n/context';
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
  SpeechIcon,
  SpeedIcon,
  SpinnerIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeOffIcon,
} from '@/icons/minimal';
import { Container } from '@/player/container';
import { usePlayer } from '@/player/context';
import { AirPlayButton } from '@/ui/airplay-button';
import { useAudioTrackOptions } from '@/ui/audio-track';
import { AudioTrackRadioGroup } from '@/ui/audio-track-radio-group';
import { BufferingIndicator } from '@/ui/buffering-indicator';
import { CaptionsButton } from '@/ui/captions-button';
import { CaptionsRadioGroup, useCaptionsOptions } from '@/ui/captions-radio-group';
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
import { PlaybackRateRadioGroup } from '@/ui/playback-rate-radio-group';
import { Popover } from '@/ui/popover';
import { Poster } from '@/ui/poster';
import { useQualityOptions } from '@/ui/quality';
import { QualityRadioGroup } from '@/ui/quality-radio-group';
import { SeekIndicator } from '@/ui/seek-indicator';
import { Slider } from '@/ui/slider';
import { StatusAnnouncer } from '@/ui/status-announcer';
import { StatusIndicator } from '@/ui/status-indicator';
import { Time } from '@/ui/time';
import { TimeSlider } from '@/ui/time-slider';
import { Tooltip } from '@/ui/tooltip';
import { VolumeIndicator } from '@/ui/volume-indicator';
import { VolumeSlider } from '@/ui/volume-slider';

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
  const volumeUnavailable = usePlayer((s) => s.volumeAvailability !== 'available');

  const muteButton = (
    <MuteButton className={iconState.mute.button} render={<Button />}>
      <VolumeOffIcon className={cn(icon, iconState.mute.volumeOff)} />
      <VolumeLowIcon className={cn(icon, iconState.mute.volumeLow)} />
      <VolumeHighIcon className={cn(icon, iconState.mute.volumeHigh)} />
    </MuteButton>
  );

  if (volumeUnavailable) {
    return (
      <Tooltip.Root side="top" delay={0} sticky>
        <Tooltip.Trigger render={muteButton} />
        <Tooltip.Popup className={cn(popup.tooltip)}>
          <Tooltip.Label />
          <Tooltip.Shortcut className={popup.tooltipShortcut} />
        </Tooltip.Popup>
      </Tooltip.Root>
    );
  }

  return (
    <Popover.Root openOnHover delay={200} closeDelay={100} side="right">
      <Tooltip.Root side="top" delay={0} sticky>
        <Tooltip.Trigger render={<Popover.Trigger render={muteButton} />} />
        <Tooltip.Popup className={cn(popup.tooltip)}>
          <Tooltip.Label />
          <Tooltip.Shortcut className={popup.tooltipShortcut} />
        </Tooltip.Popup>
      </Tooltip.Root>
      <Popover.Popup className={popup.volume}>
        <VolumeSlider.Root orientation="horizontal" thumbAlignment="edge" render={<SliderRoot />}>
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
  return (
    <ChevronIcon
      className={cn(icon, menu.icon, menu.chevron, flipped ? cn(iconFlipped, menu.backChevron) : undefined)}
    />
  );
}

function SettingsMenu(): ReactNode {
  const t = useTranslator();
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
      <Tooltip.Root side="top">
        <Tooltip.Trigger
          render={
            <Menu.Trigger
              aria-label={t(settingsText)}
              render={<Button className={cn(button.icon, menu.settingsTrigger)} />}
            >
              <GearIcon className={cn(icon, menu.settingsIcon)} />
            </Menu.Trigger>
          }
        />
        <Tooltip.Popup className={cn(popup.tooltip)}>
          <Tooltip.Label>{t(settingsText)}</Tooltip.Label>
        </Tooltip.Popup>
      </Tooltip.Root>
      <Menu.Popup className={menu.settings}>
        <Menu.Content className={menu.settingsContent}>
          {hasQuality ? (
            <Menu.Root>
              <Menu.Trigger
                className={menu.item}
                render={(props) => (
                  <div {...props}>
                    <QualityIcon className={cn(icon, menu.icon)} />
                    <span>{t(qualityText)}</span>
                    <span className={menu.hint}>
                      <bdi dir="auto" className={menu.hintLabel}>
                        {quality.selectedLabel}
                      </bdi>
                      <MenuChevron />
                    </span>
                  </div>
                )}
              />
              <Menu.Content className={menu.submenuPanel}>
                <Menu.Item className={menu.back}>
                  <MenuChevron flipped />
                  {t(qualityText)}
                </Menu.Item>
                <Menu.Separator className={menu.separator} />
                <QualityRadioGroup
                  className={menu.group}
                  aria-label={t(qualityText)}
                  renderItem={(props, item) => (
                    <Menu.RadioItem {...props} className={menu.item}>
                      <bdi dir="auto">
                        {item.label}
                        {item.tier ? <sup className={menu.tier}>{item.tier}</sup> : null}
                      </bdi>
                      {item.badge ? <span className={badge}>{item.badge}</span> : null}
                      <Menu.ItemIndicator checked={item.checked} forceMount className={menu.indicator}>
                        <CheckIcon className={cn(icon, menu.icon)} />
                      </Menu.ItemIndicator>
                    </Menu.RadioItem>
                  )}
                />
              </Menu.Content>
            </Menu.Root>
          ) : null}

          {hasAudioTrack ? (
            <Menu.Root>
              <Menu.Trigger
                className={menu.item}
                render={(props) => (
                  <div {...props}>
                    <SpeechIcon className={icon} />
                    <span>{t(audioText)}</span>
                    <span className={menu.hint}>
                      <bdi dir="auto" className={menu.hintLabel}>
                        {audioTrack.selectedLabel}
                      </bdi>
                      <MenuChevron />
                    </span>
                  </div>
                )}
              />
              <Menu.Content className={menu.submenuPanel}>
                <Menu.Item className={menu.back}>
                  <MenuChevron flipped />
                  {t(audioText)}
                </Menu.Item>
                <Menu.Separator className={menu.separator} />
                <AudioTrackRadioGroup
                  className={menu.group}
                  aria-label={t(audioText)}
                  renderItem={(props, item) => (
                    <Menu.RadioItem {...props} className={menu.item}>
                      <bdi dir="auto">{item.label}</bdi>
                      <Menu.ItemIndicator checked={item.checked} forceMount className={menu.indicator}>
                        <CheckIcon className={icon} />
                      </Menu.ItemIndicator>
                    </Menu.RadioItem>
                  )}
                />
              </Menu.Content>
            </Menu.Root>
          ) : null}

          {hasPlaybackRate ? (
            <Menu.Root>
              <Menu.Trigger
                className={menu.item}
                render={(props) => (
                  <div {...props}>
                    <SpeedIcon className={cn(icon, menu.icon)} />
                    <span>{t(speedText)}</span>
                    <span className={menu.hint}>
                      <bdi dir="auto" className={menu.hintLabel}>
                        {playbackRate.selectedLabel}
                      </bdi>
                      <MenuChevron />
                    </span>
                  </div>
                )}
              />
              <Menu.Content className={menu.submenuPanel}>
                <Menu.Item className={menu.back}>
                  <MenuChevron flipped />
                  {t(speedText)}
                </Menu.Item>
                <Menu.Separator className={menu.separator} />
                <PlaybackRateRadioGroup
                  className={menu.group}
                  aria-label={t(playbackRateText)}
                  renderItem={(props, item) => (
                    <Menu.RadioItem {...props} className={menu.item}>
                      <bdi dir="auto">{item.label}</bdi>
                      <Menu.ItemIndicator checked={item.checked} forceMount className={menu.indicator}>
                        <CheckIcon className={cn(icon, menu.icon)} />
                      </Menu.ItemIndicator>
                    </Menu.RadioItem>
                  )}
                />
              </Menu.Content>
            </Menu.Root>
          ) : null}

          {hasCaptions ? (
            <Menu.Root>
              <Menu.Trigger
                className={menu.item}
                render={(props) => (
                  <div {...props}>
                    <CaptionsOffIcon className={cn(icon, menu.icon)} />
                    <span>{t(captionsText)}</span>
                    <span className={menu.hint}>
                      <bdi dir="auto" className={menu.hintLabel}>
                        {captions.selectedLabel}
                      </bdi>
                      <MenuChevron />
                    </span>
                  </div>
                )}
              />
              <Menu.Content className={menu.submenuPanel}>
                <Menu.Item className={menu.back}>
                  <MenuChevron flipped />
                  {t(captionsText)}
                </Menu.Item>
                <Menu.Separator className={menu.separator} />
                <CaptionsRadioGroup
                  className={menu.group}
                  aria-label={t(captionsText)}
                  renderItem={(props, item) => (
                    <Menu.RadioItem {...props} className={menu.item}>
                      <bdi dir="auto">{item.label}</bdi>
                      <Menu.ItemIndicator checked={item.checked} forceMount className={menu.indicator}>
                        <CheckIcon className={cn(icon, menu.icon)} />
                      </Menu.ItemIndicator>
                    </Menu.RadioItem>
                  )}
                />
              </Menu.Content>
            </Menu.Root>
          ) : null}
        </Menu.Content>
      </Menu.Popup>
    </Menu.Root>
  );
}

/* ------------------------------------------ Skin ------------------------------------------- */

export function MinimalVideoSkinTailwind(props: MinimalVideoSkinProps): ReactNode {
  const { children, className, renderPoster, style, ...rest } = props;

  return (
    <Container className={cn(container(false), className)} style={style} {...rest}>
      {children}

      <Poster className={poster(false)} render={renderPoster} />

      <BufferingIndicator
        render={(props) => (
          <div {...props} className={bufferingIndicator}>
            <SpinnerIcon className={icon} />
          </div>
        )}
      />

      <ErrorDialog.Root>
        <ErrorDialog.Backdrop className={dialog.backdrop} />
        <ErrorDialog.Popup className={dialog.popup}>
          <div className={dialog.content}>
            <ErrorDialog.Title className={dialog.title}></ErrorDialog.Title>
            <ErrorDialog.Description className={dialog.description} />
          </div>
          <div className={dialog.actions}>
            <ErrorDialog.Close className={cn(button.base, button.primary)}></ErrorDialog.Close>
          </div>
        </ErrorDialog.Popup>
      </ErrorDialog.Root>

      <Controls.Root>
        <Controls.Backdrop className={controlsBackdrop} />
        <Controls.Content className={controls}>
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

              <VolumePopover />
            </div>

            <div className={time.controls}>
              <Time.Group className={time.group}>
                <Time.Value toggle type="current" className={time.current} />
                <Time.Separator className={time.separator} />
                <Time.Value type="duration" className={time.duration} />
              </Time.Group>

              <TimeSlider.Root render={<SliderRoot />}>
                <TimeSlider.Chapters
                  className={slider.chapters}
                  renderChapter={(props) => (
                    <div {...props} className={cn(props.className, slider.chapter.base)}>
                      <TimeSlider.Track render={<div className={slider.chapter.track} />}>
                        <TimeSlider.Buffer render={<div className={cn(slider.fill.base, slider.fill.buffer)} />} />
                        <TimeSlider.Fill render={<div className={cn(slider.fill.base, slider.fill.fill)} />} />
                      </TimeSlider.Track>
                    </div>
                  )}
                />
                <TimeSlider.Thumb render={<SliderThumb />} />
                <TimeSlider.Preview className={slider.preview}>
                  <div className={cn(thumbnail.root, slider.thumbnail)}>
                    <Slider.Thumbnail className={thumbnail.image} />
                    <SpinnerIcon className={cn(icon, thumbnail.spinner)} />
                  </div>
                  <div className={slider.value}>
                    <TimeSlider.ChapterTitle className={slider.chapterTitle} />
                    <TimeSlider.Value type="pointer" />
                  </div>
                </TimeSlider.Preview>
              </TimeSlider.Root>
            </div>

            <div className={cn(buttonGroupEnd, menu.settingsGroup)}>
              <Tooltip.Root side="top">
                <Tooltip.Trigger
                  render={
                    <CaptionsButton className={iconState.captions.button} render={<Button />}>
                      <CaptionsOffIcon className={cn(icon, iconState.captions.off)} />
                      <CaptionsOnIcon className={cn(icon, iconState.captions.on)} />
                    </CaptionsButton>
                  }
                />
                <Tooltip.Popup className={cn(popup.tooltip)}>
                  <Tooltip.Label />
                  <Tooltip.Shortcut className={popup.tooltipShortcut} />
                </Tooltip.Popup>
              </Tooltip.Root>

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
        </Controls.Content>
      </Controls.Root>

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

      {/* Input Indicators */}
      <StatusAnnouncer className="sr-only" />
      <div className={inputIndicator}>
        <VolumeIndicator.Root className={volumeIndicator.root}>
          <VolumeIndicator.Fill className={volumeIndicator.content}>
            <VolumeHighIcon className={cn(volumeIndicator.icon.base, volumeIndicator.icon.high)} />
            <VolumeLowIcon className={cn(volumeIndicator.icon.base, volumeIndicator.icon.low)} />
            <VolumeOffIcon className={cn(volumeIndicator.icon.base, volumeIndicator.icon.off)} />
            <div aria-hidden="true" className={volumeIndicator.progress} />
            <VolumeIndicator.Value className={volumeIndicator.value} />
          </VolumeIndicator.Fill>
        </VolumeIndicator.Root>

        <StatusIndicator.Root actions={TOP_STATUS_ACTIONS} className={statusIndicator.root}>
          <div className={statusIndicator.content}>
            <CaptionsOnIcon className={cn(statusIndicator.icon.base, statusIndicator.icon.captionsOn)} />
            <CaptionsOffIcon className={cn(statusIndicator.icon.base, statusIndicator.icon.captionsOff)} />
            <FullscreenEnterIcon className={cn(statusIndicator.icon.base, statusIndicator.icon.fullscreenEnter)} />
            <FullscreenExitIcon className={cn(statusIndicator.icon.base, statusIndicator.icon.fullscreenExit)} />
            <PipEnterIcon className={cn(statusIndicator.icon.base, statusIndicator.icon.pipEnter)} />
            <PipExitIcon className={cn(statusIndicator.icon.base, statusIndicator.icon.pipExit)} />
            <StatusIndicator.Value className={statusIndicator.value} />
          </div>
        </StatusIndicator.Root>

        <SeekIndicator.Root className={seekIndicator.root}>
          <ChevronIcon className={seekIndicator.icon} />
          <SeekIndicator.Value className={seekIndicator.value} />
        </SeekIndicator.Root>

        <StatusIndicator.Root actions={CENTER_STATUS_ACTIONS} className={statusIndicator.playback.root}>
          <PlayIcon className={cn(statusIndicator.playback.icon.base, statusIndicator.playback.icon.play)} />
          <PauseIcon className={cn(statusIndicator.playback.icon.base, statusIndicator.playback.icon.pause)} />
        </StatusIndicator.Root>
      </div>
    </Container>
  );
}
