import { AudioTrackSettingsMenu } from './audio-track-settings-menu';
import { CaptionsSettingsMenu } from './captions-settings-menu';
import { PlaybackRateSettingsMenu } from './playback-rate-settings-menu';
import { QualitySettingsMenu } from './quality-settings-menu';
import { SettingsMenu } from './settings-menu';
import { useQualityOptions } from '@/ui/quality/use-quality-options';
import { useAudioTrackOptions } from '@/ui/audio-track/use-audio-track-options';
import { usePlaybackRateOptions } from '@/ui/playback-rate/use-playback-rate-options';
import { useCaptionsOptions } from '@/ui/captions-radio-group/use-captions-options';

export function VideoSettingsMenu() {
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
      <SettingsMenu>
        <QualitySettingsMenu />
        <AudioTrackSettingsMenu />
        <PlaybackRateSettingsMenu />
        <CaptionsSettingsMenu />
      </SettingsMenu>
    )
  );
}
