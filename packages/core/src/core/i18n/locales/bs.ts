import type { Translations } from '../params';

export default {
  buttons: {
    play: 'Pusti',
    pause: 'Pauza',
    replay: 'Ponovi',
    mute: 'Prigušen',
    unmute: 'Ne-prigušen',
  },
  seek: {
    forward: 'Premotaj naprijed {seconds} sekundi',
    backward: 'Premotaj nazad {seconds} sekundi',
  },
  fullscreen: {
    enter: 'Puni ekran',
    exit: 'Izlaz iz punog ekrana',
  },
  captions: {
    enable: 'Uključi titlove',
    disable: 'Isključi titlove',
  },
  pip: {
    enter: 'Slika u slici',
    exit: 'Izlaz iz slike u slici',
  },
  live: {
    playing: 'Reprodukcija uživo',
    seekToEdge: 'Idi na live',
    badge: 'Uživo',
  },
  cast: {
    start: 'Pokreni emitovanje',
    stop: 'Zaustavi emitovanje',
    connecting: 'Povezivanje',
  },
  airplay: {
    start: 'Pokreni AirPlay',
    stop: 'Zaustavi AirPlay',
  },
  slider: {
    seek: 'Premotavanje',
  },
  time: {
    current: 'Trenutno vrijeme',
    duration: 'Vrijeme trajanja',
    remaining: 'Preostalo vrijeme',
    remainingSuffix: 'Preostalo {duration}',
    showElapsed: '{duration}. Prikaži proteklo vrijeme.',
    showDuration: '{duration}. Prikaži trajanje.',
    showRemaining: '{duration}. Prikaži preostalo vrijeme.',
    position: '{current} od {duration}',
  },
  playback: {
    rate: 'Stopa reprodukcije {rate}',
  },
  volume: {
    mutedValue: '{percent}, isključen zvuk',
    muted: 'Isključen zvuk',
    label: 'Glasnoća',
    value: 'Glasnoća {value}',
  },
  status: {
    captionsOn: 'Titlovi uključeni',
    captionsOff: 'Titlovi isključeni',
    paused: 'Pauzirano',
    playing: 'Reprodukcija',
    fullscreen: 'Puni ekran',
    pip: 'Slika u slici',
    exitPip: 'Izlaz iz slike u slici',
  },
  errors: {
    aborted: 'Isključili ste reprodukciju videa.',
    network: 'Video se prestao preuzimati zbog greške na mreži.',
    decode: 'Reprodukcija videa je zaustavljenja zbog greške u formatu ili zbog verzije vašeg pretraživača.',
    source: 'Video se ne može reproducirati zbog servera, greške u mreži ili je format ne podržan.',
    encrypted: 'Medij je šifriran i nema ključeva za dešifriranje.',
    title: 'Nešto je pošlo po krivu.',
    unexpected: 'Došlo je do greške. Pokušajte ponovo.',
  },
  common: {
    empty: '',
    ok: 'OK',
  },
  menu: {
    settings: 'Postavke',
    quality: 'Kvalitet',
    audio: 'Zvuk',
    default: 'Zadano',
    speed: 'Brzina',
    captions: 'Titlovi',
    playbackRate: 'Brzina reprodukcije',
    back: 'Nazad',
    off: 'Isključeno',
    auto: 'Automatski',
    autoWithLabel: 'Automatski ({label})',
    subtitles: 'Titlovi',
  },
} as const satisfies Translations;
