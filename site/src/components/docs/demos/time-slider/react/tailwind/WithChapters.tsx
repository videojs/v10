import { Container, createPlayer, TimeSlider } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const { Player } = createPlayer({ features: videoFeatures });

export default function WithChapters() {
  return (
    <Player>
      <Container className="relative">
        <Video
          className="w-full"
          src="{{VJS10_DEMO_VIDEO_MP4}}"
          autoPlay
          muted
          playsInline
          loop
          crossOrigin="anonymous"
        >
          <track kind="chapters" src="/docs/demos/time-slider/chapters.vtt" srcLang="en" default />
        </Video>
        <TimeSlider.Root className="absolute inset-x-3 bottom-2 flex h-5 cursor-pointer items-center text-white">
          <TimeSlider.Chapters
            className="relative h-full w-full"
            renderChapter={(props) => (
              <div
                {...props}
                className="absolute inset-0 flex items-center [clip-path:inset(0_calc(100%_-_var(--media-slider-chapter-end))_0_var(--media-slider-chapter-start))]"
              >
                <TimeSlider.Track className="absolute inset-x-0 h-1 overflow-hidden rounded-full bg-white/30 transition-[height] duration-150 in-data-highlighted:h-1.75 [clip-path:inset(0_calc(100%_-_var(--media-slider-chapter-end)_+_2px)_0_calc(var(--media-slider-chapter-start)_+_2px)_round_9999px)]">
                  <TimeSlider.Buffer className="absolute inset-y-0 left-0 w-(--media-slider-buffer) rounded-[inherit] bg-white/30 transition-[width] duration-200 ease-linear" />
                  <TimeSlider.Fill className="absolute inset-y-0 left-0 w-(--media-slider-fill) rounded-[inherit] bg-white transition-[width] duration-200 ease-linear in-data-dragging:w-(--media-slider-pointer) in-data-dragging:duration-0" />
                </TimeSlider.Track>
              </div>
            )}
          />
          <TimeSlider.Thumb className="absolute top-1/2 left-(--media-slider-fill) size-3 -translate-1/2 rounded-full bg-white in-data-dragging:left-(--media-slider-pointer)" />
          <TimeSlider.Preview className="pointer-events-none absolute bottom-full left-(--media-slider-pointer) flex -translate-x-1/2 -translate-y-1 gap-1.5 rounded-sm bg-black/80 px-1.75 py-0.75 whitespace-nowrap text-white opacity-0 in-data-pointing:opacity-100 in-data-interactive:not-in-data-pointing:opacity-100">
            <TimeSlider.ChapterTitle className="empty:hidden" />
            <TimeSlider.Value type="pointer" />
          </TimeSlider.Preview>
        </TimeSlider.Root>
      </Container>
    </Player>
  );
}
