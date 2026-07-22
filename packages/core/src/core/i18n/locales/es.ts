import type { Translations } from '../params';

export default {
  buttons: {
    play: 'Reproducir',
    pause: 'Pausa',
    replay: 'Volver a reproducir',
    mute: 'Desactivar el sonido',
    unmute: 'Activar el sonido',
  },
  seek: {
    forward: 'Avanza {seconds} segundos',
    backward: 'Retrocede {seconds} segundos',
  },
  fullscreen: {
    enter: 'Pantalla completa',
    exit: 'Salir de pantalla completa',
  },
  captions: {
    enable: 'Activar subtítulos',
    disable: 'Desactivar subtítulos',
  },
  pip: {
    enter: 'Imagen sobre imagen',
    exit: 'Salir de imagen sobre imagen',
  },
  live: {
    playing: 'Reproduciendo en directo',
    seekToEdge: 'Ir al directo',
    badge: 'Directo',
  },
  cast: {
    start: 'Iniciar transmisión',
    stop: 'Detener transmisión',
    connecting: 'Conectando',
  },
  airplay: {
    start: 'Iniciar AirPlay',
    stop: 'Detener AirPlay',
  },
  slider: {
    seek: 'Buscar',
  },
  time: {
    current: 'Tiempo reproducido',
    duration: 'Duración total',
    remaining: 'Tiempo restante',
    remainingSuffix: 'Quedan {duration}',
    showElapsed: '{duration}. Mostrar tiempo transcurrido.',
    showDuration: '{duration}. Mostrar duración.',
    showRemaining: '{duration}. Mostrar tiempo restante.',
    position: '{current} de {duration}',
  },
  playback: {
    rate: 'Velocidad de reproducción {rate}',
  },
  volume: {
    mutedValue: '{percent}, silenciado',
    muted: 'Silenciado',
    label: 'Volumen',
    value: 'Volumen {value}',
  },
  status: {
    captionsOn: 'Subtítulos activados',
    captionsOff: 'Subtítulos desactivados',
    paused: 'En pausa',
    playing: 'Reproduciendo',
    fullscreen: 'Pantalla completa',
    pip: 'Imagen en imagen',
    exitPip: 'Salir de imagen en imagen',
  },
  errors: {
    aborted: 'Ha interrumpido la reproducción del vídeo.',
    network: 'Un error de red ha interrumpido la descarga del vídeo.',
    decode:
      'La reproducción de vídeo se ha interrumpido por un problema de corrupción de datos o porque el vídeo precisa funciones que su navegador no ofrece.',
    source:
      'No se ha podido cargar el vídeo debido a un fallo de red o del servidor o porque el formato es incompatible.',
    encrypted: 'El material audiovisual está cifrado y no tenemos las claves para descifrarlo.',
    title: 'Algo ha salido mal.',
    unexpected: 'Se ha producido un error. Inténtalo de nuevo.',
  },
  common: {
    empty: '',
    ok: 'Cerrar',
  },
  menu: {
    settings: 'Configuración',
    quality: 'Calidad',
    audio: 'Audio',
    default: 'Predeterminado',
    speed: 'Velocidad',
    captions: 'Subtítulos',
    playbackRate: 'Velocidad de reproducción',
    back: 'Atrás',
    off: 'Desactivado',
    auto: 'Automático',
    autoWithLabel: 'Automático ({label})',
    subtitles: 'Subtítulos',
  },
} as const satisfies Translations;
