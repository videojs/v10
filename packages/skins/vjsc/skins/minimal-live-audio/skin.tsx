import { type PropsOf, Slot, type VjscNode } from 'vjsc/components';

import { ErrorDialog } from '../../components/feedback/error-dialog';
import { StatusAnnouncer } from '../../components/feedback/status-announcer';
import { Container } from '../../components/layout/container';
import { LivePlaybackHotkeys } from '../../components/live-playback-hotkeys';
import type { SkinMeta } from '../../meta';
import { MinimalLiveAudioControls } from './controls';

export interface MinimalLiveAudioSkinProps extends Omit<PropsOf<typeof Container>, 'children'> {
  children?: VjscNode;
}

export function MinimalLiveAudioSkin({ children, className, ...props }: MinimalLiveAudioSkinProps = {}) {
  return (
    <Container
      className={['media-skin media-skin--minimal media-skin--live-audio media-theme-minimal', className]}
      {...props}
    >
      <Slot>{children}</Slot>
      <ErrorDialog />
      <MinimalLiveAudioControls />
      <LivePlaybackHotkeys />
      <StatusAnnouncer />
    </Container>
  );
}

export const meta = {
  name: 'minimal-live-audio',
  type: 'skin',
  style: {
    scope: '.media-skin--minimal.media-skin--live-audio',
    theme: 'minimal',
    variant: 'minimal-live-audio',
  },
  title: 'Minimal Live Audio Skin',
  description: 'A compact live audio skin with play, live-edge, volume, error, and keyboard feedback controls.',
} as const satisfies SkinMeta;
