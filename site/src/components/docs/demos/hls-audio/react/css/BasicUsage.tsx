import { HlsAudio } from '@videojs/react/media/hls-audio';

export default function BasicUsage() {
  return <HlsAudio className="hls-audio" src="{{VJS10_DEMO_VIDEO_HLS}}" controls />;
}
