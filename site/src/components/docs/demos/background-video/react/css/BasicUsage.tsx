import { BackgroundVideo } from '@videojs/react/media/background-video';

export default function BasicUsage() {
  return (
    <div className="container">
      <BackgroundVideo src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/low.mp4" />
    </div>
  );
}
