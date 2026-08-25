import '@videojs/html/ui/alert-dialog';

document.querySelectorAll<HTMLElement>('.html-alert-dialog-basic').forEach((demo) => {
  const trigger = demo.querySelector<HTMLButtonElement>('.html-alert-dialog-basic__trigger');
  const dialog = demo.querySelector('media-alert-dialog');

  trigger?.addEventListener('click', () => {
    if (dialog) dialog.open = true;
  });
});
