import type { Translations } from '../params';

export default {
  buttons: {
    play: 'Reproducir',
    pause: 'Pausa',
    replay: 'Repetir',
    mute: 'Silenciar',
    unmute: 'Son activado',
  },
  seek: {
    forward: 'Avanzar {seconds} segundos',
    backward: 'Retroceder {seconds} segundos',
  },
  fullscreen: {
    enter: 'Pantalla completa',
    exit: 'Saír da pantalla completa',
  },
  captions: {
    enable: 'Activar subtítulos',
    disable: 'Desactivar subtítulos',
  },
  pip: {
    enter: 'Imaxe en imaxe',
    exit: 'Saír de imaxe en imaxe',
  },
  live: {
    playing: 'Reproducindo en directo',
    seekToEdge: 'Ir ao directo',
    badge: 'En directo',
  },
  cast: {
    start: 'Iniciar emisión',
    stop: 'Deter emisión',
    connecting: 'Conectando',
  },
  airplay: {
    start: 'Iniciar AirPlay',
    stop: 'Deter AirPlay',
  },
  slider: {
    seek: 'Buscar',
  },
  time: {
    current: 'Tempo reproducido',
    duration: 'Duración',
    remaining: 'Tempo restante',
    remainingSuffix: 'Quedan {duration}',
    showElapsed: '{duration}. Amosar tempo transcorrido.',
    showDuration: '{duration}. Amosar duración.',
    showRemaining: '{duration}. Amosar tempo restante.',
    position: '{current} de {duration}',
  },
  playback: {
    rate: 'Velocidade de reprodución {rate}',
  },
  volume: {
    mutedValue: '{percent}, silenciado',
    muted: 'Silenciado',
    label: 'Nivel do volume',
    value: 'Nivel do volume {value}',
  },
  status: {
    captionsOn: 'Subtítulos activados',
    captionsOff: 'Subtítulos desactivados',
    paused: 'En pausa',
    playing: 'Reproducindo',
    fullscreen: 'Pantalla completa',
    pip: 'Imaxe en imaxe',
    exitPip: 'Saír de imaxe en imaxe',
  },
  errors: {
    aborted: 'Vostede interrompeu a reprodución do medio.',
    network: 'Un erro de rede interrompeu a descarga do medio.',
    decode:
      'Interrompeuse a reprodución do medio por mor dun problema de estragamento dos datos ou porque o medio precisa funcións que o seu navegador non ofrece.',
    source:
      'Non foi posíbel cargar o medio por mor dun fallo de rede ou do servidor ou porque o formato non é compatíbel.',
    encrypted: 'O medio está cifrado e non temos as chaves para descifralo.',
    title: 'Algo saíu mal.',
    unexpected: 'Produciuse un erro. Por favor, ténteo de novo.',
  },
  common: {
    empty: '',
    ok: 'Pechar',
  },
  menu: {
    settings: 'Axustes',
    quality: 'Calidade',
    audio: 'Son',
    default: 'Predeterminado',
    speed: 'Velocidade',
    captions: 'Subtítulos para xordos',
    playbackRate: 'Velocidade de reprodución',
    back: 'Atrás',
    off: 'Desactivado',
    auto: 'Automático',
    autoWithLabel: 'Automático ({label})',
    subtitles: 'Subtítulos',
  },
} as const satisfies Translations;
