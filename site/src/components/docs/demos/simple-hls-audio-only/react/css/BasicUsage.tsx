import { SimpleHlsAudioOnly } from '@videojs/react/media/simple-hls-audio-only';

export default function BasicUsage() {
  return (
    <SimpleHlsAudioOnly
      className="simple-hls-audio-only"
      src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM.m3u8"
      controls
    />
  );
}
