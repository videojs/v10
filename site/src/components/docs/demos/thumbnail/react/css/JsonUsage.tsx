import { Thumbnail } from '@videojs/react';

const THUMBNAILS = [
  {
    url: 'https://image.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/thumbnail.jpg?time=0',
    startTime: 0,
    endTime: 10,
  },
  {
    url: 'https://image.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/thumbnail.jpg?time=10',
    startTime: 10,
    endTime: 20,
  },
  {
    url: 'https://image.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/thumbnail.jpg?time=20',
    startTime: 20,
  },
];

export default function JsonUsage() {
  return <Thumbnail thumbnails={THUMBNAILS} time={12} style={{ maxWidth: 240 }} />;
}
