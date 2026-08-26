import { Container, createPlayer, Dialog } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';
import { useEffect, useRef, useState } from 'react';

import './BasicUsage.css';

const { Player } = createPlayer({ features: videoFeatures });

export default function BasicUsage() {
  const [open, setOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (open) void video.play().catch(() => {});
    else video.pause();
  }, [open]);

  return (
    <div className="react-dialog-basic">
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger className="react-dialog-basic__trigger">
          <img src="{{VJS10_DEMO_POSTER}}" alt="" />
          <span>Play the video</span>
        </Dialog.Trigger>
        <Dialog.Backdrop className="react-dialog-basic__backdrop" />
        <Dialog.Popup className="react-dialog-basic__dialog">
          <div className="react-dialog-basic__popup">
            <Dialog.Title className="react-dialog-basic__title">Video title</Dialog.Title>
            <Dialog.Description className="react-dialog-basic__description">
              A video opened from a thumbnail.
            </Dialog.Description>
            <Dialog.Close className="react-dialog-basic__close">Close</Dialog.Close>
            <Player>
              <Container>
                <Video ref={videoRef} src="{{VJS10_DEMO_VIDEO_MP4}}" controls muted playsInline />
              </Container>
            </Player>
          </div>
        </Dialog.Popup>
      </Dialog.Root>
    </div>
  );
}
