import { SimpleHlsVideo } from '@videojs/react/media/simple-hls-video';

export default function BasicUsage() {
  return (
    <SimpleHlsVideo
      className="simple-hls-video"
      src="https://stream.mux.com/VcmKA6aqzIzlg3MayLJDnbF55kX00mds028Z65QxvBYaA.m3u8"
      autoPlay
      muted
      playsInline
      loop
    />
  );
}
