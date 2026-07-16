import type { Translations } from '../params';

export default {
  buttons: {
    play: 'Afspil',
    pause: 'Pause',
    replay: 'Afspil igen',
    mute: 'Uden lyd',
    unmute: 'Med lyd',
  },
  seek: {
    forward: 'Spring {seconds} sekunder frem',
    backward: 'Spring {seconds} sekunder tilbage',
  },
  fullscreen: {
    enter: 'Fuldskærm',
    exit: 'Luk fuldskærm',
  },
  captions: {
    enable: 'Aktivér undertekster',
    disable: 'Deaktiver undertekster',
  },
  pip: {
    enter: 'Billede-i-billede',
    exit: 'Afslut billede-i-billede',
  },
  live: {
    playing: 'Afspiller live',
    seekToEdge: 'Gå til live',
    badge: 'Live',
  },
  cast: {
    start: 'Start afsendelse',
    stop: 'Stop afsendelse',
    connecting: 'Forbinder',
  },
  airplay: {
    start: 'Start AirPlay',
    stop: 'Stop AirPlay',
  },
  slider: {
    seek: 'Spol',
  },
  time: {
    current: 'Aktuel tid',
    duration: 'Varighed',
    remaining: 'Resterende tid',
    remainingSuffix: '{duration} tilbage',
    showElapsed: '{duration}. Vis forløbet tid.',
    showDuration: '{duration}. Vis varighed.',
    showRemaining: '{duration}. Vis resterende tid.',
    position: '{current} af {duration}',
  },
  playback: {
    rate: 'Afspilningsrate {rate}',
  },
  volume: {
    mutedValue: '{percent}, lydløs',
    muted: 'Lydløs',
    label: 'Lydstyrke',
    value: 'Lydstyrke {value}',
  },
  status: {
    captionsOn: 'Undertekster til',
    captionsOff: 'Undertekster fra',
    paused: 'Pauseret',
    playing: 'Afspiller',
    fullscreen: 'Fuldskærm',
    pip: 'Billede i billede',
    exitPip: 'Afslut billede i billede',
  },
  errors: {
    aborted: 'Du afbrød videoafspilningen.',
    network: 'En netværksfejl fik download af videoen til at fejle.',
    decode:
      'Videoafspilningen blev afbrudt på grund af ødelagte data eller fordi videoen benyttede faciliteter som din browser ikke understøtter.',
    source:
      'Videoen kunne ikke indlæses, enten fordi serveren eller netværket fejlede, eller fordi formatet ikke er understøttet.',
    encrypted: 'Mediet er krypteret, og der er ingen nøgler til at dekryptere det.',
    title: 'Noget gik galt.',
    unexpected: 'Der opstod en fejl. Prøv igen.',
  },
  common: {
    empty: '',
    ok: 'OK',
  },
  menu: {
    settings: 'Indstillinger',
    quality: 'Kvalitet',
    audio: 'Lyd',
    default: 'Standard',
    speed: 'Hastighed',
    captions: 'Undertekster',
    playbackRate: 'Afspilningshastighed',
    back: 'Tilbage',
    off: 'Fra',
    auto: 'Auto',
    autoWithLabel: 'Auto ({label})',
    subtitles: 'Undertekster',
  },
} as const satisfies Translations;
