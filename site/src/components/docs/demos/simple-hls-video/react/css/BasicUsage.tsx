import { SimpleHlsVideo } from '@videojs/react/media/simple-hls-video';

export default function BasicUsage() {
  return (
    <SimpleHlsVideo
      className="simple-hls-video"
      src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM.m3u8"
      autoPlay
      muted
      playsInline
      loop
    />
  );
}
