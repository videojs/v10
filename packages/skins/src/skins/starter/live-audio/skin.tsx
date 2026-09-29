import * as $ from '@videojs/core/vjsc';
import { type PropsOf, Slot, type VjscNode } from 'vjsc/components';

import type { SkinDescription } from '../../../meta';
import { LivePlaybackHotkeys } from '../../shared/behaviors/live-playback-hotkeys';
import { StatusAnnouncer } from '../shared/components';
import { ErrorDialog } from '../shared/error-dialog';
import styles from '../shared/skin.styles';
import { LiveAudioControls } from './controls';

export interface LiveAudioSkinProps extends Omit<PropsOf<typeof $.Container>, 'children'> {
  children?: VjscNode;
}

export function LiveAudioSkin({ children, className, ...props }: LiveAudioSkinProps = {}) {
  return (
    <$.Container
      className={['media-skin', styles.root, styles.audioRoot, className]}
      data-theme="starter"
      data-preset="live-audio"
      {...props}
    >
      <Slot>{children}</Slot>
      <ErrorDialog />
      <LiveAudioControls />

      <LivePlaybackHotkeys />
      <StatusAnnouncer />
    </$.Container>
  );
}

export const meta = {
  title: 'Starter Live Audio Skin',
  description: 'A basic live audio skin with a solid background and no seek controls.',
} as const satisfies SkinDescription;
