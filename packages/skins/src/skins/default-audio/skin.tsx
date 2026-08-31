import { type PropsOf, Slot, type VjscNode } from 'vjsc/components';

import { StatusAnnouncer } from '../../components/feedback/status-announcer';
import { Container } from '../../components/layout/container';
import type { SkinMeta } from '../../meta';
import { AudioErrorDialog } from '../audio/error-dialog';
import audioSkinStyles from '../audio/skin.styles';
import { PlaybackHotkeys } from '../shared/playback-hotkeys';
import { DefaultAudioControls } from './controls';

export interface DefaultAudioSkinProps extends Omit<PropsOf<typeof Container>, 'children'> {
  children?: VjscNode;
}

export function DefaultAudioSkin({ children, className, ...props }: DefaultAudioSkinProps = {}) {
  return (
    <Container
      className={['media-skin', audioSkinStyles.root, className]}
      data-theme="default"
      data-preset="audio"
      {...props}
    >
      <Slot>{children}</Slot>
      <AudioErrorDialog />
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
    scope: '.media-skin[data-theme="default"][data-preset="audio"]',
    theme: 'default',
    preset: 'audio',
  },
  title: 'Default Audio Skin',
  description: 'A complete on-demand audio skin with playback, seeking, volume, speed, and feedback controls.',
} as const satisfies SkinMeta;
