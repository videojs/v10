import { YouTubeVideo } from '@videojs/react/media/youtube-video';

export default function BasicUsage() {
  return (
    <div className="youtube-video">
      <YouTubeVideo src="{{VJS10_DEMO_YOUTUBE}}" controls />
    </div>
  );
}
