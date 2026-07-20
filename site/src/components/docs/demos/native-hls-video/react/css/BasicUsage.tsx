import { NativeHlsVideo } from '@videojs/react/media/native-hls-video';

export default function BasicUsage() {
  return <NativeHlsVideo className="native-hls-video" src="{{VJS10_DEMO_VIDEO_HLS}}" autoPlay muted playsInline loop />;
}
