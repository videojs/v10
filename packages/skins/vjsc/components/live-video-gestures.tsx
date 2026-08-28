import * as $ from '@videojs/core/vjsc';

import type { SkinComponentMeta } from '../meta';

export interface LiveVideoGesturesProps {
  disabled?: boolean | undefined;
}

export function LiveVideoGestures({ disabled = false }: LiveVideoGesturesProps = {}) {
  return (
    <>
      <$.Gesture disabled={disabled} type="tap" action="togglePaused" pointer="mouse" region="center" />
      <$.Gesture disabled={disabled} type="tap" action="toggleControls" pointer="touch" />
      <$.Gesture disabled={disabled} type="doubletap" action="toggleFullscreen" region="center" />
    </>
  );
}

export const meta = {
  name: 'live-video-gestures',
  type: 'component',
  title: 'Live Video Gestures',
  description: 'Pointer gestures for live video playback, controls, and fullscreen without seek gestures.',
} as const satisfies SkinComponentMeta;
