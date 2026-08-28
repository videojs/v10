import { type PropsOf, Slot, type VjscNode } from 'vjsc/components';

import { BufferingIndicator } from '../../components/feedback/buffering-indicator';
import { ErrorDialog } from '../../components/feedback/error-dialog';
import { LiveVideoStatusIndicators } from '../../components/feedback/live-video-status-indicators';
import { Container } from '../../components/layout/container';
import { Poster } from '../../components/layout/poster';
import { LiveVideoGestures } from '../../components/live-video-gestures';
import { LiveVideoHotkeys } from '../../components/live-video-hotkeys';
import type { SkinMeta } from '../../meta';
import { MinimalLiveVideoControls } from './controls';

export interface MinimalLiveVideoSkinProps extends Omit<PropsOf<typeof Container>, 'children'> {
  children?: VjscNode;
  poster?: string | PropsOf<typeof Poster>['children'];
}

export function MinimalLiveVideoSkin({ children, className, poster, ...props }: MinimalLiveVideoSkinProps = {}) {
  const isPosterString = typeof poster === 'string';

  return (
    <Container
      className={['media-skin media-skin--minimal media-skin--live-video media-theme-minimal', className]}
      {...props}
    >
      <Slot>{children}</Slot>
      <Poster src={isPosterString ? poster : undefined}>{isPosterString ? undefined : poster}</Poster>
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
  name: 'minimal-live-video',
  type: 'skin',
  style: {
    scope: '.media-skin--minimal.media-skin--live-video',
    theme: 'minimal',
    variant: 'minimal-live-video',
  },
  title: 'Minimal Live Video Skin',
  description: 'A compact live video skin with live-edge, captions, remote playback, feedback, and input controls.',
} as const satisfies SkinMeta;
