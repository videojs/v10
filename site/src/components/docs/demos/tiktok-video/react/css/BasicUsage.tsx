import { TikTokVideo } from '@videojs/react/media/tiktok-video';

export default function BasicUsage() {
  return (
    <div className="tiktok-video">
      <TikTokVideo src="{{VJS10_DEMO_TIKTOK}}" controls />
    </div>
  );
}
