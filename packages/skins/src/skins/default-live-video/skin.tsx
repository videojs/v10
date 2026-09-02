import { type PropsOf, Slot, type VjscNode } from 'vjsc/components';

import { BufferingIndicator } from '../../components/feedback/buffering-indicator';
import { ErrorDialog } from '../../components/feedback/error-dialog';
import { Container } from '../../components/layout/container';
import { Poster } from '../../components/layout/poster';
import type { SkinMeta } from '../../meta';
import { LiveVideoGestures } from '../live-video/gestures';
import { LiveVideoHotkeys } from '../live-video/hotkeys';
import { LiveVideoStatusIndicators } from '../live-video/status-indicators';
import videoSkinStyles from '../video/skin.styles';
import { DefaultLiveVideoControls } from './controls';

export interface DefaultLiveVideoSkinProps extends Omit<PropsOf<typeof Container>, 'children'> {
  children?: VjscNode;
  renderPoster?: PropsOf<typeof Poster>['children'];
}

export function DefaultLiveVideoSkin({ children, className, renderPoster, ...props }: DefaultLiveVideoSkinProps = {}) {
  return (
    <Container className={[videoSkinStyles.root, className]} data-theme="default" data-preset="live-video" {...props}>
      <Slot>{children}</Slot>
      <Poster>{renderPoster}</Poster>
      <BufferingIndicator />
      <ErrorDialog />
      <DefaultLiveVideoControls />
      <LiveVideoHotkeys />
      <LiveVideoGestures />
      <LiveVideoStatusIndicators />
    </Container>
  );
}

export const meta = {
  name: 'default-live-video',
  type: 'skin',
  title: 'Default Live Video Skin',
  description: 'A complete live video skin with live-edge, captions, remote playback, feedback, and input controls.',
} as const satisfies SkinMeta;
