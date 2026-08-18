import type { MenuProps } from '@videojs/core';
import type { Props } from 'vjsc/components';
import { AudioTrackMenu } from './audio-track-menu';
import { CaptionsMenu } from './captions-menu';
import { PlaybackRateMenu } from './playback-rate-menu';
import { QualityMenu } from './quality-menu';
import { SettingsMenu } from './settings-menu';

export function VideoSettingsMenu(props: Props<MenuProps> = {}) {
  return (
    <SettingsMenu {...props}>
      <QualityMenu />
      <AudioTrackMenu />
      <PlaybackRateMenu />
      <CaptionsMenu />
    </SettingsMenu>
  );
}
