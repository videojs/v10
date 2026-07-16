import type { Translations } from '../params';

export default {
  buttons: {
    play: 'Reproduir',
    pause: 'Pausa',
    replay: 'Repetir',
    mute: 'Silenciar',
    unmute: 'Activar el so',
  },
  seek: {
    forward: 'Salta endavant {seconds} segons',
    backward: 'Salta enrere {seconds} segons',
  },
  fullscreen: {
    enter: 'Pantalla completa',
    exit: 'Surt de pantalla completa',
  },
  captions: {
    enable: 'Activa subtítols',
    disable: 'Desactiva subtítols',
  },
  pip: {
    enter: 'Imatge en imatge',
    exit: 'Sortir de la imatge en imatge',
  },
  live: {
    playing: 'Reproducció en directe',
    seekToEdge: 'Anar al directe',
    badge: 'En directe',
  },
  cast: {
    start: 'Comença a emetre',
    stop: 'Atura la transmissió',
    connecting: 'Connectant',
  },
  airplay: {
    start: 'Inicia AirPlay',
    stop: 'Atura AirPlay',
  },
  slider: {
    seek: 'Desplaçament',
  },
  time: {
    current: 'Temps actual',
    duration: 'Durada',
    remaining: 'Temps restant',
    remainingSuffix: 'Queden {duration}',
    showElapsed: '{duration}. Mostra el temps transcorregut.',
    showDuration: '{duration}. Mostra la durada.',
    showRemaining: '{duration}. Mostra el temps restant.',
    position: '{current} de {duration}',
  },
  playback: {
    rate: 'Velocitat de reproducció {rate}',
  },
  volume: {
    mutedValue: '{percent}, silenciat',
    muted: 'Silenciat',
    label: 'Volum',
    value: 'Volum {value}',
  },
  status: {
    captionsOn: 'Llegendes activades',
    captionsOff: 'Llegendes desactivades',
    paused: 'En pausa',
    playing: 'Reproduint',
    fullscreen: 'Pantalla completa',
    pip: 'Imatge en imatge',
    exitPip: 'Surt de la imatge en imatge',
  },
  errors: {
    aborted: 'Has interromput la reproducció del contingut',
    network: 'Un error de xarxa ha interromput la descàrrega del contingut.',
    decode:
      "La reproducció del contingut s'ha interromput a causa d'un problema de corrupció o perquè el contingut fa servir funcions que el teu navegador no suporta.",
    source:
      "No s'ha pogut carregar el contingut, ja sigui perquè el servidor o la xarxa han fallat o perquè el format no està suportat.",
    encrypted: 'El contingut està xifrat i no disposem de les claus per desxifrar-lo.',
    title: 'Alguna cosa ha anat malament.',
    unexpected: "S'ha produït un error. Torneu-ho a intentar.",
  },
  common: {
    empty: '',
    ok: 'Tancar',
  },
  menu: {
    settings: 'Configuració',
    quality: 'Qualitat',
    audio: 'Àudio',
    default: 'Predeterminat',
    speed: 'Velocitat',
    captions: 'Subtítols',
    playbackRate: 'Velocitat de reproducció',
    back: 'Enrere',
    off: 'Desactivat',
    auto: 'Automàtic',
    autoWithLabel: 'Automàtic ({label})',
    subtitles: 'Subtítols',
  },
} as const satisfies Translations;
