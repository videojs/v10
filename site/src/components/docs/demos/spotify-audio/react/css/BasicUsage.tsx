import { SpotifyAudio } from '@videojs/react/media/spotify-audio';

export default function BasicUsage() {
  return (
    <div className="spotify-audio">
      <SpotifyAudio src="{{VJS10_DEMO_SPOTIFY}}" controls />
    </div>
  );
}
