import { SimpleHlsVideo } from '@videojs/react/media/simple-hls-video';

export default function BasicUsage() {
  return <SimpleHlsVideo className="simple-hls-video" src="{{VJS10_DEMO_VIDEO_HLS}}" autoPlay muted playsInline loop />;
}
