import { DashVideo } from '@videojs/react/media/dash-video';

export default function BasicUsage() {
  return (
    <DashVideo
      className="aspect-video w-full"
      src="https://dash.akamaized.net/akamai/streamroot/050714/Spring_4Ktest.mpd"
      autoPlay
      muted
      playsInline
      loop
    />
  );
}
