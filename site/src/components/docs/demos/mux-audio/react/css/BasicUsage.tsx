import { MuxAudio } from '@videojs/react/media/mux-audio';

export default function BasicUsage() {
  return (
    <MuxAudio
      className="mux-audio"
      src="https://stream.mux.com/VcmKA6aqzIzlg3MayLJDnbF55kX00mds028Z65QxvBYaA.m3u8"
      crossOrigin="anonymous"
      controls
    />
  );
}
