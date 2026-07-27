import { DashVideo } from '@videojs/react/media/dash-video';

export default function BasicUsage() {
  return <DashVideo className="dash-video" src="{{VJS10_DEMO_DASH}}" autoPlay muted playsInline loop />;
}
