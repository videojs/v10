import { type PropsOf, Slot, type VjscNode } from 'vjsc/components';

import { BufferingIndicator } from '../../components/feedback/buffering-indicator';
import { ErrorDialog } from '../../components/feedback/error-dialog';
import { VideoStatusIndicators } from '../../components/feedback/video-status-indicators';
import { Container } from '../../components/layout/container';
import { Poster } from '../../components/layout/poster';
import { VideoGestures } from '../../components/video-gestures';
import { VideoHotkeys } from '../../components/video-hotkeys';
import type { SkinMeta } from '../../meta';
import { MinimalVideoControls } from './controls';

export interface MinimalVideoSkinProps extends Omit<PropsOf<typeof Container>, 'children'> {
  children?: VjscNode;
  poster?: string | PropsOf<typeof Poster>['children'];
}

export function MinimalVideoSkin({ children, className, poster, ...props }: MinimalVideoSkinProps = {}) {
  const isPosterString = typeof poster === 'string';

  return (
    <Container className={['media-skin media-skin-video-minimal media-theme-minimal', className]} {...props}>
      <Slot>{children}</Slot>
      <Poster src={isPosterString ? poster : undefined}>{isPosterString ? undefined : poster}</Poster>
      <BufferingIndicator />
      <ErrorDialog />

      <MinimalVideoControls />

      <VideoHotkeys />
      <VideoGestures />
      <VideoStatusIndicators />
    </Container>
  );
}

export const meta = {
  name: 'minimal-video',
  type: 'skin',
  style: {
    scope: 'media-skin-video-minimal',
    theme: 'minimal',
    variant: 'minimal',
  },
  title: 'Minimal Video Skin',
  description: 'A compact on-demand video skin with wrapping controls and the complete video component set.',
} as const satisfies SkinMeta;
