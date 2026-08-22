import { Container, createPlayer, Slider, TimeSlider } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const { Player } = createPlayer({ features: videoFeatures });

export default function BasicUsage() {
  return (
    <Player>
      <Container className="media-container">
        <Video src="{{VJS10_DEMO_VIDEO_MP4}}" autoPlay muted playsInline loop crossOrigin="anonymous">
          <track kind="metadata" label="thumbnails" src="{{VJS10_DEMO_STORYBOARD_VTT}}" default />
        </Video>
        <TimeSlider.Root className="media-time-slider">
          <TimeSlider.Track className="media-slider-track">
            <TimeSlider.Fill className="media-slider-fill" />
          </TimeSlider.Track>
          <Slider.Thumbnail className="media-slider-thumbnail" />
        </TimeSlider.Root>
      </Container>
    </Player>
  );
}
