import { MuxAudio } from '@videojs/react/media/mux-audio';

export default function BasicUsage() {
  return <MuxAudio className="h-13.5 w-full" src="{{VJS10_DEMO_VIDEO_HLS}}" crossOrigin="anonymous" controls />;
}
