import { AudioTrackMenu } from './audio-track-menu';
import { CaptionsMenu } from './captions-menu';
import { PlaybackRateMenu } from './playback-rate-menu';
import { QualityMenu } from './quality-menu';
import { SettingsMenu } from './settings-menu';

export function VideoSettingsMenu() {
  return (
    <SettingsMenu>
      <QualityMenu />
      <AudioTrackMenu />
      <PlaybackRateMenu />
      <CaptionsMenu />
    </SettingsMenu>
  );
}
