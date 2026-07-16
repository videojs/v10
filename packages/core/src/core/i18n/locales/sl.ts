import type { Translations } from '../params';

export default {
  buttons: {
    play: 'Predvajaj',
    pause: 'Začasno ustavi',
    replay: 'Predvajaj ponovno',
    mute: 'Izključi zvok',
    unmute: 'Vključi zvok',
  },
  seek: {
    forward: 'Preskoči naprej {seconds} sekund',
    backward: 'Preskoči nazaj {seconds} sekund',
  },
  fullscreen: {
    enter: 'Celozaslonski prikaz',
    exit: 'Izhod iz celozaslonskega prikaza',
  },
  captions: {
    enable: 'Vklopi podnapise',
    disable: 'Izklopi podnapise',
  },
  pip: {
    enter: 'Slika v sliki',
    exit: 'Izhod iz slike v sliki',
  },
  live: {
    playing: 'Predvajanje v živo',
    seekToEdge: 'Skoči na live',
    badge: 'V živo',
  },
  cast: {
    start: 'Začni predvajanje na zaslonu',
    stop: 'Ustavi predvajanje na zaslonu',
    connecting: 'Povezovanje',
  },
  airplay: {
    start: 'Zaženi AirPlay',
    stop: 'Ustavi AirPlay',
  },
  slider: {
    seek: 'Premikanje',
  },
  time: {
    current: 'Trenutni čas',
    duration: 'Trajanje',
    remaining: 'Preostali čas',
    remainingSuffix: 'Preostane {duration}',
    showElapsed: '{duration}. Prikaži pretekli čas.',
    showDuration: '{duration}. Prikaži trajanje.',
    showRemaining: '{duration}. Prikaži preostali čas.',
    position: '{current} od {duration}',
  },
  playback: {
    rate: 'Hitrost predvajanja {rate}',
  },
  volume: {
    mutedValue: '{percent}, izklopljeno',
    muted: 'Izklopljeno',
    label: 'Glasnost',
    value: 'Glasnost {value}',
  },
  status: {
    captionsOn: 'Zvočni zapis vklopljen',
    captionsOff: 'Zvočni zapis izklopljen',
    paused: 'Začasno ustavljeno',
    playing: 'Predvaja',
    fullscreen: 'Celozaslonski prikaz',
    pip: 'Slika v sliki',
    exitPip: 'Izhod iz slike v sliki',
  },
  errors: {
    aborted: 'Prekinili ste predvajanje.',
    network: 'Prenos multimedijske datoteke ni uspel zaradi napake v omrežju.',
    decode:
      'Predvajanje datoteke je bilo prekinjeno zaradi napak v datoteki ali ker uporablja funkcije, ki jih brskalnik ne podpira.',
    source:
      'Multimedijske datoteke ni bilo mogoče naložiti zaradi napake na strežniku oziroma omrežju ali ker ta oblika ni podprta.',
    encrypted: 'Datoteka je šifrirana in predvajalnik nima ključev za njeno dešifriranje.',
    title: 'Nekaj je šlo narobe.',
    unexpected: 'Prišlo je do napake. Poskusite znova.',
  },
  common: {
    empty: '',
    ok: 'Zapri',
  },
  menu: {
    settings: 'Nastavitve',
    quality: 'Kakovost',
    audio: 'Zvok',
    default: 'Privzeto',
    speed: 'Hitrost',
    captions: 'Podnapisi',
    playbackRate: 'Hitrost predvajanja',
    back: 'Nazaj',
    off: 'Izklopljeno',
    auto: 'Samodejno',
    autoWithLabel: 'Samodejno ({label})',
    subtitles: 'Podnapisi',
  },
} as const satisfies Translations;
