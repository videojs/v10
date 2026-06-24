import type { MediaFull } from '@videojs/core';
import type { CuePoint } from '@videojs/core/dom/media/cue-points';
import { useState } from 'react';
import { useMediaLog } from './media-log';
import { Player } from './player';
import { NUMBER_INPUT_CLASS, SET_BUTTON_CLASS } from './styles';

/**
 * Add a cue point at the current time (entered text = value) by appending to
 * the `config.cuePoints` list, which is re-applied through the media config.
 */
export function AddCuePointField({ onAdd }: { onAdd: (cuePoint: CuePoint) => void }) {
  const media = Player.useMedia() as MediaFull | null;
  const { log } = useMediaLog();
  const [draft, setDraft] = useState('');

  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const value = draft.trim();
        if (!media || !value) return;

        const time = media.currentTime;
        onAdd({ time, value });
        log('action', `config.cuePoints += { time: ${time.toFixed(2)}, value: ${JSON.stringify(value)} }`);
        setDraft('');
      }}
    >
      <input
        type="text"
        value={draft}
        placeholder="Cue point data"
        aria-label="Cue point data"
        onChange={(event) => setDraft(event.target.value)}
        className={NUMBER_INPUT_CLASS}
      />
      <button type="submit" disabled={!media} className={SET_BUTTON_CLASS}>
        Add
      </button>
    </form>
  );
}
