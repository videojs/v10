import { Container, createPlayer, TimeSlider } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const { Player } = createPlayer({ features: videoFeatures });

export default function WithChapters() {
  return (
    <Player>
      <Container className="media-container">
        <Video src="{{VJS10_DEMO_VIDEO_MP4}}" autoPlay muted playsInline loop crossOrigin="anonymous">
          <track kind="chapters" src="/docs/demos/time-slider/chapters.vtt" srcLang="en" default />
        </Video>
        <TimeSlider.Root className="media-time-slider">
          <TimeSlider.Chapters
            className="media-slider-chapters"
            renderChapter={(props) => (
              <div {...props} className="media-slider-chapter">
                <TimeSlider.Track className="media-slider-track">
                  <TimeSlider.Buffer className="media-slider-buffer" />
                  <TimeSlider.Fill className="media-slider-fill" />
                </TimeSlider.Track>
              </div>
            )}
          >
            <TimeSlider.Track className="media-slider-track">
              <TimeSlider.Buffer className="media-slider-buffer" />
              <TimeSlider.Fill className="media-slider-fill" />
            </TimeSlider.Track>
          </TimeSlider.Chapters>
          <TimeSlider.Thumb className="media-slider-thumb" />
          <TimeSlider.Preview className="media-slider-preview">
            <TimeSlider.ChapterTitle className="media-slider-chapter-title" />
            <TimeSlider.Value type="pointer" />
          </TimeSlider.Preview>
        </TimeSlider.Root>
      </Container>
    </Player>
  );
}
