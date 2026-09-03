import * as $ from '@videojs/core/vjsc';

import { LivePlaybackHotkeys } from '../shared/live-playback-hotkeys';

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
