import { Container, createPlayer, ErrorDialog } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';
import { useRef } from 'react';

const { Player } = createPlayer({ features: videoFeatures });
const brokenSource = 'data:video/mp4;base64,AAAA';

export default function BasicUsage() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const triggerError = () => {
    const video = videoRef.current;
    if (!video) return;

    video.src = brokenSource;
    video.load();
  };

  return (
    <Player>
      <Container className="react-error-dialog-basic">
        <Video
          ref={videoRef}
          className="react-error-dialog-basic-video"
          src="{{VJS10_DEMO_VIDEO_MP4}}"
          autoPlay
          muted
          playsInline
          loop
        />
        <button className="react-error-dialog-basic-trigger" type="button" onClick={triggerError}>
          Trigger a playback error
        </button>
        <ErrorDialog.Root>
          <ErrorDialog.Backdrop className="react-error-dialog-basic-backdrop" />
          <ErrorDialog.Popup className="react-error-dialog-basic-dialog">
            <ErrorDialog.Title className="react-error-dialog-basic-title" />
            <ErrorDialog.Description className="react-error-dialog-basic-description" />
            <ErrorDialog.Close className="react-error-dialog-basic-close" />
          </ErrorDialog.Popup>
        </ErrorDialog.Root>
      </Container>
    </Player>
  );
}
