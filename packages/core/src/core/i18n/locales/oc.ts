import type { Translations } from '../params';

export default {
  buttons: {
    play: 'Lectura',
    pause: 'Pausa',
    replay: 'Tornar legir',
    mute: 'Copar lo son',
    unmute: 'Restablir lo son',
  },
  seek: {
    forward: 'Avançar de {seconds} segondas',
    backward: 'Recular de {seconds} segondas',
  },
  fullscreen: {
    enter: 'Ecran complèt',
    exit: "Sortir de l'ecran complèt",
  },
  captions: {
    enable: 'Activar los subtítols',
    disable: 'Desactivar los subtítols',
  },
  pip: {
    enter: 'Vidèo incrustada',
    exit: 'Sortir de la vidèo incrustada',
  },
  live: {
    playing: 'Lectura dirècta',
    seekToEdge: 'Anar al dirècte',
    badge: 'Dirècte',
  },
  cast: {
    start: 'Anar en dirècte',
    stop: 'Aturar la difusion',
    connecting: 'Connexion en cors',
  },
  airplay: {
    start: 'Aviar AirPlay',
    stop: 'Arrestar AirPlay',
  },
  slider: {
    seek: 'Desfilament',
  },
  time: {
    current: 'Durada passada',
    duration: 'Durada',
    remaining: 'Temps restant',
    remainingSuffix: 'Demòra {duration}',
    showElapsed: '{duration}. Afichar lo temps passat.',
    showDuration: '{duration}. Afichar la durada.',
    showRemaining: '{duration}. Afichar lo temps que demòra.',
    position: '{current} sus {duration}',
  },
  playback: {
    rate: 'Velocitat de lectura {rate}',
  },
  volume: {
    mutedValue: '{percent}, silenciat',
    muted: 'Silenciat',
    label: 'Volum',
    value: 'Volum {value}',
  },
  status: {
    captionsOn: 'Legendas activadas',
    captionsOff: 'Legendas desactivadas',
    paused: 'En pausa',
    playing: 'En lectura',
    fullscreen: 'Ecran complèt',
    pip: 'Vidèo incrustada',
    exitPip: 'Sortir de la vidèo incrustada',
  },
  errors: {
    aborted: 'Avètz copat la lectura del mèdia.',
    network: 'Una error de ret a provocat un fracàs del telecargament.',
    decode:
      "La lectura del mèdia es copada a causa d'un problèma de corrupcion o perque lo mèdia utiliza de foncionalitats pas suportadas pel navigador.",
    source:
      'Lo mèdia a pas pogut èsser cargat, siá perque lo servidor o lo ret a fracassat siá perque lo format es pas compatible.',
    encrypted: 'Lo mèdia es chifrat e avèm pas las claus per lo deschifrar.',
    title: "Quaucarèn s'es mal passat.",
    unexpected: "Una error s'es produsida. Provatz d'un autre còp.",
  },
  common: {
    empty: '',
    ok: 'Tampar',
  },
  menu: {
    settings: 'Paramètres',
    quality: 'Qualitat',
    audio: 'Àudio',
    default: 'Per defaut',
    speed: 'Velocitat',
    captions: 'Legendas',
    playbackRate: 'Velocitat de lectura',
    back: 'Retorn',
    off: 'Desactivat',
    auto: 'Automatic',
    autoWithLabel: 'Automatic ({label})',
    subtitles: 'Sostítols',
  },
} as const satisfies Translations;
