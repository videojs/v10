import { createPlayer, isMediaSourceCapable, isMediaVideoDimensionsCapable } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const Player = createPlayer({
  features: videoFeatures,
});

function MediaInfo() {
  const media = Player.useMedia();

  if (!media) return null;

  return (
    <dl className="m-0 flex flex-col gap-1 border-t border-black/10 bg-black/5 p-3 text-[13px]">
      {isMediaSourceCapable(media) && (
        <div className="flex gap-2">
          <dt className="min-w-20 text-gray-500">src</dt>
          <dd className="m-0 truncate tabular-nums">{media.currentSrc || '—'}</dd>
        </div>
      )}
      {isMediaVideoDimensionsCapable(media) && (
        <>
          <div className="flex gap-2">
            <dt className="min-w-20 text-gray-500">videoWidth</dt>
            <dd className="m-0 truncate tabular-nums">{media.videoWidth}px</dd>
          </div>
          <div className="flex gap-2">
            <dt className="min-w-20 text-gray-500">videoHeight</dt>
            <dd className="m-0 truncate tabular-nums">{media.videoHeight}px</dd>
          </div>
        </>
      )}
    </dl>
  );
}

export default function BasicUsage() {
  return (
    <Player.Provider>
      <Player.Container className="relative">
        <Video
          className="w-full"
          src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4"
          autoPlay
          muted
          playsInline
          loop
        />
        <MediaInfo />
      </Player.Container>
    </Player.Provider>
  );
}
