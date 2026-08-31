import { type PropsOf, Slot, type VjscNode } from 'vjsc/components';

import { StatusAnnouncer } from '../../components/feedback/status-announcer';
import { Container } from '../../components/layout/container';
import type { SkinMeta } from '../../meta';
import { AudioErrorDialog } from '../audio/error-dialog';
import audioSkinStyles from '../audio/skin.styles';
import { LivePlaybackHotkeys } from '../shared/live-playback-hotkeys';
import { MinimalLiveAudioControls } from './controls';

export interface MinimalLiveAudioSkinProps extends Omit<PropsOf<typeof Container>, 'children'> {
  children?: VjscNode;
}

export function MinimalLiveAudioSkin({ children, className, ...props }: MinimalLiveAudioSkinProps = {}) {
  return (
    <Container
      className={['media-skin', audioSkinStyles.root, className]}
      data-theme="minimal"
      data-preset="live-audio"
      {...props}
    >
      <Slot>{children}</Slot>
      <AudioErrorDialog />
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
    scope: '.media-skin[data-theme="minimal"][data-preset="live-audio"]',
    theme: 'minimal',
    preset: 'live-audio',
  },
  title: 'Minimal Live Audio Skin',
  description: 'A compact live audio skin with play, live-edge, volume, error, and keyboard feedback controls.',
} as const satisfies SkinMeta;
