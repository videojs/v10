import '@videojs/html/video/player';
import '@videojs/html/ui/container';
import '@videojs/html/ui/dialog';
import '@videojs/html/ui/dialog-backdrop';
import '@videojs/html/ui/dialog-popup';
import '@videojs/html/ui/dialog-title';
import '@videojs/html/ui/dialog-description';
import '@videojs/html/ui/dialog-close';

const initializedDemos = new WeakSet<HTMLElement>();

function initializeDemos(): void {
  document.querySelectorAll<HTMLElement>('.html-dialog-basic').forEach((demo) => {
    if (initializedDemos.has(demo)) return;

    initializedDemos.add(demo);

    const dialog = demo.querySelector('media-dialog');
    const video = demo.querySelector('video');

    dialog?.addEventListener('open-change', (event) => {
      if (!video) return;

      // SAFETY: `media-dialog` defines `open-change` with an `{ open }` detail payload.
      const { open } = (event as CustomEvent<{ open: boolean }>).detail;

      if (open) void video.play().catch(() => {});
      else video.pause();
    });
  });
}

initializeDemos();
document.addEventListener('astro:page-load', initializeDemos);
