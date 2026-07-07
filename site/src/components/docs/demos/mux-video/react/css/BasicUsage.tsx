import { MuxVideo } from '@videojs/react/media/mux-video';

export default function BasicUsage() {
  return (
    <MuxVideo
      className="mux-video"
      src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM.m3u8"
      autoPlay
      muted
      playsInline
      loop
      crossOrigin="anonymous"
    />
  );
}
