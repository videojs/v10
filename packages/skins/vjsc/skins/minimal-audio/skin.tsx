import { type PropsOf, Slot, type VjscNode } from 'vjsc/components';

import { ErrorDialog } from '../../components/feedback/error-dialog';
import { StatusAnnouncer } from '../../components/feedback/status-announcer';
import { Container } from '../../components/layout/container';
import { PlaybackHotkeys } from '../../components/playback-hotkeys';
import type { SkinMeta } from '../../meta';
import { MinimalAudioControls } from './controls';

export interface MinimalAudioSkinProps extends Omit<PropsOf<typeof Container>, 'children'> {
  children?: VjscNode;
}

export function MinimalAudioSkin({ children, className, ...props }: MinimalAudioSkinProps = {}) {
  return (
    <Container
      className={['media-skin media-skin--minimal media-skin--audio media-theme-minimal', className]}
      {...props}
    >
      <Slot>{children}</Slot>
      <ErrorDialog />
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
    scope: '.media-skin--minimal.media-skin--audio',
    theme: 'minimal',
    variant: 'minimal-audio',
  },
  title: 'Minimal Audio Skin',
  description: 'A compact on-demand audio skin with responsive time, volume, speed, and feedback controls.',
} as const satisfies SkinMeta;
