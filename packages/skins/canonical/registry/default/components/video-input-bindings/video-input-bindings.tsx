import { Gesture, Hotkey } from '@videojs/react';

export interface VideoInputBindingsProps {
  disabled?: boolean;
}

export function VideoInputBindings({ disabled = false }: VideoInputBindingsProps = {}) {
  return (
    <>
      <Hotkey keys="Space" action="togglePaused" disabled={disabled} />
      <Hotkey keys="k" action="togglePaused" disabled={disabled} />
      <Hotkey keys="m" action="toggleMuted" disabled={disabled} />
      <Hotkey keys="f" action="toggleFullscreen" disabled={disabled} />
      <Hotkey keys="c" action="toggleSubtitles" disabled={disabled} />
      <Hotkey keys="i" action="togglePictureInPicture" disabled={disabled} />
      <Hotkey keys="ArrowRight" action="seekStep" value={5} disabled={disabled} />
      <Hotkey keys="ArrowLeft" action="seekStep" value={-5} disabled={disabled} />
      <Hotkey keys="l" action="seekStep" value={10} disabled={disabled} />
      <Hotkey keys="j" action="seekStep" value={-10} disabled={disabled} />
      <Hotkey keys="ArrowUp" action="volumeStep" value={0.05} disabled={disabled} />
      <Hotkey keys="ArrowDown" action="volumeStep" value={-0.05} disabled={disabled} />
      <Hotkey keys="0-9" action="seekToPercent" disabled={disabled} />
      <Hotkey keys="Home" action="seekToPercent" value={0} disabled={disabled} />
      <Hotkey keys="End" action="seekToPercent" value={100} disabled={disabled} />
      <Hotkey keys=">" action="speedUp" disabled={disabled} />
      <Hotkey keys="<" action="speedDown" disabled={disabled} />

      <Gesture type="tap" action="togglePaused" pointer="mouse" region="center" disabled={disabled} />
      <Gesture type="tap" action="toggleControls" pointer="touch" disabled={disabled} />
      <Gesture type="doubletap" action="seekStep" value={-10} region="left" disabled={disabled} />
      <Gesture type="doubletap" action="toggleFullscreen" region="center" disabled={disabled} />
      <Gesture type="doubletap" action="seekStep" value={10} region="right" disabled={disabled} />
    </>
  );
}
