import '@videojs/html/media/background-video';

const hero = document.querySelector('.add-background-video-html-demo')!;
const video = hero.querySelector('background-video')!.target!;
const button = hero.querySelector<HTMLButtonElement>('[data-motion-toggle]')!;
const preference = window.matchMedia('(prefers-reduced-motion: reduce)');

function setMotion(enabled: boolean) {
  hero.toggleAttribute('data-motion-enabled', enabled);
  button.textContent = enabled ? 'Hide background motion' : 'Show background motion';

  if (enabled) {
    video.play().catch(() => setMotion(false));
  } else {
    video.pause();
  }
}

const syncPreference = () => setMotion(!preference.matches);

button.addEventListener('click', () => setMotion(!hero.hasAttribute('data-motion-enabled')));
preference.addEventListener('change', syncPreference);
syncPreference();
