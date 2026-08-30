import { BackgroundVideo } from '@videojs/react/media/background-video';

export default function BasicUsage() {
  return (
    <section className="add-background-video-react-demo">
      <div className="add-background-video-react-demo-visual" aria-hidden="true">
        <img className="add-background-video-react-demo-poster" src="{{VJS10_DEMO_BACKGROUND_VIDEO_POSTER}}" alt="" />
        <BackgroundVideo className="add-background-video-react-demo-media" src="{{VJS10_DEMO_BACKGROUND_VIDEO_MP4}}" />
      </div>
      <div className="add-background-video-react-demo-content">
        <h3>Build the next great video experience</h3>
        <a href="#common-variations">Compare source options</a>
      </div>
    </section>
  );
}
