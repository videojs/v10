import { HlsVideo } from '@videojs/react/media/hls-video';

export default function BasicUsage() {
  return <HlsVideo className="hls-video" src="{{VJS10_DEMO_VIDEO_HLS}}" autoPlay muted playsInline loop />;
}
