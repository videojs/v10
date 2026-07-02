import { HlsJsVideo } from '@videojs/react/media/hlsjs-video';

export default function BasicUsage() {
  return (
    <HlsJsVideo
      className="hlsjs-video"
      src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM.m3u8"
      autoPlay
      muted
      playsInline
      loop
    />
  );
}
