import { Thumbnail } from '@videojs/react';

const THUMBNAILS = [
  {
    url: 'https://image.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/storyboard.jpg',
    startTime: 0,
    endTime: 10,
    width: 284,
    height: 160,
    coords: { x: 0, y: 0 },
  },
  {
    url: 'https://image.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/storyboard.jpg',
    startTime: 10,
    endTime: 20,
    width: 284,
    height: 160,
    coords: { x: 284, y: 0 },
  },
  {
    url: 'https://image.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/storyboard.jpg',
    startTime: 20,
    width: 284,
    height: 160,
    coords: { x: 568, y: 0 },
  },
];

export default function JsonSpriteUsage() {
  return <Thumbnail thumbnails={THUMBNAILS} time={12} style={{ maxWidth: 240 }} />;
}
