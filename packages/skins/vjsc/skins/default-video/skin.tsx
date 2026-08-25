import { type PropsOf, Slot, type VjscNode } from 'vjsc/components';

import { BufferingIndicator } from '../../components/feedback/buffering-indicator';
import { ErrorDialog } from '../../components/feedback/error-dialog';
import { VideoStatusIndicators } from '../../components/feedback/video-status-indicators';
import { Container } from '../../components/layout/container';
import { Poster } from '../../components/layout/poster';
import { VideoGestures } from '../../components/video-gestures';
import { VideoHotkeys } from '../../components/video-hotkeys';
import type { SkinMeta } from '../../meta';
import { DefaultVideoControls } from './controls';

export interface DefaultVideoSkinProps extends Omit<PropsOf<typeof Container>, 'children'> {
  children?: VjscNode;
  poster?: string | PropsOf<typeof Poster>['children'];
}

export function DefaultVideoSkin({ children, className, poster, ...props }: DefaultVideoSkinProps = {}) {
  const isPosterString = typeof poster === 'string';

  return (
    <Container className={['media-skin media-skin-video media-theme-default', className]} {...props}>
      <Slot>{children}</Slot>
      <Poster src={isPosterString ? poster : undefined}>{isPosterString ? undefined : poster}</Poster>
      <BufferingIndicator />
      <ErrorDialog />

      <DefaultVideoControls />

      <VideoHotkeys />
      <VideoGestures />
      <VideoStatusIndicators />
    </Container>
  );
}

export const meta = {
  name: 'default-video',
  type: 'skin',
  style: {
    scope: 'media-skin-video',
    theme: 'default',
    variant: 'default',
  },
  title: 'Default Video Skin',
  description: 'A complete on-demand video skin with responsive controls, settings, feedback, and input controls.',
} as const satisfies SkinMeta;
