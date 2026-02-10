import '@videojs/html/skins/frosted';
import '@videojs/html/define/hls-video';

document.getElementById('app')!.innerHTML = /* html */ `
  <video-provider>
    <media-skin-frosted style="border-radius: 2rem; width: 100%; margin: 2rem auto; aspect-ratio: 16/9">
      <hls-video
        slot="media"
        src="https://stream.mux.com/fXNzVtmtWuyz00xnSrJg4OJH6PyNo6D02UzmgeKGkP5YQ.m3u8"
        poster="https://image.mux.com/fXNzVtmtWuyz00xnSrJg4OJH6PyNo6D02UzmgeKGkP5YQ/thumbnail.webp"
        playsinline
      ></hls-video>
    </media-skin-frosted>
  </video-provider>
`;
