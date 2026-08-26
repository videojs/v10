import { ShakaVideo } from '@videojs/react/media/shaka-video';

export default function BasicUsage() {
  return <ShakaVideo className="shaka-video" src="{{VJS10_DEMO_DASH}}" autoPlay muted playsInline loop />;
}
