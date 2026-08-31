import { type PropsOf, Slot, type VjscNode } from 'vjsc/components';

import { StatusAnnouncer } from '../../components/feedback/status-announcer';
import { Container } from '../../components/layout/container';
import type { SkinMeta } from '../../meta';
import { AudioErrorDialog } from '../audio/error-dialog';
import audioSkinStyles from '../audio/skin.styles';
import { LivePlaybackHotkeys } from '../shared/live-playback-hotkeys';
import { DefaultLiveAudioControls } from './controls';

export interface DefaultLiveAudioSkinProps extends Omit<PropsOf<typeof Container>, 'children'> {
  children?: VjscNode;
}

export function DefaultLiveAudioSkin({ children, className, ...props }: DefaultLiveAudioSkinProps = {}) {
  return (
    <Container
      className={['media-skin', audioSkinStyles.root, className]}
      data-theme="default"
      data-preset="live-audio"
      {...props}
    >
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
    scope: '.media-skin[data-theme="default"][data-preset="live-audio"]',
    theme: 'default',
    preset: 'live-audio',
  },
  title: 'Default Live Audio Skin',
  description: 'A complete live audio skin with play, live-edge, volume, error, and keyboard feedback controls.',
} as const satisfies SkinMeta;
