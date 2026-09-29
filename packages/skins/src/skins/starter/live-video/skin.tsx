import * as $ from '@videojs/core/vjsc';
import { type PropsOf, Slot, type VjscNode } from 'vjsc/components';

import type { SkinDescription } from '../../../meta';
import { LiveVideoGestures } from '../../shared/live-video/behaviors/gestures';
import { LiveVideoHotkeys } from '../../shared/live-video/behaviors/hotkeys';
import { StatusAnnouncer } from '../shared/components';
import { ErrorDialog } from '../shared/error-dialog';
import { Indicators } from '../shared/indicators';
import styles from '../shared/skin.styles';
import { Title } from '../shared/title';
import { BufferingIndicator, Poster } from '../shared/video-feedback';
import { LiveVideoControls } from './controls';

export interface LiveVideoSkinProps extends Omit<PropsOf<typeof $.Container>, 'children'> {
  children?: VjscNode;
  renderPoster?: PropsOf<typeof $.Poster.Image>['children'];
}

export function LiveVideoSkin({ children, className, renderPoster, ...props }: LiveVideoSkinProps = {}) {
  return (
    <$.Container
      className={['media-skin', styles.root, styles.videoRoot, className]}
      data-theme="starter"
      data-preset="live-video"
      {...props}
    >
      <Slot>{children}</Slot>
      <Poster renderImage={renderPoster} />
      <BufferingIndicator />
      <ErrorDialog />
      <Title />
      <LiveVideoControls />

      <LiveVideoHotkeys />
      <LiveVideoGestures />
      <StatusAnnouncer />
      <Indicators />
    </$.Container>
  );
}

export const meta = {
  title: 'Starter Live Video Skin',
  description: 'A basic live video skin without seek controls, intended as a starting point for custom designs.',
} as const satisfies SkinDescription;
