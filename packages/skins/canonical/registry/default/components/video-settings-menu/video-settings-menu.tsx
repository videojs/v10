import { AudioTrackMenu } from './audio-track-menu';
import { CaptionsMenu } from './captions-menu';
import { PlaybackRateMenu } from './playback-rate-menu';
import { QualityMenu } from './quality-menu';
import { SettingsMenu } from './settings-menu';
import type { SettingsMenuProps } from './settings-menu';
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
        <QualityMenu />
        <AudioTrackMenu />
        <PlaybackRateMenu />
        <CaptionsMenu />
      </SettingsMenu>
    )
  );
}
