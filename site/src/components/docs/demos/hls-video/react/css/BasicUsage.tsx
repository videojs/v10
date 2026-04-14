import { HlsVideo } from '@videojs/react/media/hls-video';

export default function BasicUsage() {
  return (
    <HlsVideo
      className="hls-video"
      src="https://stream.mux.com/VcmKA6aqzIzlg3MayLJDnbF55kX00mds028Z65QxvBYaA.m3u8"
      autoPlay
      muted
      playsInline
      loop
    />
  );
}
