import { PauseIcon, PlayIcon } from '@radix-ui/react-icons';
import { pauseText, playText } from '@videojs/core/i18n/text/buttons';
import { seekText } from '@videojs/core/i18n/text/slider';
import { Container, selectBuffer, selectPlayback, selectTime, usePlayer } from '@videojs/react';
import { useTranslator } from '@videojs/react/i18n';
import { Video, VideoPlayer } from '@videojs/react/video';
import { formatTime } from '@videojs/utils/time';
import { Slider } from 'radix-ui';
import { useState } from 'react';

function PlayButton() {
  const playback = usePlayer(selectPlayback);
  const t = useTranslator();

  if (!playback) return null;

  return (
    <button
      type="button"
      className="radix-player__button"
      aria-label={t(playback.paused ? playText : pauseText)}
      onClick={() => playback.togglePaused()}
    >
      {playback.paused ? <PlayIcon /> : <PauseIcon />}
    </button>
  );
}

function SeekSlider() {
  const time = usePlayer(selectTime);
  const buffer = usePlayer(selectBuffer);
  const t = useTranslator();
  // While dragging, show the pointer value; the seek happens on commit so playback does not stutter.
  const [dragValue, setDragValue] = useState<number | null>(null);

  if (!time || !Number.isFinite(time.duration) || time.duration <= 0) return null;

  const value = dragValue ?? time.currentTime;
  const bufferedEnd = buffer?.buffered.at(-1)?.[1] ?? 0;

  return (
    <Slider.Root
      className="radix-player__slider"
      min={0}
      max={time.duration}
      step={0.1}
      value={[value]}
      onValueChange={([next]) => setDragValue(next ?? null)}
      onValueCommit={([next]) => {
        setDragValue(null);

        if (next !== undefined) time.seek(next);
      }}
    >
      <Slider.Track className="radix-player__track">
        <div className="radix-player__buffer" style={{ width: `${(bufferedEnd / time.duration) * 100}%` }} />
        <Slider.Range className="radix-player__range" />
      </Slider.Track>
      <Slider.Thumb
        className="radix-player__thumb"
        aria-label={t(seekText)}
        aria-valuetext={formatTime(value, time.duration)}
      />
    </Slider.Root>
  );
}

function TimeDisplay() {
  const time = usePlayer(selectTime);
  if (!time) return null;

  return (
    <span className="radix-player__time">
      {formatTime(time.currentTime, time.duration)} / {formatTime(time.duration)}
    </span>
  );
}

export default function SeekSliderDemo() {
  return (
    <VideoPlayer>
      <Container className="radix-player">
        <Video src="{{VJS10_DEMO_VIDEO_MP4}}" poster="{{VJS10_DEMO_POSTER}}" preload="metadata" muted playsInline />
        <div className="radix-player__bar">
          <PlayButton />
          <SeekSlider />
          <TimeDisplay />
        </div>
      </Container>
    </VideoPlayer>
  );
}
