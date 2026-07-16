import type { Translations } from '../params';

export default {
  buttons: {
    play: 'Spill',
    pause: 'Pause',
    replay: 'Spill om igjen',
    mute: 'Lyd av',
    unmute: 'Lyd på',
  },
  seek: {
    forward: 'Hopp frem {seconds} sekunder',
    backward: 'Hopp tilbake {seconds} sekunder',
  },
  fullscreen: {
    enter: 'Fullskjerm',
    exit: 'Avslutt fullskjerm',
  },
  captions: {
    enable: 'Slå på teksting',
    disable: 'Slå av teksting',
  },
  pip: {
    enter: 'Bilde-i-bilde',
    exit: 'Avslutt bilde-i-bilde',
  },
  live: {
    playing: 'Spiller live',
    seekToEdge: 'Gå til live',
    badge: 'Direkte',
  },
  cast: {
    start: 'Start sending',
    stop: 'Stopp sending',
    connecting: 'Kobler til',
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
    duration: 'Varighet',
    remaining: 'Gjenstående tid',
    remainingSuffix: '{duration} igjen',
    showElapsed: '{duration}. Vis avspilt tid.',
    showDuration: '{duration}. Vis varighet.',
    showRemaining: '{duration}. Vis gjenstående tid.',
    position: '{current} av {duration}',
  },
  playback: {
    rate: 'Avspillingshastighet {rate}',
  },
  volume: {
    mutedValue: '{percent}, dempet',
    muted: 'Dempet',
    label: 'Volum',
    value: 'Volum {value}',
  },
  status: {
    captionsOn: 'Teksting på',
    captionsOff: 'Teksting av',
    paused: 'Satt på pause',
    playing: 'Spiller',
    fullscreen: 'Fullskjerm',
    pip: 'Bilde i bilde',
    exitPip: 'Avslutt bilde i bilde',
  },
  errors: {
    aborted: 'Du avbrøt avspillingen.',
    network: 'En nettverksfeil avbrøt nedlasting av videoen.',
    decode:
      'Videoavspillingen ble avbrudt på grunn av ødelagte data eller fordi videoen ville gjøre noe som nettleseren din ikke har støtte for.',
    source:
      'Videoen kunne ikke lastes ned, på grunn av nettverksfeil eller serverfeil, eller fordi formatet ikke er støttet.',
    encrypted: 'Mediefilen er kryptert og vi mangler nøkler for å dekryptere den.',
    title: 'Noe gikk galt.',
    unexpected: 'En feil oppstod. Vennligst prøv igjen.',
  },
  common: {
    empty: '',
    ok: 'Lukk',
  },
  menu: {
    settings: 'Innstillinger',
    quality: 'Kvalitet',
    audio: 'Lyd',
    default: 'Standard',
    speed: 'Hastighet',
    captions: 'Teksting',
    playbackRate: 'Avspillingshastighet',
    back: 'Tilbake',
    off: 'Av',
    auto: 'Auto',
    autoWithLabel: 'Auto ({label})',
    subtitles: 'Undertekster',
  },
} as const satisfies Translations;
