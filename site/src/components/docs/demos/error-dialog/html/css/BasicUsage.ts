import '@videojs/html/video/player';
import '@videojs/html/ui/container';
import '@videojs/html/ui/error-dialog';
import '@videojs/html/ui/dialog-backdrop';
import '@videojs/html/ui/dialog-popup';
import '@videojs/html/ui/dialog-title';
import '@videojs/html/ui/dialog-description';
import '@videojs/html/ui/dialog-close';

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
