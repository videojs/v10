import type { Translations } from '../params';

export default {
  buttons: {
    play: 'Pusti',
    pause: 'Pauza',
    replay: 'Ponovi',
    mute: 'Utišaj',
    unmute: 'Poništi utišavanje',
  },
  seek: {
    forward: 'Premotaj unapred {seconds} sekundi',
    backward: 'Premotaj unazad {seconds} sekundi',
  },
  fullscreen: {
    enter: 'Pun ekran',
    exit: 'Izađi iz punog ekrana',
  },
  captions: {
    enable: 'Uključi titlove',
    disable: 'Isključi titlove',
  },
  pip: {
    enter: 'Slika u slici',
    exit: 'Izađi iz slike u slici',
  },
  live: {
    playing: 'Reprodukcija uživo',
    seekToEdge: 'Idi na live',
    badge: 'Uživo',
  },
  cast: {
    start: 'Počni emitovanje',
    stop: 'Zaustavi emitovanje',
    connecting: 'Povezivanje',
  },
  airplay: {
    start: 'Покрени AirPlay',
    stop: 'Заустави AirPlay',
  },
  slider: {
    seek: 'Premotavanje',
  },
  time: {
    current: 'Trenutno vreme',
    duration: 'Vreme trajanja',
    remaining: 'Preostalo vreme',
    remainingSuffix: 'Preostalo {duration}',
    showElapsed: '{duration}. Prikaži proteklo vreme.',
    showDuration: '{duration}. Prikaži trajanje.',
    showRemaining: '{duration}. Prikaži preostalo vreme.',
    position: '{current} od {duration}',
  },
  playback: {
    rate: 'Stopa reprodukcije {rate}',
  },
  volume: {
    mutedValue: '{percent}, utišano',
    muted: 'Utišano',
    label: 'Jačina zvuka',
    value: 'Jačina zvuka {value}',
  },
  status: {
    captionsOn: 'Titlovi uključeni',
    captionsOff: 'Titlovi isključeni',
    paused: 'Pauzirano',
    playing: 'Reprodukuje se',
    fullscreen: 'Pun ekran',
    pip: 'Slika u slici',
    exitPip: 'Izađi iz slike u slici',
  },
  errors: {
    aborted: 'Isključili ste reprodukciju videa.',
    network: 'Video se prestao preuzimati zbog greške na mreži.',
    decode: 'Reprodukcija videa je zaustavljena zbog greške u formatu ili zbog verzije vašeg pretraživača.',
    source: 'Video se ne može reproducirati zbog servera, greške u mreži ili format nije podržan.',
    encrypted: 'Medij je šifrovan i nema ključeva za dešifrovanje.',
    title: 'Nešto je pošlo po zlu.',
    unexpected: 'Došlo je do greške. Molimo pokušajte ponovo.',
  },
  common: {
    empty: '',
    ok: 'Zatvori',
  },
  menu: {
    settings: 'Podešavanja',
    quality: 'Kvalitet',
    audio: 'Zvuk',
    default: 'Подразумевано',
    speed: 'Brzina',
    captions: 'Titlovi',
    playbackRate: 'Stopa reprodukcije',
    back: 'Nazad',
    off: 'Isključeno',
    auto: 'Automatski',
    autoWithLabel: 'Automatski ({label})',
    subtitles: 'Titlovi',
  },
} as const satisfies Translations;
