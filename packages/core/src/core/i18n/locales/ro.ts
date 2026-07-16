import type { Translations } from '../params';

export default {
  buttons: {
    play: 'Redare',
    pause: 'Pauză',
    replay: 'Reluare',
    mute: 'Fără sunet',
    unmute: 'Cu sunet',
  },
  seek: {
    forward: 'Salt înainte {seconds} secunde',
    backward: 'Salt înapoi {seconds} secunde',
  },
  fullscreen: {
    enter: 'Ecran complet',
    exit: 'Ieșire ecran complet',
  },
  captions: {
    enable: 'Activează subtitrările',
    disable: 'Dezactivează subtitrările',
  },
  pip: {
    enter: 'Imagine în imagine',
    exit: 'Închidere imagine în imagine',
  },
  live: {
    playing: 'Redare în direct',
    seekToEdge: 'Salt la direct',
    badge: 'În direct',
  },
  cast: {
    start: 'Pornire transmisie',
    stop: 'Oprire transmisie',
    connecting: 'Se conectează',
  },
  airplay: {
    start: 'Pornește AirPlay',
    stop: 'Oprește AirPlay',
  },
  slider: {
    seek: 'Derulare',
  },
  time: {
    current: 'Ora curentă',
    duration: 'Durată',
    remaining: 'Timp rămas',
    remainingSuffix: 'Mai rămân {duration}',
    showElapsed: '{duration}. Afișează timpul scurs.',
    showDuration: '{duration}. Afișează durata.',
    showRemaining: '{duration}. Afișează timpul rămas.',
    position: '{current} din {duration}',
  },
  playback: {
    rate: 'Rată de redare {rate}',
  },
  volume: {
    mutedValue: '{percent}, mut',
    muted: 'Mut',
    label: 'Volum',
    value: 'Volum {value}',
  },
  status: {
    captionsOn: 'Subtitrări activate',
    captionsOff: 'Subtitrări dezactivate',
    paused: 'Pauză',
    playing: 'Se redă',
    fullscreen: 'Ecran complet',
    pip: 'Imagine în imagine',
    exitPip: 'Închidere imagine în imagine',
  },
  errors: {
    aborted: 'Ați abandonat redarea media',
    network: 'O eroare de rețea a provocat eșecul descărcării conținutului media în timpul procesului.',
    decode:
      'Redarea media a fost întreruptă din cauza conținutului corupt sau din cauza faptului că acest conținut media folosește funcții pe care browserul dvs. nu le acceptă.',
    source:
      'Conținutul media nu a putut fi încărcat, fie pentru că serverul sau rețeaua a eșuat, fie pentru că formatul nu este acceptat.',
    encrypted: 'Conținutul media este criptat și nu avem cheile pentru decriptare.',
    title: 'Ceva a mers greșit.',
    unexpected: 'A apărut o eroare. Vă rugăm să încercați din nou.',
  },
  common: {
    empty: '',
    ok: 'Închidere',
  },
  menu: {
    settings: 'Setări',
    quality: 'Calitate',
    audio: 'Sunet',
    default: 'Implicit',
    speed: 'Viteză',
    captions: 'Subtitrări',
    playbackRate: 'Rată de redare',
    back: 'Înapoi',
    off: 'Dezactivat',
    auto: 'Automat',
    autoWithLabel: 'Automat ({label})',
    subtitles: 'Subtitrări',
  },
} as const satisfies Translations;
