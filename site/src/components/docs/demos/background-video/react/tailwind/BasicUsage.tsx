import { BackgroundVideo } from '@videojs/react/media/background-video';

export default function BasicUsage() {
  return (
    <div className="relative aspect-video w-full">
      <BackgroundVideo src="{{VJS10_DEMO_BACKGROUND_VIDEO_MP4}}" />
    </div>
  );
}
