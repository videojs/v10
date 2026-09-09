import { PauseIcon, PlayIcon } from '@radix-ui/react-icons';
import { Container, selectBuffer, selectPlayback, selectTime, usePlayer } from '@videojs/react';
import { Video, VideoPlayer } from '@videojs/react/video';
import { Slider } from 'radix-ui';
import { useState } from 'react';

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return '0:00';

  const total = Math.floor(Math.max(0, seconds));
  const minutes = Math.floor(total / 60);
  const rest = String(total % 60).padStart(2, '0');

  return `${minutes}:${rest}`;
}

function PlayButton() {
  const playback = usePlayer(selectPlayback);
  if (!playback) return null;

  return (
    <button
      type="button"
      className="radix-player__button"
      aria-label={playback.paused ? 'Play' : 'Pause'}
      onClick={() => playback.togglePaused()}
    >
      {playback.paused ? <PlayIcon /> : <PauseIcon />}
    </button>
  );
}

function SeekSlider() {
  const time = usePlayer(selectTime);
  const buffer = usePlayer(selectBuffer);
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
      <Slider.Thumb className="radix-player__thumb" aria-label="Seek" aria-valuetext={formatTime(value)} />
    </Slider.Root>
  );
}

function TimeDisplay() {
  const time = usePlayer(selectTime);
  if (!time) return null;

  return (
    <span className="radix-player__time">
      {formatTime(time.currentTime)} / {formatTime(time.duration)}
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
