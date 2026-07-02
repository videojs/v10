import type { CuePoint } from '@videojs/core/dom/media/cue-points';
import { useEffect, useState } from 'react';
import { AddCuePointField } from './add-cue-point-field';
import { BarSlider } from './bar-slider';
import { ApplyNumberField, Field } from './fields';
import { cueValue, formatTime, num } from './format';
import { CloseIcon, PauseIcon, PlayIcon } from './icons';
import { useMediaLog } from './media-log';
import { bool, setParam } from './params';
import { Player, type TracksMedia } from './player';
import {
  ICON_BUTTON_CLASS,
  PANEL_CLASS,
  TE_SOCKET_CLASS,
  TEXT_BUTTON_CLASS,
  TEXT_BUTTON_ORANGE_CLASS,
  TEXT_BUTTON_OUTLINE_CLASS,
} from './styles';
import { AudioTrackSelect, QualitySelect, TextTrackSelect } from './track-selects';
import { useMediaSnapshot, useRestoreFromParams } from './use-media-state';

/**
 * The primary transport bar — play, seek, mute, volume, picture-in-picture, and
 * fullscreen. Lives in its own bordered box so it can stay pinned under the
 * player. Every interaction calls the media API directly and logs the call.
 */
export function TransportControls() {
  const media = Player.useMedia() as TracksMedia | null;
  const { log } = useMediaLog();
  const snapshot = useMediaSnapshot(media);
  const { paused, currentTime, duration, volume, muted, buffered } = snapshot;

  useRestoreFromParams(media);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [remoteConnected, setRemoteConnected] = useState(false);

  // `loop` has no change event; re-read it when metadata (re)loads, e.g. after restore.
  useEffect(() => {
    if (!media) return;
    const controller = new AbortController();
    const sync = () => setIsLooping(Boolean(media.loop));
    media.addEventListener('loadedmetadata', sync, { signal: controller.signal });
    sync();
    return () => controller.abort();
  }, [media]);

  // Fullscreen has no dedicated media event; track it through the document.
  useEffect(() => {
    if (!media) return;
    const controller = new AbortController();
    const sync = () => setIsFullscreen(Boolean(media.isFullscreen));
    document.addEventListener('fullscreenchange', sync, { signal: controller.signal });
    document.addEventListener('webkitfullscreenchange', sync, { signal: controller.signal });
    sync();
    return () => controller.abort();
  }, [media]);

  useEffect(() => {
    if (!media) return;
    const controller = new AbortController();
    const sync = () => setIsPictureInPicture(Boolean(media.isPictureInPicture));
    media.addEventListener('enterpictureinpicture', sync, { signal: controller.signal });
    media.addEventListener('leavepictureinpicture', sync, { signal: controller.signal });
    sync();
    return () => controller.abort();
  }, [media]);

  useEffect(() => {
    if (!media) return;
    const remote = media.remote;
    const controller = new AbortController();
    const sync = () => setRemoteConnected(remote.state === 'connected');
    remote.addEventListener('connecting', sync, { signal: controller.signal });
    remote.addEventListener('connect', sync, { signal: controller.signal });
    remote.addEventListener('disconnect', sync, { signal: controller.signal });
    sync();
    return () => controller.abort();
  }, [media]);

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

  const toggleFullscreen = async () => {
    if (!media) return;
    try {
      if (media.isFullscreen) {
        await media.exitFullscreen();
        log('action', 'media.exitFullscreen()');
      } else {
        await media.requestFullscreen();
        log('action', 'media.requestFullscreen()');
      }
    } catch {
      // Ignore rejected presentation requests (e.g. user gesture required).
    }
  };

  const toggleLoop = () => {
    if (!media) return;
    const next = !media.loop;
    media.loop = next;
    setIsLooping(next);
    log('action', `media.loop = ${next}`);
    setParam('loop', bool(next));
  };

  const togglePictureInPicture = async () => {
    if (!media) return;
    try {
      if (media.isPictureInPicture) {
        await media.exitPictureInPicture();
        log('action', 'media.exitPictureInPicture()');
      } else {
        await media.requestPictureInPicture();
        log('action', 'media.requestPictureInPicture()');
      }
    } catch {
      // Ignore rejected presentation requests (e.g. user gesture required).
    }
  };

  const promptRemote = () => {
    if (!media) return;
    media.remote.prompt().catch(() => {
      // No remote playback devices available, or the prompt was dismissed.
    });
    log('action', 'media.remote.prompt()');
  };

  return (
    <div className={`panel-raised flex flex-col gap-3 sm:flex-row sm:items-center ${PANEL_CLASS} p-4`}>
      <div className="flex items-center gap-3 sm:flex-1">
        <span className={TE_SOCKET_CLASS}>
          <button
            type="button"
            onClick={togglePlay}
            disabled={!media}
            aria-label={paused ? 'Play' : 'Pause'}
            title={paused ? 'Play' : 'Pause'}
            className={ICON_BUTTON_CLASS}
          >
            {paused ? <PlayIcon /> : <PauseIcon />}
          </button>
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <BarSlider
            min={0}
            max={hasDuration ? duration : 0}
            step={0.1}
            value={Math.min(currentTime, hasDuration ? duration : 0)}
            buffered={buffered}
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
          />
          <span className="font-mono text-xs text-warm-gray tabular-nums dark:text-manila-dark">
            {formatTime(currentTime)} / {hasDuration ? formatTime(duration) : '–:––'}
          </span>
        </div>

        <span className={TE_SOCKET_CLASS}>
          <button
            type="button"
            onClick={toggleLoop}
            disabled={!media}
            aria-pressed={isLooping}
            aria-label={isLooping ? 'Disable loop' : 'Enable loop'}
            title={isLooping ? 'Disable loop' : 'Enable loop'}
            className={isLooping ? TEXT_BUTTON_CLASS : TEXT_BUTTON_OUTLINE_CLASS}
          >
            loop
          </button>
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className={TE_SOCKET_CLASS}>
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
            aria-pressed={muted}
            aria-label={muted ? 'Unmute' : 'Mute'}
            title={muted ? 'Unmute' : 'Mute'}
            className={muted ? TEXT_BUTTON_OUTLINE_CLASS : TEXT_BUTTON_ORANGE_CLASS}
          >
            mute
          </button>
        </span>

        <div className="flex flex-1 flex-col gap-1 sm:w-28 sm:flex-none">
          <BarSlider
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
          />
          <span className="font-mono text-xs text-warm-gray tabular-nums dark:text-manila-dark">
            {Math.round((muted ? 0 : volume) * 100)}%
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className={TE_SOCKET_CLASS}>
          <button
            type="button"
            onClick={togglePictureInPicture}
            disabled={!media}
            aria-label={isPictureInPicture ? 'Exit picture-in-picture' : 'Enter picture-in-picture'}
            title={isPictureInPicture ? 'Exit picture-in-picture' : 'Enter picture-in-picture'}
            aria-pressed={isPictureInPicture}
            className={isPictureInPicture ? TEXT_BUTTON_CLASS : TEXT_BUTTON_OUTLINE_CLASS}
          >
            pip
          </button>
        </span>

        <span className={TE_SOCKET_CLASS}>
          <button
            type="button"
            onClick={promptRemote}
            disabled={!media}
            aria-label="Remote playback"
            title="Remote playback"
            aria-pressed={remoteConnected}
            className={remoteConnected ? TEXT_BUTTON_CLASS : TEXT_BUTTON_OUTLINE_CLASS}
          >
            remote
          </button>
        </span>

        <span className={TE_SOCKET_CLASS}>
          <button
            type="button"
            onClick={toggleFullscreen}
            disabled={!media}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            aria-pressed={isFullscreen}
            className={isFullscreen ? TEXT_BUTTON_CLASS : TEXT_BUTTON_OUTLINE_CLASS}
          >
            full
          </button>
        </span>
      </div>
    </div>
  );
}

/**
 * The secondary controls — precise setters, cue points, and track selects —
 * split across two columns. Scrolls underneath the pinned transport bar.
 */
export function Controls({
  cuePoints,
  onAddCuePoint,
  onRemoveCuePoint,
}: {
  cuePoints: CuePoint[];
  onAddCuePoint: (cuePoint: CuePoint) => void;
  onRemoveCuePoint: (index: number) => void;
}) {
  const media = Player.useMedia() as TracksMedia | null;
  const { log } = useMediaLog();

  const seekToCuePoint = (time: number) => {
    if (!media) return;
    media.currentTime = time;
    log('action', `media.currentTime = ${num(time)}`);
    setParam('time', String(time));
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Setters */}
      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${PANEL_CLASS} p-6`}>
        <Field label="Set time">
          <ApplyNumberField
            ariaLabel="Set current time in seconds"
            placeholder="Seconds"
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
            placeholder="e.g. 1.5"
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
      </div>

      {/* Track selects */}
      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-3 ${PANEL_CLASS} p-6`}>
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

      {/* Cue points */}
      <div className={`${PANEL_CLASS} p-6`}>
        <Field label="Add cue point">
          <AddCuePointField onAdd={onAddCuePoint} />
          {cuePoints.length > 0 && (
            <table className="w-full border-collapse">
              <thead className="border-b border-faded-black dark:border-manila-dark">
                <tr>
                  <th className="px-2 py-1.5 text-left font-display text-xs uppercase tracking-wide text-faded-black dark:text-manila-light">
                    Time
                  </th>
                  <th className="w-full px-2 py-1.5 text-left font-display text-xs uppercase tracking-wide text-faded-black dark:text-manila-light">
                    Value
                  </th>
                  <th className="px-2 py-1.5">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {cuePoints.map((cuePoint, index) => (
                  // biome-ignore lint/a11y/useSemanticElements: a table row can't be a <button>; it acts as a seek control
                  <tr
                    key={`${cuePoint.time}:${cueValue(cuePoint.value)}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`Seek to ${num(cuePoint.time)} seconds`}
                    onClick={() => seekToCuePoint(cuePoint.time)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        seekToCuePoint(cuePoint.time);
                      }
                    }}
                    className="cursor-pointer border-b border-manila-dark transition-colors hover:bg-manila-25 dark:border-warm-gray dark:hover:bg-soot"
                  >
                    <td className="px-2 py-1.5 align-middle font-mono text-xs text-warm-gray tabular-nums dark:text-manila-dark">
                      {num(cuePoint.time)}s
                    </td>
                    <td className="px-2 py-1.5 align-middle font-mono text-xs break-words text-faded-black dark:text-manila-light">
                      {cueValue(cuePoint.value)}
                    </td>
                    <td className="px-2 py-1.5 text-right align-middle">
                      <button
                        type="button"
                        aria-label="Delete cue point"
                        onClick={(event) => {
                          event.stopPropagation();
                          onRemoveCuePoint(index);
                          log(
                            'action',
                            `config.cuePoints -= { time: ${num(cuePoint.time)}, value: ${JSON.stringify(cuePoint.value)} }`
                          );
                        }}
                        className="inline-flex size-6 shrink-0 items-center justify-center rounded-xs text-warm-gray transition-colors hover:bg-red hover:text-manila-light dark:text-manila-dark"
                      >
                        <CloseIcon />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Field>
      </div>
    </div>
  );
}
