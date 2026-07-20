import { SimpleHlsAudioOnly } from '@videojs/react/media/simple-hls-audio-only';

export default function BasicUsage() {
  return <SimpleHlsAudioOnly className="simple-hls-audio-only" src="{{VJS10_DEMO_VIDEO_HLS}}" controls />;
}
