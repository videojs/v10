import { createPlayer, features } from '@videojs/react';
import { Video } from '@videojs/react/video';
import { useEffect, useState } from 'react';

import './BasicUsage.css';

const Player = createPlayer({ features: [...features.video] });

function MediaInfo() {
  const media = Player.useMedia();
  const [info, setInfo] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!media) return;

    const update = () => {
      setInfo({
        duration: `${media.duration.toFixed(1)}s`,
        currentTime: `${media.currentTime.toFixed(1)}s`,
        paused: String(media.paused),
        readyState: String(media.readyState),
        networkState: String(media.networkState),
        volume: `${(media.volume * 100).toFixed(0)}%`,
      });
    };

    update();
    const id = setInterval(update, 250);
    return () => clearInterval(id);
  }, [media]);

  if (!media) return null;

  return (
    <dl className="react-use-media-basic__info">
      {Object.entries(info).map(([key, value]) => (
        <div key={key}>
          <dt>{key}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function BasicUsage() {
  return (
    <Player.Provider>
      <Player.Container className="react-use-media-basic">
        <Video
          src="https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4"
          autoPlay
          muted
          playsInline
        />
        <MediaInfo />
      </Player.Container>
    </Player.Provider>
  );
}
