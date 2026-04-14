import { NativeHlsVideo } from '@videojs/react/media/native-hls-video';

export default function BasicUsage() {
  return (
    <NativeHlsVideo
      className="native-hls-video"
      src="https://stream.mux.com/VcmKA6aqzIzlg3MayLJDnbF55kX00mds028Z65QxvBYaA.m3u8"
      autoPlay
      muted
      playsInline
      loop
    />
  );
}
