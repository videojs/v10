import type { CuePoint } from '@videojs/core/dom/media/cue-points';
import { AddCuePointField } from './add-cue-point-field';
import { ApplyNumberField, Field } from './fields';
import { formatTime } from './format';
import { PauseIcon, PlayIcon } from './icons';
import { useMediaLog } from './media-log';
import { bool, setParam } from './params';
import { Player, type TracksMedia } from './player';
import { SET_BUTTON_CLASS, SLIDER_CLASS } from './styles';
import { AudioTrackSelect, QualitySelect, TextTrackSelect } from './track-selects';
import { useMediaSnapshot, useRestoreFromParams } from './use-media-state';

/**
 * The controls panel. Every interaction calls the media API directly, logs the
 * call as an action, persists it to a URL param, and mirrors displayed values
 * from the media's events.
 */
export function Controls({ onAddCuePoint }: { onAddCuePoint: (cuePoint: CuePoint) => void }) {
  const media = Player.useMedia() as TracksMedia | null;
  const { log } = useMediaLog();
  const snapshot = useMediaSnapshot(media);
  const { paused, currentTime, duration, volume, muted } = snapshot;

  useRestoreFromParams(media);

  const hasDuration = Number.isFinite(duration) && duration > 0;

  const togglePlay = () => {
    if (!media) return;
    if (media.paused) {
      media.play().catch(() => {});
      log('action', 'media.play()');
      setParam('paused', '0');
    } else {
      media.pause();
      log('action', 'media.pause()');
      setParam('paused', '1');
    }
  };

  // Enter the given presentation mode, then leave it after 3 seconds.
  const presentFor3s = async (
    enter: 'requestFullscreen' | 'requestPictureInPicture',
    leave: 'exitFullscreen' | 'exitPictureInPicture'
  ) => {
    if (!media?.[enter]) return;
    try {
      await media[enter]?.();
    } catch {
      return;
    }
    log('action', `media.${enter}()`);
    window.setTimeout(() => {
      media[leave]?.();
      log('action', `media.${leave}()`);
    }, 3000);
  };

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={togglePlay}
        disabled={!media}
        aria-label={paused ? 'Play' : 'Pause'}
        className="inline-flex items-center justify-center gap-2 rounded-xs bg-bright-yellow px-8 py-3 font-display text-sm uppercase tracking-wide text-faded-black transition-colors hover:bg-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-faded-black disabled:cursor-not-allowed disabled:opacity-50"
      >
        {paused ? <PlayIcon /> : <PauseIcon />}
        {paused ? 'Play' : 'Pause'}
      </button>

      <Field label="Current time">
        <input
          type="range"
          min={0}
          max={hasDuration ? duration : 0}
          step={0.1}
          value={Math.min(currentTime, hasDuration ? duration : 0)}
          disabled={!media || !hasDuration}
          aria-label="Seek"
          onChange={(event) => {
            if (media) media.currentTime = Number(event.target.value);
          }}
          onPointerUp={() => {
            if (!media) return;
            log('action', `media.currentTime = ${media.currentTime.toFixed(1)}`);
            setParam('time', media.currentTime.toFixed(1));
          }}
          onKeyUp={() => {
            if (!media) return;
            log('action', `media.currentTime = ${media.currentTime.toFixed(1)}`);
            setParam('time', media.currentTime.toFixed(1));
          }}
          className={SLIDER_CLASS}
        />
        <span className="font-mono text-xs text-warm-gray tabular-nums">
          {formatTime(currentTime)} / {hasDuration ? formatTime(duration) : '–:––'}
        </span>
        <ApplyNumberField
          ariaLabel="Set current time in seconds"
          placeholder="Set time (seconds)"
          min="0"
          step="0.1"
          disabled={!media}
          onApply={(value) => {
            if (!media) return;
            media.currentTime = value;
            log('action', `media.currentTime = ${value}`);
            setParam('time', String(value));
          }}
        />
      </Field>

      <Field label="Playback rate">
        <ApplyNumberField
          ariaLabel="Set playback rate"
          placeholder="Set rate (e.g. 1.5)"
          min="0"
          step="0.25"
          disabled={!media}
          onApply={(value) => {
            if (!media || value <= 0) return;
            media.playbackRate = value;
            log('action', `media.playbackRate = ${value}`);
            setParam('rate', String(value));
          }}
        />
      </Field>

      <Field label="Volume">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (!media) return;
              const next = !media.muted;
              media.muted = next;
              log('action', `media.muted = ${next}`);
              setParam('muted', bool(next));
            }}
            disabled={!media}
            className={SET_BUTTON_CLASS}
          >
            {muted ? 'Unmute' : 'Mute'}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            disabled={!media}
            aria-label="Volume"
            onChange={(event) => {
              if (!media) return;
              media.volume = Number(event.target.value);
              if (media.muted) media.muted = false;
            }}
            onPointerUp={() => {
              if (!media) return;
              log('action', `media.volume = ${media.volume.toFixed(2)}`);
              setParam('volume', media.volume.toFixed(2));
              setParam('muted', bool(media.muted));
            }}
            onKeyUp={() => {
              if (!media) return;
              log('action', `media.volume = ${media.volume.toFixed(2)}`);
              setParam('volume', media.volume.toFixed(2));
              setParam('muted', bool(media.muted));
            }}
            className={SLIDER_CLASS}
          />
        </div>
        <span className="font-mono text-xs text-warm-gray tabular-nums">{Math.round((muted ? 0 : volume) * 100)}%</span>
      </Field>

      <Field label="Presentation">
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => presentFor3s('requestFullscreen', 'exitFullscreen')}
            disabled={!media}
            className={`${SET_BUTTON_CLASS} w-full`}
          >
            Fullscreen for 3s
          </button>
          <button
            type="button"
            onClick={() => presentFor3s('requestPictureInPicture', 'exitPictureInPicture')}
            disabled={!media}
            className={`${SET_BUTTON_CLASS} w-full`}
          >
            Picture-in-Picture for 3s
          </button>
        </div>
      </Field>

      <Field label="Add cue point">
        <AddCuePointField onAdd={onAddCuePoint} />
      </Field>

      <Field label="Quality">
        <QualitySelect />
      </Field>

      <Field label="Text track">
        <TextTrackSelect />
      </Field>

      <Field label="Audio track">
        <AudioTrackSelect />
      </Field>
    </div>
  );
}
