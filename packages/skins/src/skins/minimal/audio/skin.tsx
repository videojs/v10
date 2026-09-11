import { type PropsOf, Slot, type VjscNode } from 'vjsc/components';

import { StatusAnnouncer } from '../../../components/behaviors/status-announcer';
import { Container } from '../../../components/layout/container';
import type { SkinDescription } from '../../../meta';
import { AudioErrorDialog } from '../../shared/audio/dialogs/error-dialog';
import audioSkinStyles from '../../shared/audio/skin.styles';
import { PlaybackHotkeys } from '../../shared/behaviors/playback-hotkeys';
import { MinimalAudioControls } from './layout/controls';

export interface MinimalAudioSkinProps extends Omit<PropsOf<typeof Container>, 'children'> {
  children?: VjscNode;
}

export function MinimalAudioSkin({ children, className, ...props }: MinimalAudioSkinProps = {}) {
  return (
    <Container className={[audioSkinStyles.root, className]} data-theme="minimal" data-preset="audio" {...props}>
      <Slot>{children}</Slot>
      <AudioErrorDialog />
      <MinimalAudioControls />
      <PlaybackHotkeys />
      <StatusAnnouncer />
    </Container>
  );
}

export const meta = {
  title: 'Minimal Audio Skin',
  description: 'A compact on-demand audio skin with responsive time, volume, speed, and feedback controls.',
} as const satisfies SkinDescription;
