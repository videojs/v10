import '@videojs/html/ui/thumbnail';

type DemoThumbnailImage = {
  url: string;
  startTime: number;
  endTime?: number;
};

type ThumbnailDemoElement = HTMLElement & { thumbnails?: DemoThumbnailImage[] };

const thumbnail = document.querySelector<ThumbnailDemoElement>('media-thumbnail');
if (thumbnail) {
  thumbnail.thumbnails = [
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
}
