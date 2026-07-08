import { isString } from '@videojs/utils/predicate';
import { cn } from '@videojs/utils/style';
import { type ComponentProps, type CSSProperties, forwardRef, type ReactNode } from 'react';
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
  SeekIcon,
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
import type { BaseVideoSkinProps } from '../types';

const SEEK_TIME = 10;
const TOP_STATUS_ACTIONS = ['toggleSubtitles', 'toggleFullscreen', 'togglePictureInPicture'] as const;
const CENTER_STATUS_ACTIONS = ['togglePaused'] as const;

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
      <Menu.Trigger aria-label={t('Settings')} className="media-button--settings" render={<Button />}>
        <GearIcon className="media-icon media-icon--settings" />
      </Menu.Trigger>
      <Menu.Content className="media-surface media-popover media-menu media-menu--settings">
        <Menu.View className="media-menu__panel">
          <div className="media-menu__group">
            {hasQuality ? (
              <Menu.Root>
                <Menu.Trigger
                  type="quality"
                  className="media-menu__item media-menu__item--submenu"
                  render={(props) => (
                    <div {...props}>
                      <QualityIcon className="media-icon" />
                      <span>{t('Quality')}</span>
                      <span className="media-menu__hint">
                        <Menu.ItemValue className="media-menu__hint-label" />
                        <MenuChevron />
                      </span>
                    </div>
                  )}
                />
                <Menu.Content className="media-menu__panel">
                  <Menu.Back className="media-menu__back">
                    <MenuChevron flipped />
                    {t('Quality')}
                  </Menu.Back>
                  <Menu.Separator className="media-menu__separator" />
                  <Menu.RadioGroup
                    className="media-menu__group"
                    value={quality.value}
                    onValueChange={quality.setValue}
                    aria-label={t('Quality')}
                  >
                    {quality.options.map((option) => (
                      <Menu.RadioItem
                        key={option.value}
                        className="media-menu__item"
                        value={option.value}
                        disabled={option.disabled}
                      >
                        <span>
                          {option.label}
                          {option.tier ? <sup className="media-menu__tier">{option.tier}</sup> : null}
                        </span>
                        {option.badge ? <span className="media-badge">{option.badge}</span> : null}
                        <Menu.ItemIndicator
                          checked={option.value === quality.value}
                          forceMount
                          className="media-menu__indicator"
                        >
                          <CheckIcon className="media-icon" />
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
                  className="media-menu__item media-menu__item--submenu"
                  render={(props) => (
                    <div {...props}>
                      <SpeechIcon className="media-icon" />
                      <span>{t('Audio')}</span>
                      <span className="media-menu__hint">
                        <Menu.ItemValue className="media-menu__hint-label" />
                        <MenuChevron />
                      </span>
                    </div>
                  )}
                />
                <Menu.Content className="media-menu__panel">
                  <Menu.Back className="media-menu__back">
                    <MenuChevron flipped />
                    {t('Audio')}
                  </Menu.Back>
                  <Menu.Separator className="media-menu__separator" />
                  <Menu.RadioGroup
                    className="media-menu__group"
                    value={audioTrack.value}
                    onValueChange={audioTrack.setValue}
                    aria-label={t('Audio')}
                  >
                    {audioTrack.options.map((option) => (
                      <Menu.RadioItem
                        key={option.value}
                        className="media-menu__item"
                        value={option.value}
                        disabled={option.disabled}
                      >
                        <span>{option.label}</span>
                        <Menu.ItemIndicator
                          checked={option.value === audioTrack.value}
                          forceMount
                          className="media-menu__indicator"
                        >
                          <CheckIcon className="media-icon" />
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
                  className="media-menu__item media-menu__item--submenu"
                  render={(props) => (
                    <div {...props}>
                      <SpeedIcon className="media-icon" />
                      <span>{t('Speed')}</span>
                      <span className="media-menu__hint">
                        <Menu.ItemValue className="media-menu__hint-label" />
                        <MenuChevron />
                      </span>
                    </div>
                  )}
                />
                <Menu.Content className="media-menu__panel">
                  <Menu.Back className="media-menu__back">
                    <MenuChevron flipped />
                    {t('Speed')}
                  </Menu.Back>
                  <Menu.Separator className="media-menu__separator" />
                  <Menu.RadioGroup
                    className="media-menu__group"
                    value={playbackRate.value}
                    onValueChange={playbackRate.setValue}
                    aria-label={t('Playback rate')}
                  >
                    {playbackRate.options.map((option) => (
                      <Menu.RadioItem
                        key={option.value}
                        className="media-menu__item"
                        value={option.value}
                        disabled={option.disabled}
                      >
                        <span>{option.label}</span>
                        <Menu.ItemIndicator
                          checked={option.value === playbackRate.value}
                          forceMount
                          className="media-menu__indicator"
                        >
                          <CheckIcon className="media-icon" />
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
                  className="media-menu__item media-menu__item--submenu"
                  render={(props) => (
                    <div {...props}>
                      <CaptionsOffIcon className="media-icon" />
                      <span>{t('Captions')}</span>
                      <span className="media-menu__hint">
                        <Menu.ItemValue className="media-menu__hint-label" />
                        <MenuChevron />
                      </span>
                    </div>
                  )}
                />
                <Menu.Content className="media-menu__panel">
                  <Menu.Back className="media-menu__back">
                    <MenuChevron flipped />
                    {t('Captions')}
                  </Menu.Back>
                  <Menu.Separator className="media-menu__separator" />
                  <Menu.RadioGroup
                    className="media-menu__group"
                    value={captions.value}
                    onValueChange={captions.setValue}
                    aria-label={t('Captions')}
                  >
                    {captions.options.map((option) => (
                      <Menu.RadioItem
                        key={option.value}
                        className="media-menu__item"
                        value={option.value}
                        disabled={option.disabled}
                      >
                        <span>{option.label}</span>
                        <Menu.ItemIndicator
                          checked={option.value === captions.value}
                          forceMount
                          className="media-menu__indicator"
                        >
                          <CheckIcon className="media-icon" />
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

export function VideoSkin(props: VideoSkinProps): ReactNode {
  const { children, className, poster, placeholder, style, ...rest } = props;

  const containerStyle = placeholder
    ? ({ '--media-poster-placeholder': `url(${placeholder})`, ...style } as CSSProperties)
    : style;

  return (
    <Container
      className={cn('media-default-skin media-default-skin--video', className)}
      style={containerStyle}
      {...rest}
    >
      {children}

      {poster && (
        <Poster src={isString(poster) ? poster : undefined} render={isRenderProp(poster) ? poster : undefined} />
      )}

      <BufferingIndicator
        render={(props) => (
          <div {...props} className="media-buffering-indicator">
            <SpinnerIcon className="media-icon" />
          </div>
        )}
      />

      <ErrorDialog.Root>
        <ErrorDialog.Popup className="media-error">
          <div className="media-error__dialog media-surface">
            <div className="media-error__content">
              <ErrorDialog.Title className="media-error__title"></ErrorDialog.Title>
              <ErrorDialog.Description className="media-error__description" />
            </div>
            <div className="media-error__actions">
              <ErrorDialog.Close className="media-button media-button--primary"></ErrorDialog.Close>
            </div>
          </div>
        </ErrorDialog.Popup>
      </ErrorDialog.Root>

      <Controls.Root className="media-surface media-controls">
        <Tooltip.Provider>
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

            <Tooltip.Root side="top">
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

            <Tooltip.Root side="top">
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

              <div className="media-surface media-thumbnail media-slider__thumbnail">
                <Slider.Thumbnail className="media-thumbnail__image" />
                <TimeSlider.Value type="pointer" className="media-time media-thumbnail__time" />
                <SpinnerIcon className="media-thumbnail__spinner media-icon" />
              </div>
              <TimeSlider.Preview className="media-slider__preview">
                <TimeSlider.Value type="pointer" className="media-time media-slider__value" />
              </TimeSlider.Preview>
            </TimeSlider.Root>
            <Time.Value toggle type="remaining" className="media-time" />
          </div>

          <div className="media-button-group">
            <VolumePopover />

            <SettingsMenu />

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
          </div>
        </Tooltip.Provider>
      </Controls.Root>

      <div className="media-overlay" />

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
      <div className="media-input-feedback">
        <VolumeIndicator.Root className="media-surface media-input-feedback-island media-input-feedback-island--volume">
          <VolumeIndicator.Fill className="media-input-feedback-island__content">
            <VolumeHighIcon className="media-icon media-icon--volume-high" />
            <VolumeLowIcon className="media-icon media-icon--volume-low" />
            <VolumeOffIcon className="media-icon media-icon--volume-off" />
            <VolumeIndicator.Value className="media-input-feedback-island__value" />
          </VolumeIndicator.Fill>
        </VolumeIndicator.Root>

        <StatusIndicator.Root
          actions={TOP_STATUS_ACTIONS}
          className="media-surface media-input-feedback-island media-input-feedback-island--status"
        >
          <div className="media-input-feedback-island__content">
            <CaptionsOnIcon className="media-icon media-icon--captions-on" />
            <CaptionsOffIcon className="media-icon media-icon--captions-off" />
            <FullscreenEnterIcon className="media-icon media-icon--fullscreen-enter" />
            <FullscreenExitIcon className="media-icon media-icon--fullscreen-exit" />
            <PipEnterIcon className="media-icon media-icon--pip-enter" />
            <PipExitIcon className="media-icon media-icon--pip-exit" />
            <StatusIndicator.Value className="media-input-feedback-island__value" />
          </div>
        </StatusIndicator.Root>

        <SeekIndicator.Root className="media-input-feedback-bubble">
          <ChevronIcon className="media-icon media-icon--seek" />
          <SeekIndicator.Value className="media-time" />
        </SeekIndicator.Root>

        <StatusIndicator.Root actions={CENTER_STATUS_ACTIONS} className="media-input-feedback-bubble">
          <PlayIcon className="media-icon media-icon--play" />
          <PauseIcon className="media-icon media-icon--pause" />
        </StatusIndicator.Root>
      </div>
    </Container>
  );
}
