import { type PropsOf, Slot, type VjscNode } from 'vjsc/components';

import { BufferingIndicator } from '../../components/feedback/buffering-indicator';
import { ErrorDialog } from '../../components/feedback/error-dialog';
import { Container } from '../../components/layout/container';
import { Poster } from '../../components/layout/poster';
import type { SkinDescription } from '../../meta';
import { LiveVideoGestures } from '../live-video/gestures';
import { LiveVideoHotkeys } from '../live-video/hotkeys';
import { LiveVideoStatusIndicators } from '../live-video/status-indicators';
import videoSkinStyles from '../video/skin.styles';
import { MinimalLiveVideoControls } from './controls';

export interface MinimalLiveVideoSkinProps extends Omit<PropsOf<typeof Container>, 'children'> {
  children?: VjscNode;
  renderPoster?: PropsOf<typeof Poster>['renderImage'];
}

export function MinimalLiveVideoSkin({ children, className, renderPoster, ...props }: MinimalLiveVideoSkinProps = {}) {
  return (
    <Container className={[videoSkinStyles.root, className]} data-theme="minimal" data-preset="live-video" {...props}>
      <Slot>{children}</Slot>
      <Poster renderImage={renderPoster} />
      <BufferingIndicator />
      <ErrorDialog />
      <MinimalLiveVideoControls />
      <LiveVideoHotkeys />
      <LiveVideoGestures />
      <LiveVideoStatusIndicators />
    </Container>
  );
}

export const meta = {
  title: 'Minimal Live Video Skin',
  description: 'A compact live video skin with live-edge, captions, remote playback, feedback, and input controls.',
} as const satisfies SkinDescription;
