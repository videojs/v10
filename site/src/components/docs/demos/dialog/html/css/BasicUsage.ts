import '@videojs/html/video/player';
import '@videojs/html/ui/dialog';

document.querySelectorAll<HTMLElement>('.html-dialog-basic').forEach((demo) => {
  const dialog = demo.querySelector('media-dialog');
  const video = demo.querySelector('video');

  dialog?.addEventListener('open-change', (event) => {
    if (!video) return;

    const { open } = (event as CustomEvent<{ open: boolean }>).detail;

    if (open) void video.play().catch(() => {});
    else video.pause();
  });
});
