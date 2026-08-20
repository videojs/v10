import { TwitchVideo } from '@videojs/react/media/twitch-video';

export default function BasicUsage() {
  return (
    <div className="twitch-video">
      <TwitchVideo src="{{VJS10_DEMO_TWITCH}}" controls />
    </div>
  );
}
