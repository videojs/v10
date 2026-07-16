import type { Translations } from '../params';

export default {
  buttons: {
    play: 'Prehrať',
    pause: 'Pozastaviť',
    replay: 'Prehrať znova',
    mute: 'Stlmiť',
    unmute: 'Zrušiť stlmenie',
  },
  seek: {
    forward: 'Posunúť dopredu o {seconds} s',
    backward: 'Posunúť dozadu o {seconds} s',
  },
  fullscreen: {
    enter: 'Režim celej obrazovky',
    exit: 'Zavrieť celú obrazovku',
  },
  captions: {
    enable: 'Zapnúť titulky',
    disable: 'Vypnúť titulky',
  },
  pip: {
    enter: 'Obraz v obraze',
    exit: 'Zavrieť obraz v obraze',
  },
  live: {
    playing: 'Prehráva sa naživo',
    seekToEdge: 'Prejsť na živé vysielanie',
    badge: 'Naživo',
  },
  cast: {
    start: 'Spustiť prenos',
    stop: 'Zastaviť prenos',
    connecting: 'Pripájam',
  },
  airplay: {
    start: 'Spustiť AirPlay',
    stop: 'Zastaviť AirPlay',
  },
  slider: {
    seek: 'Posun',
  },
  time: {
    current: 'Aktuálny čas',
    duration: 'Čas trvania',
    remaining: 'Zostávajúci čas',
    remainingSuffix: 'Zostáva {duration}',
    showElapsed: '{duration}. Zobraziť uplynulý čas.',
    showDuration: '{duration}. Zobraziť trvanie.',
    showRemaining: '{duration}. Zobraziť zostávajúci čas.',
    position: '{current} z {duration}',
  },
  playback: {
    rate: 'Rýchlosť prehrávania {rate}',
  },
  volume: {
    mutedValue: '{percent}, stlmené',
    muted: 'Stlmené',
    label: 'Hlasitosť',
    value: 'Hlasitosť {value}',
  },
  status: {
    captionsOn: 'Popisky zapnuté',
    captionsOff: 'Popisky vypnuté',
    paused: 'Pozastavené',
    playing: 'Prehráva sa',
    fullscreen: 'Celá obrazovka',
    pip: 'Obraz v obraze',
    exitPip: 'Zavrieť obraz v obraze',
  },
  errors: {
    aborted: 'Prerušili ste prehrávanie',
    network: 'Sťahovanie súboru bolo zrušené pre chybu na sieti.',
    decode:
      'Prehrávanie súboru bolo prerušené pre poškodené dáta, alebo súbor používa vlastnosti, ktoré váš prehliadač nepodporuje.',
    source:
      'Súbor sa nepodarilo načítať pre chybu servera, sieťového pripojenia, alebo je formát súboru nepodporovaný.',
    encrypted: 'Súbor je zašifrovaný a nie je k dispozícii kľúč na rozšifrovanie.',
    title: 'Niečo sa pokazilo.',
    unexpected: 'Vyskytla sa chyba. Skúste to znova.',
  },
  common: {
    empty: '',
    ok: 'Zatvoriť',
  },
  menu: {
    settings: 'Nastavenia',
    quality: 'Kvalita',
    audio: 'Zvuk',
    default: 'Predvolené',
    speed: 'Rýchlosť',
    captions: 'Titulky',
    playbackRate: 'Rýchlosť prehrávania',
    back: 'Späť',
    off: 'Vypnuté',
    auto: 'Automaticky',
    autoWithLabel: 'Automaticky ({label})',
    subtitles: 'Titulky',
  },
} as const satisfies Translations;
