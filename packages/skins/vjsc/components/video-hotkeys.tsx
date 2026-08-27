import * as $ from '@videojs/core/vjsc';

import type { SkinComponentMeta } from '../meta';
import { PlaybackHotkeys } from './playback-hotkeys';

export interface VideoHotkeysProps {
  disabled?: boolean | undefined;
}

export function VideoHotkeys({ disabled = false }: VideoHotkeysProps = {}) {
  return (
    <>
      <PlaybackHotkeys disabled={disabled} />
      <$.Hotkey disabled={disabled} keys="f" action="toggleFullscreen" />
      <$.Hotkey disabled={disabled} keys="c" action="toggleSubtitles" />
      <$.Hotkey disabled={disabled} keys="i" action="togglePictureInPicture" />
    </>
  );
}

export const meta = {
  name: 'video-hotkeys',
  type: 'component',
  title: 'Video Hotkeys',
  description: 'The standard keyboard controls for on-demand video playback.',
} as const satisfies SkinComponentMeta;
