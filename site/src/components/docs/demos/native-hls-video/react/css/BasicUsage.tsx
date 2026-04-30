import { NativeHlsVideo } from '@videojs/react/media/native-hls-video';

export default function BasicUsage() {
  return (
    <NativeHlsVideo
      className="native-hls-video"
      src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM.m3u8"
      autoPlay
      muted
      playsInline
      loop
    />
  );
}
