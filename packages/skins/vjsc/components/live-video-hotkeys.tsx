import * as $ from '@videojs/core/vjsc';

import type { SkinComponentMeta } from '../meta';
import { LivePlaybackHotkeys } from './live-playback-hotkeys';

export interface LiveVideoHotkeysProps {
  disabled?: boolean | undefined;
}

export function LiveVideoHotkeys({ disabled = false }: LiveVideoHotkeysProps = {}) {
  return (
    <>
      <LivePlaybackHotkeys disabled={disabled} />
      <$.Hotkey disabled={disabled} keys="f" action="toggleFullscreen" />
      <$.Hotkey disabled={disabled} keys="c" action="toggleSubtitles" />
      <$.Hotkey disabled={disabled} keys="i" action="togglePictureInPicture" />
    </>
  );
}

export const meta = {
  name: 'live-video-hotkeys',
  type: 'component',
  title: 'Live Video Hotkeys',
  description: 'Keyboard controls for live video playback, volume, captions, fullscreen, and picture-in-picture.',
} as const satisfies SkinComponentMeta;
