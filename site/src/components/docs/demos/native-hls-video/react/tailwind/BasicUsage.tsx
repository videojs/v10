import { NativeHlsVideo } from '@videojs/react/media/native-hls-video';

export default function BasicUsage() {
  return (
    <NativeHlsVideo className="aspect-video w-full" src="{{VJS10_DEMO_VIDEO_HLS}}" autoPlay muted playsInline loop />
  );
}
