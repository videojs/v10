import * as $ from '@videojs/core/vjsc';

import type { SkinComponentMeta } from '../meta';

export interface VideoGesturesProps {
  disabled?: boolean | undefined;
}

export function VideoGestures({ disabled = false }: VideoGesturesProps = {}) {
  return (
    <>
      <$.Gesture disabled={disabled} type="tap" action="togglePaused" pointer="mouse" region="center" />
      <$.Gesture disabled={disabled} type="tap" action="toggleControls" pointer="touch" />
      <$.Gesture disabled={disabled} type="doubletap" action="seekStep" value={-10} region="left" />
      <$.Gesture disabled={disabled} type="doubletap" action="toggleFullscreen" region="center" />
      <$.Gesture disabled={disabled} type="doubletap" action="seekStep" value={10} region="right" />
    </>
  );
}

export const meta = {
  name: 'video-gestures',
  type: 'component',
  title: 'Video Gestures',
  description: 'The standard pointer gestures for on-demand video playback.',
} as const satisfies SkinComponentMeta;
