import { PauseIcon, PlayIcon, SpeakerLoudIcon, SpeakerOffIcon } from '@radix-ui/react-icons';
import { Container, selectPlayback, selectVolume, usePlayer } from '@videojs/react';
import { Video, VideoPlayer } from '@videojs/react/video';
import { Toggle } from 'radix-ui';

// Radix has no Button primitive, so a plain <button> reads the playback feature and calls its action.
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

// Radix Toggle is a controlled component: `pressed` comes from player state, the change handler dispatches the action.
function MuteToggle() {
  const volume = usePlayer(selectVolume);
  // The volume feature reports what the platform allows; hide the control where muting is not supported.
  if (!volume || volume.mutedAvailability === 'unsupported') return null;

  return (
    <Toggle.Root
      className="radix-player__button"
      aria-label={volume.muted ? 'Unmute' : 'Mute'}
      pressed={volume.muted}
      onPressedChange={() => volume.toggleMuted()}
    >
      {volume.muted ? <SpeakerOffIcon /> : <SpeakerLoudIcon />}
    </Toggle.Root>
  );
}

export default function PlayAndMute() {
  return (
    <VideoPlayer>
      <Container className="radix-player">
        <Video src="{{VJS10_DEMO_VIDEO_MP4}}" poster="{{VJS10_DEMO_POSTER}}" preload="metadata" muted playsInline />
        <div className="radix-player__bar">
          <PlayButton />
          <MuteToggle />
        </div>
      </Container>
    </VideoPlayer>
  );
}
