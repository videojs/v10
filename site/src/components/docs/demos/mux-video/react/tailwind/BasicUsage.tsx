import { MuxVideo } from '@videojs/react/media/mux-video';

export default function BasicUsage() {
  return (
    <MuxVideo
      className="aspect-video w-full"
      src="{{VJS10_DEMO_VIDEO_HLS}}"
      autoPlay
      muted
      playsInline
      loop
      crossOrigin="anonymous"
    />
  );
}
