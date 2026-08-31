import { type PropsOf, Slot, type VjscNode } from 'vjsc/components';

import { BufferingIndicator } from '../../components/feedback/buffering-indicator';
import { ErrorDialog } from '../../components/feedback/error-dialog';
import { Container } from '../../components/layout/container';
import { Poster } from '../../components/layout/poster';
import type { SkinMeta } from '../../meta';
import { VideoGestures } from '../video/gestures';
import { VideoHotkeys } from '../video/hotkeys';
import { VideoStatusIndicators } from '../video/status-indicators';
import { DefaultVideoControls } from './controls';

export interface DefaultVideoSkinProps extends Omit<PropsOf<typeof Container>, 'children'> {
  children?: VjscNode;
  poster?: string | PropsOf<typeof Poster>['children'];
}

export function DefaultVideoSkin({ children, className, poster, ...props }: DefaultVideoSkinProps = {}) {
  const isPosterString = typeof poster === 'string';

  return (
    <Container className={['media-skin', className]} data-theme="default" data-preset="video" {...props}>
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
    scope: '.media-skin[data-theme="default"][data-preset="video"]',
    theme: 'default',
    preset: 'video',
  },
  title: 'Default Video Skin',
  description: 'A complete on-demand video skin with responsive controls, settings, feedback, and input controls.',
} as const satisfies SkinMeta;
