import { type PropsOf, Slot, type VjscNode } from 'vjsc/components';

import { ErrorDialog } from '../../components/feedback/error-dialog';
import { StatusAnnouncer } from '../../components/feedback/status-announcer';
import { Container } from '../../components/layout/container';
import { PlaybackHotkeys } from '../../components/playback-hotkeys';
import type { SkinMeta } from '../../meta';
import { DefaultAudioControls } from './controls';

export interface DefaultAudioSkinProps extends Omit<PropsOf<typeof Container>, 'children'> {
  children?: VjscNode;
}

export function DefaultAudioSkin({ children, className, ...props }: DefaultAudioSkinProps = {}) {
  return (
    <Container
      className={['media-skin media-skin--default media-skin--audio media-theme-default', className]}
      {...props}
    >
      <Slot>{children}</Slot>
      <ErrorDialog />
      <DefaultAudioControls />
      <PlaybackHotkeys />
      <StatusAnnouncer />
    </Container>
  );
}

export const meta = {
  name: 'default-audio',
  type: 'skin',
  style: {
    scope: '.media-skin--default.media-skin--audio',
    theme: 'default',
    variant: 'default-audio',
  },
  title: 'Default Audio Skin',
  description: 'A complete on-demand audio skin with playback, seeking, volume, speed, and feedback controls.',
} as const satisfies SkinMeta;
