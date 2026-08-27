import { type PropsOf, Slot, type VjscNode } from 'vjsc/components';

import { ErrorDialog } from '../../components/feedback/error-dialog';
import { StatusAnnouncer } from '../../components/feedback/status-announcer';
import { Container } from '../../components/layout/container';
import { LivePlaybackHotkeys } from '../../components/live-playback-hotkeys';
import type { SkinMeta } from '../../meta';
import { DefaultLiveAudioControls } from './controls';

export interface DefaultLiveAudioSkinProps extends Omit<PropsOf<typeof Container>, 'children'> {
  children?: VjscNode;
}

export function DefaultLiveAudioSkin({ children, className, ...props }: DefaultLiveAudioSkinProps = {}) {
  return (
    <Container
      className={['media-skin media-skin--default media-skin--live-audio media-theme-default', className]}
      {...props}
    >
      <Slot>{children}</Slot>
      <ErrorDialog />
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
    scope: '.media-skin--default.media-skin--live-audio',
    theme: 'default',
    variant: 'default-live-audio',
  },
  title: 'Default Live Audio Skin',
  description: 'A complete live audio skin with play, live-edge, volume, error, and keyboard feedback controls.',
} as const satisfies SkinMeta;
