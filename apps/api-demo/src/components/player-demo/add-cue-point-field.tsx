import type { MediaFull } from '@videojs/core';
import type { CuePoint } from '@videojs/core/dom/media/cue-points';
import { type CSSProperties, useState } from 'react';
import { useMediaLog } from './media-log';
import { Player } from './player';
import { NUMBER_INPUT_CLASS, SET_BUTTON_CLASS } from './styles';

const TIME_INPUT_STYLE: CSSProperties = { width: '5rem', flex: '0 0 auto' };

/**
 * Add a cue point by appending to the `config.cuePoints` list (re-applied through
 * the media config). The time field seeks the media as you change it; the entered
 * value (or the current time when blank) becomes the cue point's `time`.
 */
export function AddCuePointField({ onAdd }: { onAdd: (cuePoint: CuePoint) => void }) {
  const media = Player.useMedia() as MediaFull | null;
  const { log } = useMediaLog();
  const [timeDraft, setTimeDraft] = useState('');
  const [valueDraft, setValueDraft] = useState('');

  const changeTime = (raw: string) => {
    setTimeDraft(raw);
    const next = Number(raw);
    if (media && raw.trim() !== '' && Number.isFinite(next)) media.currentTime = next;
  };

  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const value = valueDraft.trim();
        if (!media || !value) return;

        const parsed = Number(timeDraft);
        const time = timeDraft.trim() !== '' && Number.isFinite(parsed) ? parsed : media.currentTime;
        onAdd({ time, value });
        log('action', `config.cuePoints += { time: ${time.toFixed(2)}, value: ${JSON.stringify(value)} }`);
        setValueDraft('');
      }}
    >
      <input
        type="number"
        inputMode="decimal"
        min="0"
        step="0.1"
        value={timeDraft}
        placeholder="Time"
        aria-label="Cue point time in seconds"
        disabled={!media}
        onChange={(event) => changeTime(event.target.value)}
        className={NUMBER_INPUT_CLASS}
        style={TIME_INPUT_STYLE}
      />
      <input
        type="text"
        value={valueDraft}
        placeholder="Cue point data"
        aria-label="Cue point data"
        onChange={(event) => setValueDraft(event.target.value)}
        className={NUMBER_INPUT_CLASS}
      />
      <button type="submit" disabled={!media} className={SET_BUTTON_CLASS}>
        Add
      </button>
    </form>
  );
}
