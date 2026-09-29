import * as $ from '@videojs/core/vjsc';
import { type PropsOf, Slot, type VjscNode } from 'vjsc/components';

import type { SkinDescription } from '../../../meta';
import { VideoGestures } from '../../shared/video/behaviors/gestures';
import { VideoHotkeys } from '../../shared/video/behaviors/hotkeys';
import { StatusAnnouncer } from '../shared/components';
import { ErrorDialog } from '../shared/error-dialog';
import { Indicators } from '../shared/indicators';
import { SeekIndicator } from '../shared/seek-indicator';
import styles from '../shared/skin.styles';
import { Title } from '../shared/title';
import { BufferingIndicator, Poster } from '../shared/video-feedback';
import { VideoControls } from './controls';

export interface VideoSkinProps extends Omit<PropsOf<typeof $.Container>, 'children'> {
  children?: VjscNode;
  renderPoster?: PropsOf<typeof $.Poster.Image>['children'];
  renderThumbnail?: PropsOf<typeof $.Slider.Thumbnail.Image>['children'];
}

export function VideoSkin({ children, className, renderPoster, renderThumbnail, ...props }: VideoSkinProps = {}) {
  return (
    <$.Container
      className={['media-skin', styles.root, styles.videoRoot, className]}
      data-theme="starter"
      data-preset="video"
      {...props}
    >
      <Slot>{children}</Slot>
      <Poster renderImage={renderPoster} />
      <BufferingIndicator />
      <ErrorDialog />
      <Title />
      <VideoControls renderThumbnail={renderThumbnail} />

      <VideoHotkeys />
      <VideoGestures />
      <StatusAnnouncer />
      <Indicators>
        <SeekIndicator />
      </Indicators>
    </$.Container>
  );
}

export const meta = {
  title: 'Starter Video Skin',
  description: 'A basic on-demand video skin intended as a starting point for custom designs.',
} as const satisfies SkinDescription;
