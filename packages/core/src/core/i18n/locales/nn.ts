import type { Translations } from '../params';

export default {
  buttons: {
    play: 'Spel',
    pause: 'Pause',
    replay: 'Spel om att',
    mute: 'Lyd av',
    unmute: 'Lyd på',
  },
  seek: {
    forward: 'Hopp fram {seconds} sekund',
    backward: 'Hopp tilbake {seconds} sekund',
  },
  fullscreen: {
    enter: 'Fullskjerm',
    exit: 'Stenga fullskjerm',
  },
  captions: {
    enable: 'Slå på teksting',
    disable: 'Slå av teksting',
  },
  pip: {
    enter: 'Bilete-i-bilete',
    exit: 'Avslutt bilete-i-bilete',
  },
  live: {
    playing: 'Spelar live',
    seekToEdge: 'Hopp til live',
    badge: 'Direkte',
  },
  cast: {
    start: 'Start sending',
    stop: 'Stopp sending',
    connecting: 'Koplar til',
  },
  airplay: {
    start: 'Start AirPlay',
    stop: 'Stopp AirPlay',
  },
  slider: {
    seek: 'Spol',
  },
  time: {
    current: 'Aktuell tid',
    duration: 'Varigheit',
    remaining: 'Tid attende',
    remainingSuffix: '{duration} att',
    showElapsed: '{duration}. Vis avspelt tid.',
    showDuration: '{duration}. Vis lengd.',
    showRemaining: '{duration}. Vis tid att.',
    position: '{current} av {duration}',
  },
  playback: {
    rate: 'Avspelingshastigheit {rate}',
  },
  volume: {
    mutedValue: '{percent}, dempa',
    muted: 'Dempa',
    label: 'Volum',
    value: 'Volum {value}',
  },
  status: {
    captionsOn: 'Teksting på',
    captionsOff: 'Teksting av',
    paused: 'Satt på pause',
    playing: 'Spelar',
    fullscreen: 'Fullskjerm',
    pip: 'Bilete i bilete',
    exitPip: 'Avslutt bilete i bilete',
  },
  errors: {
    aborted: 'Du avbraut avspelinga.',
    network: 'Ein nettverksfeil avbraut nedlasting av videoen.',
    decode:
      'Videoavspelinga blei broten på grunn av øydelagde data eller av di videoen ville gjera noe som nettlesaren din ikkje stodar.',
    source:
      'Videoen kunne ikkje lastas ned, på grunn av ein nettverksfeil eller serverfeil, eller av di formatet ikkje er stoda.',
    encrypted: 'Mediefila er kryptert og vi manglar nyklar for å dekryptere ho.',
    title: 'Noko gjekk gale.',
    unexpected: 'Det oppstod ein feil. Ver venleg prøv igjen.',
  },
  common: {
    empty: '',
    ok: 'Lukk',
  },
  menu: {
    settings: 'Innstillingar',
    quality: 'Kvalitet',
    audio: 'Lyd',
    default: 'Standard',
    speed: 'Fart',
    captions: 'Teksting',
    playbackRate: 'Avspelingshastigheit',
    back: 'Tilbake',
    off: 'Av',
    auto: 'Auto',
    autoWithLabel: 'Auto ({label})',
    subtitles: 'Undertekstar',
  },
} as const satisfies Translations;
