import { Slider } from '@/ui/slider';
import { TimeSlider as TimeSliderPrimitive } from '@/ui/time-slider';
import { SpinnerIcon } from '@/icons';

export function TimeSlider() {
  return (
    <TimeSliderPrimitive.Root className="media-slider">
      <TimeSliderPrimitive.Chapters
        className="media-slider-chapters"
        renderChapter={(props) => (
          <div {...props} className="media-slider-chapter">
            <TimeSliderPrimitive.Track className="media-slider-chapter-track">
              <TimeSliderPrimitive.Buffer className="media-slider-buffer" />
              <TimeSliderPrimitive.Fill className="media-slider-fill" />
            </TimeSliderPrimitive.Track>
          </div>
        )}
      >
        <TimeSliderPrimitive.Track className="media-slider-track">
          <TimeSliderPrimitive.Buffer className="media-slider-buffer" />
          <TimeSliderPrimitive.Fill className="media-slider-fill" />
        </TimeSliderPrimitive.Track>
      </TimeSliderPrimitive.Chapters>
      <TimeSliderPrimitive.Thumb className="media-slider-thumb" />
      <TimeSliderPrimitive.Preview className="media-slider-preview" overflow="visible">
        <div className="media-surface media-thumbnail">
          <Slider.Thumbnail className="media-thumbnail-image" />
          <SpinnerIcon className="media-spinner-icon" />
        </div>
        <div className="media-preview-value">
          <TimeSliderPrimitive.ChapterTitle className="media-chapter-title" />
          <TimeSliderPrimitive.Value className="media-slider-value" type="pointer" />
        </div>
      </TimeSliderPrimitive.Preview>
    </TimeSliderPrimitive.Root>
  );
}
