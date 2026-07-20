import { HlsJsVideo } from '@videojs/react/media/hlsjs-video';

export default function BasicUsage() {
  return <HlsJsVideo className="hlsjs-video" src="{{VJS10_DEMO_VIDEO_HLS}}" autoPlay muted playsInline loop />;
}
