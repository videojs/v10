import * as $ from '@videojs/core/vjsc';

import type { SkinComponentMeta } from '../meta';

export interface VideoHotkeysProps {
  disabled?: boolean | undefined;
}

export function VideoHotkeys({ disabled = false }: VideoHotkeysProps = {}) {
  return (
    <>
      <$.Hotkey disabled={disabled} keys="Space" action="togglePaused" />
      <$.Hotkey disabled={disabled} keys="k" action="togglePaused" />
      <$.Hotkey disabled={disabled} keys="m" action="toggleMuted" />
      <$.Hotkey disabled={disabled} keys="f" action="toggleFullscreen" />
      <$.Hotkey disabled={disabled} keys="c" action="toggleSubtitles" />
      <$.Hotkey disabled={disabled} keys="i" action="togglePictureInPicture" />
      <$.Hotkey disabled={disabled} keys="ArrowRight" action="seekStep" value={5} />
      <$.Hotkey disabled={disabled} keys="ArrowLeft" action="seekStep" value={-5} />
      <$.Hotkey disabled={disabled} keys="l" action="seekStep" value={10} />
      <$.Hotkey disabled={disabled} keys="j" action="seekStep" value={-10} />
      <$.Hotkey disabled={disabled} keys="ArrowUp" action="volumeStep" value={0.05} />
      <$.Hotkey disabled={disabled} keys="ArrowDown" action="volumeStep" value={-0.05} />
      <$.Hotkey disabled={disabled} keys="0-9" action="seekToPercent" />
      <$.Hotkey disabled={disabled} keys="Home" action="seekToPercent" value={0} />
      <$.Hotkey disabled={disabled} keys="End" action="seekToPercent" value={100} />
      <$.Hotkey disabled={disabled} keys=">" action="speedUp" />
      <$.Hotkey disabled={disabled} keys="<" action="speedDown" />
    </>
  );
}

export const meta = {
  name: 'video-hotkeys',
  type: 'component',
  title: 'Video Hotkeys',
  description: 'The standard keyboard controls for on-demand video playback.',
} as const satisfies SkinComponentMeta;
