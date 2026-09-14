import { Audio, AudioPlayer } from '@videojs/react/audio';
import { Video, VideoPlayer } from '@videojs/react/video';

import { AudioSkin } from '@/components/videojs/audio/skin';
import { VideoSkin } from '@/components/videojs/video/skin';

export default function Home() {
  return (
    <main>
      <h1>Video.js published registry consumer</h1>
      <VideoPlayer>
        <VideoSkin className="aspect-video w-full">
          <Video aria-label="Published registry validation video" />
        </VideoSkin>
      </VideoPlayer>
      <AudioPlayer>
        <AudioSkin className="w-full">
          <Audio aria-label="Published registry validation audio" />
        </AudioSkin>
      </AudioPlayer>
    </main>
  );
}
