import { Thumbnail } from '@videojs/react';

const THUMBNAILS = [
  {
    url: 'https://image.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/thumbnail.jpg?time=0',
    startTime: 0,
    endTime: 10,
  },
  {
    url: 'https://image.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/thumbnail.jpg?time=10',
    startTime: 10,
    endTime: 20,
  },
  {
    url: 'https://image.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/thumbnail.jpg?time=20',
    startTime: 20,
  },
];

export default function JsonUsage() {
  return <Thumbnail thumbnails={THUMBNAILS} time={12} style={{ maxWidth: 240 }} />;
}
