import { type PropsOf, Slot, type VjscNode } from 'vjsc/components';

import { StatusAnnouncer } from '../../components/feedback/status-announcer';
import { Container } from '../../components/layout/container';
import type { SkinMeta } from '../../meta';
import { AudioErrorDialog } from '../audio/error-dialog';
import audioSkinStyles from '../audio/skin.styles';
import { PlaybackHotkeys } from '../shared/playback-hotkeys';
import { MinimalAudioControls } from './controls';

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
  name: 'minimal-audio',
  type: 'skin',
  style: {
    scope: '.media-skin[data-theme="minimal"][data-preset="audio"]',
    theme: 'minimal',
    preset: 'audio',
  },
  title: 'Minimal Audio Skin',
  description: 'A compact on-demand audio skin with responsive time, volume, speed, and feedback controls.',
} as const satisfies SkinMeta;
