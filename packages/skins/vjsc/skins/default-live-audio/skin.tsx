import { type PropsOf, Slot, type VjscNode } from 'vjsc/components';

import { StatusAnnouncer } from '../../components/feedback/status-announcer';
import { Container } from '../../components/layout/container';
import type { SkinMeta } from '../../meta';
import { AudioErrorDialog } from '../audio/error-dialog';
import { LivePlaybackHotkeys } from '../shared/live-playback-hotkeys';
import { DefaultLiveAudioControls } from './controls';

export interface DefaultLiveAudioSkinProps extends Omit<PropsOf<typeof Container>, 'children'> {
  children?: VjscNode;
}

export function DefaultLiveAudioSkin({ children, className, ...props }: DefaultLiveAudioSkinProps = {}) {
  return (
    <Container className={['media-skin media-skin--live-audio', className]} {...props}>
      <Slot>{children}</Slot>
      <AudioErrorDialog />
      <DefaultLiveAudioControls />
      <LivePlaybackHotkeys />
      <StatusAnnouncer />
    </Container>
  );
}

export const meta = {
  name: 'default-live-audio',
  type: 'skin',
  style: {
    scope: '.media-skin--live-audio',
    theme: 'default',
    variant: 'default-live-audio',
  },
  title: 'Default Live Audio Skin',
  description: 'A complete live audio skin with play, live-edge, volume, error, and keyboard feedback controls.',
} as const satisfies SkinMeta;
