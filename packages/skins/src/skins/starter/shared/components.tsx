import { badgeText } from '@videojs/core/i18n/text/live';
import { speedText } from '@videojs/core/i18n/text/menu';
import * as $ from '@videojs/core/vjsc';
import {
  AirPlayEnterIcon,
  AirPlayExitIcon,
  CaptionsOffIcon,
  CaptionsOnIcon,
  CheckIcon,
  PauseIcon,
  PlayIcon,
  RestartIcon,
  VolumeHighIcon,
  VolumeOffIcon,
} from '@videojs/icons/vjsc';
import {
  Box,
  type ClassNameValue,
  type PropsOf,
  Template,
  Text,
  type VjscElement,
  type VjscNode,
} from 'vjsc/components';

import { Button } from './button';
import { PlaybackRateButton } from './rate-button';
import styles from './skin.styles';

export function ButtonTooltip({
  children,
  delay,
  disabled,
  label,
  popupClassName,
  sticky,
}: {
  children: VjscElement;
  delay?: number;
  disabled?: boolean;
  label?: VjscNode;
  popupClassName?: ClassNameValue;
  sticky?: boolean;
}) {
  return (
    <$.Tooltip.Root delay={delay} disabled={disabled} side="top" sticky={sticky}>
      <$.Tooltip.Trigger>{children}</$.Tooltip.Trigger>
      <$.Tooltip.Popup
        className={[styles.popup, styles.popupSafeArea, styles.popupTransition, styles.tooltipPopup, popupClassName]}
      >
        {label ?? <$.Tooltip.Label />}
        {!label && <$.Tooltip.Shortcut className={styles.tooltipShortcut} />}
      </$.Tooltip.Popup>
    </$.Tooltip.Root>
  );
}

function PlayButton({
  className,
  iconClassName,
  tooltip = true,
  ...props
}: PropsOf<typeof $.PlayButton> & { iconClassName?: ClassNameValue; tooltip?: boolean } = {}) {
  return (
    <ButtonTooltip disabled={!tooltip}>
      <$.PlayButton $render={Button} className={[styles.playGroup, className]} {...props}>
        <RestartIcon className={[styles.playIcon, styles.restartIcon, iconClassName]} />
        <PlayIcon className={[styles.playIcon, styles.startIcon, iconClassName]} />
        <PauseIcon className={[styles.playIcon, styles.pauseIcon, iconClassName]} />
      </$.PlayButton>
    </ButtonTooltip>
  );
}

function MuteButton({ className, ...props }: PropsOf<typeof $.MuteButton> = {}) {
  return (
    <$.MuteButton $render={Button} className={[styles.muteGroup, className]} {...props}>
      <VolumeOffIcon className={[styles.icon, styles.mutedIcon]} />
      <VolumeHighIcon className={[styles.icon, styles.volumeIcon]} />
    </$.MuteButton>
  );
}

function VolumePopover() {
  return (
    <$.VolumePopover.Root openOnHover delay={200} closeDelay={100} side="top">
      <ButtonTooltip delay={0} disabled sticky>
        <$.VolumePopover.Trigger>
          <MuteButton />
        </$.VolumePopover.Trigger>
      </ButtonTooltip>
      <$.VolumePopover.Popup
        className={[styles.popup, styles.popupSafeArea, styles.popupTransition, styles.volumePopup]}
      >
        <$.VolumeSlider.Root className={styles.volumeSlider} orientation="vertical" thumbAlignment="edge">
          <$.VolumeSlider.Track className={styles.volumeTrack}>
            <$.VolumeSlider.Fill className={styles.volumeFill} />
          </$.VolumeSlider.Track>
          <$.VolumeSlider.Thumb className={styles.volumeThumb} />
        </$.VolumeSlider.Root>
      </$.VolumePopover.Popup>
    </$.VolumePopover.Root>
  );
}

function CaptionsButton() {
  return (
    <ButtonTooltip>
      <$.CaptionsButton $render={Button} className={styles.captionsGroup}>
        <CaptionsOffIcon className={[styles.icon, styles.captionsOffIcon]} />
        <CaptionsOnIcon className={[styles.icon, styles.captionsOnIcon]} />
      </$.CaptionsButton>
    </ButtonTooltip>
  );
}

export function RadioItem({ children, ...props }: PropsOf<typeof $.Menu.RadioItem>) {
  return (
    <$.Menu.RadioItem className={styles.menuRadioItem} {...props}>
      {children}
      <$.Menu.ItemIndicator forceMount className={styles.menuIndicator}>
        <CheckIcon className={styles.menuRadioIcon} />
      </$.Menu.ItemIndicator>
    </$.Menu.RadioItem>
  );
}

function PlaybackRatePopover() {
  return (
    <$.Menu.Root side="top" align="center" boundary="viewport">
      <$.PlaybackRateRadioGroup.Root>
        <ButtonTooltip label={<Text token={speedText.key}>{speedText.text}</Text>}>
          <$.Menu.Trigger $render={PlaybackRateButton} />
        </ButtonTooltip>
        <$.Menu.Popup className={[styles.popup, styles.popupSafeArea, styles.menuPopup, styles.rateMenuPopup]}>
          <$.Menu.Content className={styles.menuContent}>
            <$.PlaybackRateRadioGroup.Options className={styles.menuRadioGroup}>
              <Template name="playback-rate-option">
                <RadioItem>
                  <Template.Part name="label" />
                </RadioItem>
              </Template>
            </$.PlaybackRateRadioGroup.Options>
          </$.Menu.Content>
        </$.Menu.Popup>
      </$.PlaybackRateRadioGroup.Root>
    </$.Menu.Root>
  );
}

function AirPlayButton() {
  return (
    <ButtonTooltip>
      <$.AirPlayButton $render={Button} className={styles.airplayGroup}>
        <AirPlayEnterIcon className={[styles.icon, styles.airplayEnterIcon]} />
        <AirPlayExitIcon className={[styles.icon, styles.airplayExitIcon]} />
      </$.AirPlayButton>
    </ButtonTooltip>
  );
}

function LiveButton() {
  return (
    <$.LiveButton $render={Button} className={styles.liveButton}>
      <Box aria-hidden="true" className={styles.liveDot} />
      <Text token={badgeText.key}>{badgeText.text}</Text>
    </$.LiveButton>
  );
}

function TimeSlider({ audio = false, renderThumbnail }: ThumbnailSlot & { audio?: boolean } = {}) {
  return (
    <Box className={styles.sliderRow}>
      <$.TimeSlider.Root className={styles.slider} thumbAlignment="edge">
        <$.TimeSlider.Chapters className={styles.sliderChapters}>
          <Template name="chapter" className={styles.sliderChapter}>
            <$.TimeSlider.Track className={[styles.sliderTrack, audio && styles.audioSliderTrack]}>
              <$.TimeSlider.Buffer className={[styles.sliderBuffer, audio && styles.audioSliderBuffer]} />
              <$.TimeSlider.Fill className={styles.sliderFill} />
            </$.TimeSlider.Track>
          </Template>
        </$.TimeSlider.Chapters>
        <$.TimeSlider.Thumb className={styles.sliderThumb} />

        <$.TimeSlider.Preview className={styles.preview}>
          <$.Slider.Thumbnail.Root className={styles.thumbnail}>
            <$.Slider.Thumbnail.Image className={styles.thumbnailImage}>{renderThumbnail}</$.Slider.Thumbnail.Image>
          </$.Slider.Thumbnail.Root>
          <Box className={[styles.previewMeta, audio && styles.audioPreviewMeta]}>
            <Box className={styles.previewLabel}>
              <$.TimeSlider.Value className={styles.previewTime} type="pointer" />
              <$.TimeSlider.ChapterTitle className={styles.previewChapter} />
            </Box>
          </Box>
        </$.TimeSlider.Preview>
      </$.TimeSlider.Root>
    </Box>
  );
}

function ControlsRow({
  audio = false,
  live = false,
  menu,
  seekBackward,
  seekForward,
}: ControlsSlots & { audio?: boolean; live?: boolean; menu?: VjscNode } = {}) {
  return (
    <$.Controls.Group className={styles.controlsRow}>
      <$.Controls.Group className={[styles.controlsGroup, styles.controlsStart]}>
        <PlayButton />
        {seekBackward}
        {seekForward}
        {live && <LiveButton />}
        {audio ? <PlaybackRatePopover /> : <VolumePopover />}
        <$.Time.Group className={styles.timeGroup}>
          <$.Time.Value className={styles.compactTime} type="current" toggle />
          <$.Time.Value className={styles.currentTime} type="current" />
          <$.Time.Separator className={styles.duration} />
          <$.Time.Value className={styles.duration} type="duration" />
        </$.Time.Group>
      </$.Controls.Group>

      <$.Controls.Group className={styles.controlsGroup}>
        <CaptionsButton />
        {menu ?? (audio && <VolumePopover />)}
        <AirPlayButton />
      </$.Controls.Group>
    </$.Controls.Group>
  );
}

export interface ThumbnailSlot {
  /** Draws the storyboard frame in the slider preview in place of the one the skin renders. */
  renderThumbnail?: PropsOf<typeof $.Slider.Thumbnail.Image>['children'];
}

export interface ControlsSlots extends ThumbnailSlot {
  /** The skip-back control, supplied by the presets that have a timeline. */
  seekBackward?: VjscNode;
  /** The skip-forward control, supplied by the presets that have a timeline. */
  seekForward?: VjscNode;
}

export function ControlsContent({
  audio = false,
  center = false,
  live = false,
  menu,
  renderThumbnail,
  seekBackward,
  seekForward,
  top,
}: ControlsSlots & { audio?: boolean; center?: boolean; live?: boolean; menu?: VjscNode; top?: VjscNode } = {}) {
  return (
    <$.Controls.Content className={[styles.controls, audio && styles.audioControls]}>
      <$.Tooltip.Provider>
        {top}
        {center && (
          <$.Controls.Group className={[styles.centerControls, 'media-starter-center-controls']}>
            {seekBackward}
            <PlayButton
              className={[styles.centerButton, styles.centerPlay]}
              iconClassName={styles.centerPlayIcon}
              tooltip={false}
            />
            {seekForward}
          </$.Controls.Group>
        )}
        <Box
          className={[styles.controlsBottom, audio && styles.audioControlsBottom, !audio && styles.videoControlsBottom]}
        >
          {!live && <TimeSlider audio={audio} renderThumbnail={renderThumbnail} />}
          <ControlsRow
            audio={audio}
            live={live}
            menu={menu}
            seekBackward={center ? undefined : seekBackward}
            seekForward={center ? undefined : seekForward}
          />
        </Box>
      </$.Tooltip.Provider>
    </$.Controls.Content>
  );
}

export function StatusAnnouncer() {
  return <$.StatusAnnouncer className={styles.announcer} />;
}
