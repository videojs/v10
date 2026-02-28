import { Thumbnail } from '@videojs/react';

import './JsonSpriteUsage.css';

const THUMBNAILS = [
  {
    url: 'https://image.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/storyboard.jpg',
    startTime: 0,
    endTime: 10,
    width: 284,
    height: 160,
    coords: { x: 0, y: 0 },
  },
  {
    url: 'https://image.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/storyboard.jpg',
    startTime: 10,
    endTime: 20,
    width: 284,
    height: 160,
    coords: { x: 284, y: 0 },
  },
  {
    url: 'https://image.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/storyboard.jpg',
    startTime: 20,
    width: 284,
    height: 160,
    coords: { x: 568, y: 0 },
  },
];

export default function JsonSpriteUsage() {
  return (
    <div className="react-thumbnail-json-sprite-array">
      <Thumbnail className="react-thumbnail-json-sprite-array__thumbnail" thumbnails={THUMBNAILS} time={12} />
    </div>
  );
}
