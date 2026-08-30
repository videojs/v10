import * as $ from '@videojs/core/vjsc';

import { PlaybackHotkeys } from '../shared/playback-hotkeys';

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
