import type { PropsOf } from 'vjsc/components';

import type { SkinComponentMeta } from '../../meta';
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

export const meta = {
  name: 'video-settings-menu',
  type: 'component',
  title: 'Video Settings Menu',
  description: 'Nested video quality, audio track, playback rate, and captions settings menus.',
} as const satisfies SkinComponentMeta;
