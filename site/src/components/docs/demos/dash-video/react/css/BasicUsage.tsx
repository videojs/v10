import { DashVideo } from '@videojs/react/media/dash-video';

export default function BasicUsage() {
  return (
    <DashVideo
      className="dash-video"
      src="https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd"
      autoPlay
      muted
      playsInline
      loop
    />
  );
}
