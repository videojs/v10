import { Video, VideoPlayer } from '@videojs/react/video';

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
    </main>
  );
}
