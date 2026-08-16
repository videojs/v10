import { AudioTrackSettingsMenu } from './audio-track-settings-menu';
import { CaptionsSettingsMenu } from './captions-settings-menu';
import { PlaybackRateSettingsMenu } from './playback-rate-settings-menu';
import { QualitySettingsMenu } from './quality-settings-menu';
import { SettingsMenu } from './settings-menu';
import { useQualityOptions, useAudioTrackOptions, usePlaybackRateOptions, useCaptionsOptions } from '@videojs/react';

export interface VideoSettingsMenuProps extends Omit<SettingsMenuProps, 'children'> {}

export function VideoSettingsMenu({ ...props }: VideoSettingsMenuProps = {}) {
  const quality = useQualityOptions();
  const audioTrack = useAudioTrackOptions();
  const playbackRate = usePlaybackRateOptions();
  const captions = useCaptionsOptions();
  const hasSettings =
    quality?.state.availability === 'available' ||
    audioTrack?.state.availability === 'available' ||
    playbackRate?.state.availability === 'available' ||
    captions?.state.availability === 'available';
  return (
    hasSettings && (
      <SettingsMenu {...props}>
        <QualitySettingsMenu />
        <AudioTrackSettingsMenu />
        <PlaybackRateSettingsMenu />
        <CaptionsSettingsMenu />
      </SettingsMenu>
    )
  );
}
