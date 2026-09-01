import { type PropsOf, Slot, type VjscNode } from 'vjsc/components';

import { BufferingIndicator } from '../../components/feedback/buffering-indicator';
import { ErrorDialog } from '../../components/feedback/error-dialog';
import { Container } from '../../components/layout/container';
import { Poster } from '../../components/layout/poster';
import type { SkinMeta } from '../../meta';
import { VideoGestures } from '../video/gestures';
import { VideoHotkeys } from '../video/hotkeys';
import { VideoStatusIndicators } from '../video/status-indicators';
import { MinimalVideoControls } from './controls';

export interface MinimalVideoSkinProps extends Omit<PropsOf<typeof Container>, 'children'> {
  children?: VjscNode;
  poster?: string | PropsOf<typeof Poster>['children'];
}

export function MinimalVideoSkin({ children, className, poster, ...props }: MinimalVideoSkinProps = {}) {
  const isPosterString = typeof poster === 'string';

  return (
    <Container className={className} data-theme="minimal" data-preset="video" {...props}>
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
    scope: '.media-skin[data-theme="minimal"][data-preset="video"]',
    theme: 'minimal',
    preset: 'video',
  },
  title: 'Minimal Video Skin',
  description: 'A compact on-demand video skin with wrapping controls and the complete video component set.',
} as const satisfies SkinMeta;
