import type { Translations } from '../params';

export default {
  buttons: {
    play: 'Spela',
    pause: 'Pausa',
    replay: 'Spela upp igen',
    mute: 'Ljud av',
    unmute: 'Ljud på',
  },
  seek: {
    forward: 'Hoppa framåt {seconds} sekunder',
    backward: 'Hoppa bakåt {seconds} sekunder',
  },
  fullscreen: {
    enter: 'Fullskärm',
    exit: 'Avsluta fullskärm',
  },
  captions: {
    enable: 'Aktivera textning',
    disable: 'Inaktivera textning',
  },
  pip: {
    enter: 'Bild-i-bild',
    exit: 'Avsluta bild-i-bild',
  },
  live: {
    playing: 'Spelar live',
    seekToEdge: 'Gå till live',
    badge: 'Live',
  },
  cast: {
    start: 'Starta casting',
    stop: 'Stoppa casting',
    connecting: 'Ansluter',
  },
  airplay: {
    start: 'Starta AirPlay',
    stop: 'Stoppa AirPlay',
  },
  slider: {
    seek: 'Spola',
  },
  time: {
    current: 'Aktuell tid',
    duration: 'Total tid',
    remaining: 'Återstående tid',
    remainingSuffix: '{duration} kvar',
    showElapsed: '{duration}. Visa förfluten tid.',
    showDuration: '{duration}. Visa längd.',
    showRemaining: '{duration}. Visa återstående tid.',
    position: '{current} av {duration}',
  },
  playback: {
    rate: 'Uppspelningshastighet {rate}',
  },
  volume: {
    mutedValue: '{percent}, tystat',
    muted: 'Tystat',
    label: 'Volym',
    value: 'Volym {value}',
  },
  status: {
    captionsOn: 'Text på',
    captionsOff: 'Text av',
    paused: 'Pausad',
    playing: 'Spelar',
    fullscreen: 'Fullskärm',
    pip: 'Bild i bild',
    exitPip: 'Avsluta bild i bild',
  },
  errors: {
    aborted: 'Du har avbrutit videouppspelningen.',
    network: 'Ett nätverksfel gjorde att nedladdningen av videon avbröts.',
    decode:
      'Uppspelningen avbröts på grund av att videon är skadad, eller också för att videon använder funktioner som din webbläsare inte stöder.',
    source:
      'Det gick inte att ladda videon, antingen på grund av ett server- eller nätverksfel, eller för att formatet inte stöds.',
    encrypted: 'Mediat är krypterat och vi har inte nycklarna för att dekryptera det.',
    title: 'Något gick fel.',
    unexpected: 'Ett fel uppstod. Försök igen.',
  },
  common: {
    empty: '',
    ok: 'Stäng',
  },
  menu: {
    settings: 'Inställningar',
    quality: 'Kvalitet',
    audio: 'Ljud',
    default: 'Standard',
    speed: 'Hastighet',
    captions: 'Textning',
    playbackRate: 'Uppspelningshastighet',
    back: 'Tillbaka',
    off: 'Av',
    auto: 'Auto',
    autoWithLabel: 'Auto ({label})',
    subtitles: 'Undertexter',
  },
} as const satisfies Translations;
