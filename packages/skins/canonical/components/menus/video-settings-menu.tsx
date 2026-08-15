import { AudioTrackSettingsMenu } from './audio-track-settings-menu';
import { CaptionsSettingsMenu } from './captions-settings-menu';
import { PlaybackRateSettingsMenu } from './playback-rate-settings-menu';
import { QualitySettingsMenu } from './quality-settings-menu';
import { SettingsMenu } from './settings-menu';

export function VideoSettingsMenu() {
  return (
    <SettingsMenu>
      <QualitySettingsMenu />
      <AudioTrackSettingsMenu />
      <PlaybackRateSettingsMenu />
      <CaptionsSettingsMenu />
    </SettingsMenu>
  );
}
