import type { PropsOf } from 'vjsc/components';
import { AudioTrackMenu } from './audio-track-menu';
import { CaptionsMenu } from './captions-menu';
import { PlaybackRateMenu } from './playback-rate-menu';
import { QualityMenu } from './quality-menu';
import { SettingsMenu } from './settings-menu';

export interface VideoSettingsMenuProps extends Omit<PropsOf<typeof SettingsMenu>, 'children'> {}

export function VideoSettingsMenu(props: VideoSettingsMenuProps = {}) {
  return (
    <SettingsMenu {...props}>
      <QualityMenu />
      <AudioTrackMenu />
      <PlaybackRateMenu />
      <CaptionsMenu />
    </SettingsMenu>
  );
}
