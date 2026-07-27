import { MuxAudio } from '@videojs/react/media/mux-audio';

export default function BasicUsage() {
  return <MuxAudio className="mux-audio" src="{{VJS10_DEMO_VIDEO_HLS}}" crossOrigin="anonymous" controls />;
}
