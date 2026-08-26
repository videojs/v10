'use client';

import {
  audioText,
  captionsText,
  playbackRateText,
  qualityText,
  settingsText,
  speedText,
} from '@videojs/core/i18n/text/menu';
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
} from '@/icons';
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

import type { BaseVideoSkinProps } from '../types';

const SEEK_TIME = 10;
const TOP_STATUS_ACTIONS = ['toggleSubtitles', 'toggleFullscreen', 'togglePictureInPicture'] as const;
const CENTER_STATUS_ACTIONS = ['togglePaused'] as const;

/** Props for the packaged default video skin. */
export type VideoSkinProps = BaseVideoSkinProps;

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
  const volumeUnavailable = usePlayer((s) => s.volumeAvailability !== 'available');

  const muteButton = (
    <MuteButton className="media-button--mute" render={<Button />}>
      <VolumeOffIcon className="media-icon media-icon--volume-off" />
      <VolumeLowIcon className="media-icon media-icon--volume-low" />
      <VolumeHighIcon className="media-icon media-icon--volume-high" />
    </MuteButton>
  );

  if (volumeUnavailable) return muteButton;

  return (
    <Popover.Root openOnHover delay={200} closeDelay={100} side="top">
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

function MenuChevron({ flipped = false }: { flipped?: boolean }): ReactNode {
  return <ChevronIcon className={cn('media-icon media-menu__chevron', flipped ? 'media-icon--flipped' : undefined)} />;
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
            <Menu.Trigger aria-label={t(settingsText)} className="media-button--settings" render={<Button />}>
              <GearIcon className="media-icon media-icon--settings" />
            </Menu.Trigger>
          }
        />
        <Tooltip.Popup className="media-surface media-tooltip">
          <Tooltip.Label>{t(settingsText)}</Tooltip.Label>
        </Tooltip.Popup>
      </Tooltip.Root>
      <Menu.Popup className="media-surface media-popover media-menu media-menu--settings">
        <Menu.Content className="media-menu__content">
          {hasQuality ? (
            <Menu.Root>
              <Menu.Trigger
                className="media-menu__item media-menu__item--submenu"
                render={(props) => (
                  <div {...props}>
                    <QualityIcon className="media-icon" />
                    <span>{t(qualityText)}</span>
                    <span className="media-menu__hint">
                      <bdi dir="auto" className="media-menu__hint-label">
                        {quality.selectedLabel}
                      </bdi>
                      <MenuChevron />
                    </span>
                  </div>
                )}
              />
              <Menu.Content className="media-menu__panel">
                <Menu.Item className="media-menu__back">
                  <MenuChevron flipped />
                  {t(qualityText)}
                </Menu.Item>
                <Menu.Separator className="media-menu__separator" />
                <QualityRadioGroup
                  className="media-menu__group"
                  aria-label={t(qualityText)}
                  renderItem={(props, item) => (
                    <Menu.RadioItem {...props} className="media-menu__item">
                      <bdi dir="auto">
                        {item.label}
                        {item.tier ? <sup className="media-menu__tier">{item.tier}</sup> : null}
                      </bdi>
                      {item.badge ? <span className="media-badge">{item.badge}</span> : null}
                      <Menu.ItemIndicator checked={item.checked} forceMount className="media-menu__indicator">
                        <CheckIcon className="media-icon" />
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
                className="media-menu__item media-menu__item--submenu"
                render={(props) => (
                  <div {...props}>
                    <SpeechIcon className="media-icon" />
                    <span>{t(audioText)}</span>
                    <span className="media-menu__hint">
                      <bdi dir="auto" className="media-menu__hint-label">
                        {audioTrack.selectedLabel}
                      </bdi>
                      <MenuChevron />
                    </span>
                  </div>
                )}
              />
              <Menu.Content className="media-menu__panel">
                <Menu.Item className="media-menu__back">
                  <MenuChevron flipped />
                  {t(audioText)}
                </Menu.Item>
                <Menu.Separator className="media-menu__separator" />
                <AudioTrackRadioGroup
                  className="media-menu__group"
                  aria-label={t(audioText)}
                  renderItem={(props, item) => (
                    <Menu.RadioItem {...props} className="media-menu__item">
                      <bdi dir="auto">{item.label}</bdi>
                      <Menu.ItemIndicator checked={item.checked} forceMount className="media-menu__indicator">
                        <CheckIcon className="media-icon" />
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
                className="media-menu__item media-menu__item--submenu"
                render={(props) => (
                  <div {...props}>
                    <SpeedIcon className="media-icon" />
                    <span>{t(speedText)}</span>
                    <span className="media-menu__hint">
                      <bdi dir="auto" className="media-menu__hint-label">
                        {playbackRate.selectedLabel}
                      </bdi>
                      <MenuChevron />
                    </span>
                  </div>
                )}
              />
              <Menu.Content className="media-menu__panel">
                <Menu.Item className="media-menu__back">
                  <MenuChevron flipped />
                  {t(speedText)}
                </Menu.Item>
                <Menu.Separator className="media-menu__separator" />
                <PlaybackRateRadioGroup
                  className="media-menu__group"
                  aria-label={t(playbackRateText)}
                  renderItem={(props, item) => (
                    <Menu.RadioItem {...props} className="media-menu__item">
                      <bdi dir="auto">{item.label}</bdi>
                      <Menu.ItemIndicator checked={item.checked} forceMount className="media-menu__indicator">
                        <CheckIcon className="media-icon" />
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
                className="media-menu__item media-menu__item--submenu"
                render={(props) => (
                  <div {...props}>
                    <CaptionsOffIcon className="media-icon" />
                    <span>{t(captionsText)}</span>
                    <span className="media-menu__hint">
                      <bdi dir="auto" className="media-menu__hint-label">
                        {captions.selectedLabel}
                      </bdi>
                      <MenuChevron />
                    </span>
                  </div>
                )}
              />
              <Menu.Content className="media-menu__panel">
                <Menu.Item className="media-menu__back">
                  <MenuChevron flipped />
                  {t(captionsText)}
                </Menu.Item>
                <Menu.Separator className="media-menu__separator" />
                <CaptionsRadioGroup
                  className="media-menu__group"
                  aria-label={t(captionsText)}
                  renderItem={(props, item) => (
                    <Menu.RadioItem {...props} className="media-menu__item">
                      <bdi dir="auto">{item.label}</bdi>
                      <Menu.ItemIndicator checked={item.checked} forceMount className="media-menu__indicator">
                        <CheckIcon className="media-icon" />
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

function CastControl() {
  return (
    <Tooltip.Root side="top">
      <Tooltip.Trigger
        render={
          <CastButton className="media-button--cast" render={<Button />}>
            <CastEnterIcon className="media-icon media-icon--cast-enter" />
            <CastExitIcon className="media-icon media-icon--cast-exit" />
          </CastButton>
        }
      />
      <Tooltip.Popup className="media-surface media-tooltip">
        <Tooltip.Label />
        <Tooltip.Shortcut className="media-tooltip__kbd" />
      </Tooltip.Popup>
    </Tooltip.Root>
  );
}

function AirPlayControl() {
  return (
    <Tooltip.Root side="top">
      <Tooltip.Trigger
        render={
          <AirPlayButton className="media-button--airplay" render={<Button />}>
            <AirPlayEnterIcon className="media-icon media-icon--airplay-enter" />
            <AirPlayExitIcon className="media-icon media-icon--airplay-exit" />
          </AirPlayButton>
        }
      />
      <Tooltip.Popup className="media-surface media-tooltip">
        <Tooltip.Label />
        <Tooltip.Shortcut className="media-tooltip__kbd" />
      </Tooltip.Popup>
    </Tooltip.Root>
  );
}

function PiPControl() {
  return (
    <Tooltip.Root side="top">
      <Tooltip.Trigger
        render={
          <PiPButton className="media-button--pip" render={<Button />}>
            <PipEnterIcon className="media-icon media-icon--pip-enter" />
            <PipExitIcon className="media-icon media-icon--pip-exit" />
          </PiPButton>
        }
      />
      <Tooltip.Popup className="media-surface media-tooltip">
        <Tooltip.Label />
        <Tooltip.Shortcut className="media-tooltip__kbd" />
      </Tooltip.Popup>
    </Tooltip.Root>
  );
}
function FullscreenControl() {
  return (
    <Tooltip.Root side="top">
      <Tooltip.Trigger
        render={
          <FullscreenButton className="media-button--fullscreen" render={<Button />}>
            <FullscreenEnterIcon className="media-icon media-icon--fullscreen-enter" />
            <FullscreenExitIcon className="media-icon media-icon--fullscreen-exit" />
          </FullscreenButton>
        }
      />
      <Tooltip.Popup className="media-surface media-tooltip">
        <Tooltip.Label />
        <Tooltip.Shortcut className="media-tooltip__kbd" />
      </Tooltip.Popup>
    </Tooltip.Root>
  );
}

/**
 * Renders the packaged default video UI and the Container that owns player layout and fullscreen.
 *
 * Place a video media component in `children` and import `@videojs/react/video/skin.css` for the packaged styles.
 *
 * @see {@link https://videojs.org/docs/framework/react/how-to/customize-skins | Customize skins}
 */
export function VideoSkin(props: VideoSkinProps): ReactNode {
  const { children, className, renderPoster, style, ...rest } = props;

  return (
    <Container className={cn('media-default-skin media-default-skin--video', className)} style={style} {...rest}>
      {children}

      <Poster render={renderPoster} />

      <BufferingIndicator
        render={(props) => (
          <div {...props} className="media-buffering-indicator">
            <SpinnerIcon className="media-icon" />
          </div>
        )}
      />

      <ErrorDialog.Root>
        <ErrorDialog.Backdrop className="media-dialog__backdrop" />
        <ErrorDialog.Popup className="media-dialog__popup media-surface">
          <div className="media-dialog__content">
            <ErrorDialog.Title className="media-dialog__title"></ErrorDialog.Title>
            <ErrorDialog.Description className="media-dialog__description" />
          </div>
          <div className="media-dialog__actions">
            <ErrorDialog.Close className="media-button media-button--primary"></ErrorDialog.Close>
          </div>
        </ErrorDialog.Popup>
      </ErrorDialog.Root>

      <Controls.Root>
        <Controls.Backdrop className="media-controls__backdrop" />
        <Controls.Content className="media-surface media-controls media-controls--root">
          <Tooltip.Provider>
            <Controls.Group className="media-surface media-controls media-controls--primary">
              <div className="media-button-group">
                <Tooltip.Root side="top">
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

                <VolumePopover />
              </div>

              <div className="media-time-controls">
                <Time.Value type="current" className="media-time" />
                <TimeSlider.Root className="media-slider">
                  <TimeSlider.Chapters
                    className="media-slider__chapters"
                    renderChapter={(props) => (
                      <div {...props} className={cn(props.className, 'media-slider__chapter')}>
                        <TimeSlider.Track className="media-slider__track media-slider__chapter-track">
                          <TimeSlider.Buffer className="media-slider__buffer" />
                          <TimeSlider.Fill className="media-slider__fill" />
                        </TimeSlider.Track>
                      </div>
                    )}
                  />
                  <TimeSlider.Thumb className="media-slider__thumb" />

                  <TimeSlider.Preview overflow="visible" className="media-slider__preview">
                    <div className="media-surface media-thumbnail media-slider__thumbnail">
                      <Slider.Thumbnail className="media-thumbnail__image" />
                      <SpinnerIcon className="media-thumbnail__spinner media-icon" />
                    </div>
                    <div className="media-slider__value">
                      <TimeSlider.ChapterTitle className="media-slider__chapter-title" />
                      <TimeSlider.Value type="pointer" className="media-time" />
                    </div>
                  </TimeSlider.Preview>
                </TimeSlider.Root>
                <Time.Value toggle type="remaining" className="media-time" />
              </div>

              <div className="media-button-group">
                <Tooltip.Root side="top">
                  <Tooltip.Trigger
                    render={
                      <CaptionsButton className="media-button--captions" render={<Button />}>
                        <CaptionsOffIcon className="media-icon media-icon--captions-off" />
                        <CaptionsOnIcon className="media-icon media-icon--captions-on" />
                      </CaptionsButton>
                    }
                  />
                  <Tooltip.Popup className="media-surface media-tooltip">
                    <Tooltip.Label />
                    <Tooltip.Shortcut className="media-tooltip__kbd" />
                  </Tooltip.Popup>
                </Tooltip.Root>

                <SettingsMenu />
              </div>
            </Controls.Group>

            <Controls.Group className="media-surface media-controls media-controls--secondary">
              <div className="media-button-group">
                <CastControl />
                <AirPlayControl />
                <PiPControl />
                <FullscreenControl />
              </div>
            </Controls.Group>
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
      <StatusAnnouncer className="media-sr-only" />
      <div className="media-input-indicator">
        <VolumeIndicator.Root className="media-surface media-volume-indicator">
          <VolumeIndicator.Fill className="media-volume-indicator__content">
            <VolumeHighIcon className="media-icon media-icon--volume-high" />
            <VolumeLowIcon className="media-icon media-icon--volume-low" />
            <VolumeOffIcon className="media-icon media-icon--volume-off" />
            <VolumeIndicator.Value className="media-volume-indicator__value" />
          </VolumeIndicator.Fill>
        </VolumeIndicator.Root>

        <StatusIndicator.Root
          actions={TOP_STATUS_ACTIONS}
          className="media-surface media-status-indicator media-status-indicator--state"
        >
          <div className="media-status-indicator__content">
            <CaptionsOnIcon className="media-icon media-icon--captions-on" />
            <CaptionsOffIcon className="media-icon media-icon--captions-off" />
            <FullscreenEnterIcon className="media-icon media-icon--fullscreen-enter" />
            <FullscreenExitIcon className="media-icon media-icon--fullscreen-exit" />
            <PipEnterIcon className="media-icon media-icon--pip-enter" />
            <PipExitIcon className="media-icon media-icon--pip-exit" />
            <StatusIndicator.Value className="media-status-indicator__value" />
          </div>
        </StatusIndicator.Root>

        <SeekIndicator.Root className="media-seek-indicator">
          <ChevronIcon className="media-icon media-icon--seek" />
          <SeekIndicator.Value className="media-seek-indicator__value" />
        </SeekIndicator.Root>

        <StatusIndicator.Root
          actions={CENTER_STATUS_ACTIONS}
          className="media-status-indicator media-status-indicator--playback"
        >
          <PlayIcon className="media-icon media-icon--play" />
          <PauseIcon className="media-icon media-icon--pause" />
        </StatusIndicator.Root>
      </div>
    </Container>
  );
}
