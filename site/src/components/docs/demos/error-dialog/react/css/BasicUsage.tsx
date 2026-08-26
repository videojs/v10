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
          className="react-error-dialog-basic__video"
          src="{{VJS10_DEMO_VIDEO_MP4}}"
          autoPlay
          muted
          playsInline
          loop
        />
        <button className="react-error-dialog-basic__trigger" type="button" onClick={triggerError}>
          Trigger a playback error
        </button>
        <ErrorDialog.Root>
          <ErrorDialog.Backdrop className="react-error-dialog-basic__backdrop" />
          <ErrorDialog.Popup className="react-error-dialog-basic__dialog">
            <ErrorDialog.Title className="react-error-dialog-basic__title" />
            <ErrorDialog.Description className="react-error-dialog-basic__description" />
            <ErrorDialog.Close className="react-error-dialog-basic__close" />
          </ErrorDialog.Popup>
        </ErrorDialog.Root>
      </Container>
    </Player>
  );
}
