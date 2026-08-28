import * as $ from '@videojs/core/vjsc';

import type { SkinComponentMeta } from '../meta';

export interface LivePlaybackHotkeysProps {
  disabled?: boolean | undefined;
}

export function LivePlaybackHotkeys({ disabled = false }: LivePlaybackHotkeysProps = {}) {
  return (
    <>
      <$.Hotkey disabled={disabled} keys="Space" action="togglePaused" />
      <$.Hotkey disabled={disabled} keys="k" action="togglePaused" />
      <$.Hotkey disabled={disabled} keys="m" action="toggleMuted" />
      <$.Hotkey disabled={disabled} keys="ArrowUp" action="volumeStep" value={0.05} />
      <$.Hotkey disabled={disabled} keys="ArrowDown" action="volumeStep" value={-0.05} />
    </>
  );
}

export const meta = {
  name: 'live-playback-hotkeys',
  type: 'component',
  title: 'Live Playback Hotkeys',
  description: 'Keyboard controls for live playback and volume without on-demand seeking or speed changes.',
} as const satisfies SkinComponentMeta;
