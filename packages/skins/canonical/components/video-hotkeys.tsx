import * as $ from '@videojs/core/components';

export function VideoHotkeys() {
  return (
    <>
      <$.Hotkey keys="Space" action="togglePaused" />
      <$.Hotkey keys="k" action="togglePaused" />
      <$.Hotkey keys="m" action="toggleMuted" />
      <$.Hotkey keys="f" action="toggleFullscreen" />
      <$.Hotkey keys="c" action="toggleSubtitles" />
      <$.Hotkey keys="i" action="togglePictureInPicture" />
      <$.Hotkey keys="ArrowRight" action="seekStep" value={5} />
      <$.Hotkey keys="ArrowLeft" action="seekStep" value={-5} />
      <$.Hotkey keys="l" action="seekStep" value={10} />
      <$.Hotkey keys="j" action="seekStep" value={-10} />
      <$.Hotkey keys="ArrowUp" action="volumeStep" value={0.05} />
      <$.Hotkey keys="ArrowDown" action="volumeStep" value={-0.05} />
      <$.Hotkey keys="0-9" action="seekToPercent" />
      <$.Hotkey keys="Home" action="seekToPercent" value={0} />
      <$.Hotkey keys="End" action="seekToPercent" value={100} />
      <$.Hotkey keys=">" action="speedUp" />
      <$.Hotkey keys="<" action="speedDown" />
    </>
  );
}
