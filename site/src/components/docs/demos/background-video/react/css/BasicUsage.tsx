import { BackgroundVideo } from '@videojs/react/media/background-video';

export default function BasicUsage() {
  return (
    <div className="container">
      <BackgroundVideo src="https://stream.mux.com/601n4w1fq88NJiVpzvrQQeQfNnnjjfKMIN7dCGAEarTs/highest.mp4" />
    </div>
  );
}
