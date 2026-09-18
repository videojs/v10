import '@videojs/html/ui/alert-dialog';
import '@videojs/html/ui/dialog-backdrop';
import '@videojs/html/ui/dialog-popup';
import '@videojs/html/ui/dialog-title';
import '@videojs/html/ui/dialog-description';
import '@videojs/html/ui/dialog-close';

const initializedDemos = new WeakSet<HTMLElement>();

function initializeDemos(): void {
  document.querySelectorAll<HTMLElement>('.html-alert-dialog-basic').forEach((demo) => {
    if (initializedDemos.has(demo)) return;

    initializedDemos.add(demo);

    const trigger = demo.querySelector<HTMLButtonElement>('.html-alert-dialog-basic__trigger');
    const dialog = demo.querySelector('media-alert-dialog');

    trigger?.addEventListener('click', () => {
      if (dialog) dialog.open = true;
    });
  });
}

initializeDemos();
document.addEventListener('astro:page-load', initializeDemos);
