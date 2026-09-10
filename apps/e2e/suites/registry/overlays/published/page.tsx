import { Video, VideoPlayer } from '@videojs/react/video';

import { DefaultVideoSkin } from '@/components/videojs/skins/video/skin';

export default function Home() {
  return (
    <main>
      <h1>Video.js published registry consumer</h1>
      <VideoPlayer>
        <DefaultVideoSkin className="aspect-video w-full">
          <Video aria-label="Published registry validation video" />
        </DefaultVideoSkin>
      </VideoPlayer>
    </main>
  );
}
