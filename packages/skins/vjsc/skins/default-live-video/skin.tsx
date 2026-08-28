import { type PropsOf, Slot, type VjscNode } from 'vjsc/components';

import { BufferingIndicator } from '../../components/feedback/buffering-indicator';
import { ErrorDialog } from '../../components/feedback/error-dialog';
import { LiveVideoStatusIndicators } from '../../components/feedback/live-video-status-indicators';
import { Container } from '../../components/layout/container';
import { Poster } from '../../components/layout/poster';
import { LiveVideoGestures } from '../../components/live-video-gestures';
import { LiveVideoHotkeys } from '../../components/live-video-hotkeys';
import type { SkinMeta } from '../../meta';
import { DefaultLiveVideoControls } from './controls';

export interface DefaultLiveVideoSkinProps extends Omit<PropsOf<typeof Container>, 'children'> {
  children?: VjscNode;
  poster?: string | PropsOf<typeof Poster>['children'];
}

export function DefaultLiveVideoSkin({ children, className, poster, ...props }: DefaultLiveVideoSkinProps = {}) {
  const isPosterString = typeof poster === 'string';

  return (
    <Container
      className={['media-skin media-skin--default media-skin--live-video media-theme-default', className]}
      {...props}
    >
      <Slot>{children}</Slot>
      <Poster src={isPosterString ? poster : undefined}>{isPosterString ? undefined : poster}</Poster>
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
  style: {
    scope: '.media-skin--default.media-skin--live-video',
    theme: 'default',
    variant: 'default-live-video',
  },
  title: 'Default Live Video Skin',
  description: 'A complete live video skin with live-edge, captions, remote playback, feedback, and input controls.',
} as const satisfies SkinMeta;
