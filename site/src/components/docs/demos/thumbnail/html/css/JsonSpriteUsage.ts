import '@videojs/html/ui/thumbnail';

type DemoThumbnailImage = {
  url: string;
  startTime: number;
  endTime?: number;
  width?: number;
  height?: number;
  coords?: { x: number; y: number };
};

type ThumbnailDemoElement = HTMLElement & { thumbnails?: DemoThumbnailImage[] };

const initializedDemos = new WeakSet<ThumbnailDemoElement>();

function initializeDemos(): void {
  document.querySelectorAll<ThumbnailDemoElement>('.html-thumbnail-json-sprite').forEach((thumbnail) => {
    if (initializedDemos.has(thumbnail)) return;

    initializedDemos.add(thumbnail);
    thumbnail.thumbnails = [
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
  });
}

initializeDemos();
document.addEventListener('astro:page-load', initializeDemos);
