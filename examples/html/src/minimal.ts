import '@videojs/html/skins/minimal';

document.getElementById('app').innerHTML = /* html */ `
  <video-provider>
    <media-skin-minimal style="border-radius: 0.75rem; width: 100%; margin: 2rem auto; aspect-ratio: 16/9">
      <video
        slot="media"
        src="https://stream.mux.com/fXNzVtmtWuyz00xnSrJg4OJH6PyNo6D02UzmgeKGkP5YQ/high.mp4"
        poster="https://image.mux.com/fXNzVtmtWuyz00xnSrJg4OJH6PyNo6D02UzmgeKGkP5YQ/thumbnail.webp"
        playsinline
      ></video>
    </media-skin-minimal>
  </video-provider>
`;
