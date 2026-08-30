import type { PropsOf } from 'vjsc/components';

import { AudioTrackMenu } from '../../components/menus/audio-track-menu';
import { CaptionsSubmenu } from '../../components/menus/captions-submenu';
import { PlaybackRateSubmenu } from '../../components/menus/playback-rate-submenu';
import { QualityMenu } from '../../components/menus/quality-menu';
import { SettingsMenu } from '../../components/menus/settings-menu';

export type VideoSettingsMenuProps = Omit<PropsOf<typeof SettingsMenu>, 'children'>;

export function VideoSettingsMenu(props: VideoSettingsMenuProps = {}) {
  return (
    <SettingsMenu {...props}>
      <QualityMenu />
      <AudioTrackMenu />
      <PlaybackRateSubmenu />
      <CaptionsSubmenu />
    </SettingsMenu>
  );
}
