import '@videojs/html/ui/thumbnail';

type DemoThumbnailImage = {
  url: string;
  startTime: number;
  endTime?: number;
};

type ThumbnailDemoElement = HTMLElement & { thumbnails?: DemoThumbnailImage[] };

const thumbnail = document.querySelector<ThumbnailDemoElement>('.html-thumbnail-json-array__thumbnail');
if (thumbnail) {
  thumbnail.thumbnails = [
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
}
