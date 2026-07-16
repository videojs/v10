import type { Translations } from '../params';

export default {
  buttons: {
    play: 'Atskaņot',
    pause: 'Pauzēt',
    replay: 'Atkārtot',
    mute: 'Izslēgt skaņu',
    unmute: 'Ieslēgt skaņu',
  },
  seek: {
    forward: 'Pārtīt uz priekšu {seconds} sekundes',
    backward: 'Pārtīt atpakaļ {seconds} sekundes',
  },
  fullscreen: {
    enter: 'Pilnekrāna režīms',
    exit: 'Iziet no pilnekrāna',
  },
  captions: {
    enable: 'Ieslēgt parakstus',
    disable: 'Izslēgt parakstus',
  },
  pip: {
    enter: 'Attēls attēlā',
    exit: 'Iziet no attēls attēlā',
  },
  live: {
    playing: 'Tiešraide',
    seekToEdge: 'Pāriet uz tiešraidi',
    badge: 'Tiešraide',
  },
  cast: {
    start: 'Sākt pārraidīšanu',
    stop: 'Beigt pārraidīšanu',
    connecting: 'Savienošanās',
  },
  airplay: {
    start: 'Sākt AirPlay',
    stop: 'Apturēt AirPlay',
  },
  slider: {
    seek: 'Meklēt',
  },
  time: {
    current: 'Esošais laiks',
    duration: 'Ilgums',
    remaining: 'Atlikušais laiks',
    remainingSuffix: 'Atlicis {duration}',
    showElapsed: '{duration}. Rādīt pagājušo laiku.',
    showDuration: '{duration}. Rādīt ilgumu.',
    showRemaining: '{duration}. Rādīt atlikušo laiku.',
    position: '{current} no {duration}',
  },
  playback: {
    rate: 'Atskaņošanas ātrums {rate}',
  },
  volume: {
    mutedValue: '{percent}, izslēgts',
    muted: 'Skaņa izslēgta',
    label: 'Skaļums',
    value: 'Skaļums {value}',
  },
  status: {
    captionsOn: 'Paraksti ieslēgti',
    captionsOff: 'Paraksti izslēgti',
    paused: 'Pauzēts',
    playing: 'Atskaņo',
    fullscreen: 'Pilnekrāna režīms',
    pip: 'Attēls attēlā',
    exitPip: 'Iziet no attēls attēlā',
  },
  errors: {
    aborted: 'Atskaņošana atcelta',
    network: 'Tīkla kļūdas dēļ, multivides lejupielāde neizdevās.',
    decode: 'Atskaņošana tika pārtraukta tīkla kļūmes dēļ vai pārlūkprogrammas iespēju trūkuma dēļ.',
    source: 'Neizdevās ielādēt multividi, iespējams severa, vai tīkla kļūmes dēļ, vai neatbalstīta formāta dēļ.',
    encrypted: 'Multividi nevar atskaņot, jo tas ir kriptēts un nav pieejama dekriptēšanas atslēga.',
    title: 'Kaut kas nogāja greizi.',
    unexpected: 'Radās kļūda. Lūdzu, mēģiniet vēlreiz.',
  },
  common: {
    empty: '',
    ok: 'Aizvērt',
  },
  menu: {
    settings: 'Iestatījumi',
    quality: 'Kvalitāte',
    audio: 'Skaņa',
    default: 'Noklusējuma',
    speed: 'Ātrums',
    captions: 'Subtitri',
    playbackRate: 'Atskaņošanas ātrums',
    back: 'Atpakaļ',
    off: 'Izslēgts',
    auto: 'Automātiski',
    autoWithLabel: 'Automātiski ({label})',
    subtitles: 'Subtitri',
  },
} as const satisfies Translations;
