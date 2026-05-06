import { MuxAudio } from '@videojs/react/media/mux-audio';

export default function BasicUsage() {
  return (
    <MuxAudio
      className="mux-audio"
      src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM.m3u8"
      crossOrigin="anonymous"
      controls
    />
  );
}
