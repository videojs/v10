import { MuxVideo } from '@videojs/react/media/mux-video';

export default function BasicUsage() {
  return (
    <MuxVideo
      className="mux-video"
      src="https://stream.mux.com/VcmKA6aqzIzlg3MayLJDnbF55kX00mds028Z65QxvBYaA.m3u8"
      autoPlay
      muted
      playsInline
      loop
      crossOrigin="anonymous"
    />
  );
}
