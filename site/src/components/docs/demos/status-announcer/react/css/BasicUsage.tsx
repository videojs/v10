import {
  Container,
  createPlayer,
  MuteButton,
  PlayButton,
  StatusAnnouncer,
  TimeSlider,
  VolumeSlider,
} from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

import './BasicUsage.css';

const { Player } = createPlayer({ features: videoFeatures });

export default function BasicUsage() {
  return (
    <Player>
      <Container className="react-status-announcer-basic">
        <Video src="{{VJS10_DEMO_VIDEO_MP4}}" muted playsInline />
        <p className="react-status-announcer-basic-instructions">
          These controls announce status changes to screen readers.
        </p>
        <div className="react-status-announcer-basic-controls">
          <PlayButton
            className="react-status-announcer-basic-button"
            render={(props, state) => (
              <button {...props}>{state.ended ? 'Replay' : state.paused ? 'Play' : 'Pause'}</button>
            )}
          />
          <MuteButton
            className="react-status-announcer-basic-button"
            render={(props, state) => <button {...props}>{state.muted ? 'Unmute' : 'Mute'}</button>}
          />
          <VolumeSlider.Root className="react-status-announcer-basic-volume-slider">
            <VolumeSlider.Track className="react-status-announcer-basic-track">
              <VolumeSlider.Fill className="react-status-announcer-basic-fill" />
            </VolumeSlider.Track>
            <VolumeSlider.Thumb className="react-status-announcer-basic-thumb" />
          </VolumeSlider.Root>
        </div>
        <TimeSlider.Root className="react-status-announcer-basic-time-slider">
          <TimeSlider.Track className="react-status-announcer-basic-track">
            <TimeSlider.Buffer className="react-status-announcer-basic-buffer" />
            <TimeSlider.Fill className="react-status-announcer-basic-fill" />
          </TimeSlider.Track>
          <TimeSlider.Thumb className="react-status-announcer-basic-thumb" />
        </TimeSlider.Root>
        <StatusAnnouncer className="react-status-announcer-basic-announcer" />
      </Container>
    </Player>
  );
}
