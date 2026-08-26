import { Container, createPlayer, MuteButton, VolumePopover, VolumeSlider } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const { Player } = createPlayer({ features: videoFeatures });

export default function BasicUsage() {
  return (
    <Player>
      <Container className="react-volume-popover-basic">
        <Video src="{{VJS10_DEMO_VIDEO_MP4}}" autoPlay muted playsInline loop />
        <div className="react-volume-popover-basic__controls">
          <VolumePopover.Root openOnHover side="top">
            <VolumePopover.Trigger
              className="react-volume-popover-basic__trigger"
              render={
                <MuteButton render={(props, state) => <button {...props}>{state.muted ? 'Unmute' : 'Mute'}</button>} />
              }
            />
            <VolumePopover.Popup className="react-volume-popover-basic__popup">
              <VolumeSlider.Root orientation="vertical" className="react-volume-popover-basic__slider">
                <VolumeSlider.Track className="react-volume-popover-basic__track">
                  <VolumeSlider.Fill className="react-volume-popover-basic__fill" />
                </VolumeSlider.Track>
                <VolumeSlider.Thumb className="react-volume-popover-basic__thumb" />
              </VolumeSlider.Root>
            </VolumePopover.Popup>
          </VolumePopover.Root>
        </div>
      </Container>
    </Player>
  );
}
