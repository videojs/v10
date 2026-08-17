import * as $ from '@videojs/core/components';

export function VideoGestures() {
  return (
    <>
      <$.Gesture type="tap" action="togglePaused" pointer="mouse" region="center" />
      <$.Gesture type="tap" action="toggleControls" pointer="touch" />
      <$.Gesture type="doubletap" action="seekStep" value={-10} region="left" />
      <$.Gesture type="doubletap" action="toggleFullscreen" region="center" />
      <$.Gesture type="doubletap" action="seekStep" value={10} region="right" />
    </>
  );
}
