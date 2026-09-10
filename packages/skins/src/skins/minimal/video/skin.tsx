import { type PropsOf, Slot, type VjscNode } from 'vjsc/components';

import { BufferingIndicator } from '../../../components/feedback/buffering-indicator';
import { ErrorDialog } from '../../../components/feedback/error-dialog';
import { Container } from '../../../components/layout/container';
import { Poster } from '../../../components/layout/poster';
import type { SkinDescription } from '../../../meta';
import { VideoGestures } from '../../shared/video/gestures';
import { VideoHotkeys } from '../../shared/video/hotkeys';
import videoSkinStyles from '../../shared/video/skin.styles';
import { VideoStatusIndicators } from '../../shared/video/status-indicators';
import { MinimalVideoControls } from './controls';

export interface MinimalVideoSkinProps extends Omit<PropsOf<typeof Container>, 'children'> {
  children?: VjscNode;
  renderPoster?: PropsOf<typeof Poster>['renderImage'];
  renderThumbnail?: PropsOf<typeof MinimalVideoControls>['renderThumbnail'];
}

export function MinimalVideoSkin({
  children,
  className,
  renderPoster,
  renderThumbnail,
  ...props
}: MinimalVideoSkinProps = {}) {
  return (
    <Container className={[videoSkinStyles.root, className]} data-theme="minimal" data-preset="video" {...props}>
      <Slot>{children}</Slot>
      <Poster renderImage={renderPoster} />
      <BufferingIndicator />
      <ErrorDialog />

      <MinimalVideoControls renderThumbnail={renderThumbnail} />

      <VideoHotkeys />
      <VideoGestures />
      <VideoStatusIndicators />
    </Container>
  );
}

export const meta = {
  title: 'Minimal Video Skin',
  description: 'A compact on-demand video skin with wrapping controls and the complete video component set.',
} as const satisfies SkinDescription;
