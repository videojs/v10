import '@videojs/html/video/player';
import '@videojs/html/ui/error-dialog';

const brokenSource = 'data:video/mp4;base64,AAAA';

document.querySelectorAll<HTMLElement>('.html-error-dialog-basic').forEach((demo) => {
  const video = demo.querySelector('video');
  const trigger = demo.querySelector<HTMLButtonElement>('.html-error-dialog-basic__trigger');

  trigger?.addEventListener('click', () => {
    if (!video) return;

    video.src = brokenSource;
    video.load();
  });
});
