import type { Translations } from '../params';

export default {
  buttons: {
    play: 'Hasi',
    pause: 'Gelditu',
    replay: 'Berriz hasi',
    mute: 'Ixildu',
    unmute: 'Soinua jarri',
  },
  seek: {
    forward: 'Joan aurrera {seconds} segundo',
    backward: 'Joan atzera {seconds} segundo',
  },
  fullscreen: {
    enter: 'Pantaila osoa',
    exit: 'Irten pantaila osotik',
  },
  captions: {
    enable: 'Aktibatu azpitituluak',
    disable: 'Desaktibatu azpitituluak',
  },
  pip: {
    enter: 'Irudiz-irudi',
    exit: 'Irten irudiz-irudiztik',
  },
  live: {
    playing: 'Zuzenean erreproduzitzen',
    seekToEdge: 'Zuzeneko ertzeraino joan',
    badge: 'Zuzenean',
  },
  cast: {
    start: 'Hasi emankizuna',
    stop: 'Gelditu emankizuna',
    connecting: 'Konektatzen',
  },
  airplay: {
    start: 'Hasi AirPlay',
    stop: 'Gelditu AirPlay',
  },
  slider: {
    seek: 'Bilatu',
  },
  time: {
    current: 'Uneko denbora',
    duration: 'Iraupena',
    remaining: 'Gelditzen den denbora',
    remainingSuffix: 'Geratzen den {duration}',
    showElapsed: '{duration}. Erakutsi igarotako denbora.',
    showDuration: '{duration}. Erakutsi iraupena.',
    showRemaining: '{duration}. Erakutsi geratzen den denbora.',
    position: '{current} / {duration}',
  },
  playback: {
    rate: 'Abiadura {rate}',
  },
  volume: {
    mutedValue: '{percent}, isilarazia',
    muted: 'Isilarazia',
    label: 'Bolumena',
    value: 'Bolumena {value}',
  },
  status: {
    captionsOn: 'Oharrak aktibo',
    captionsOff: 'Oharrak ez aktibo',
    paused: 'Geldituta',
    playing: 'Erreproduzitzen',
    fullscreen: 'Pantaila osoa',
    pip: 'Irudiz irudi',
    exitPip: 'Irten irudiz irudiztik',
  },
  errors: {
    aborted: 'Bertan behera utzi duzu',
    network: 'Sare errore batek deskargak huts egitea eragin du.',
    decode:
      'Bertan behera gelditu da fitxategia ondo ez dagoelako edo zure nabigatzailean erabili ezin diren ezaugarriak dituelako.',
    source:
      'Media ezin izan da kargatu, zerbitzariak edo sareak huts egin duelako edo formatu horretako media erabili ezin delako.',
    encrypted: 'Media zifratuta dago eta ez ditugu beharrezko gakoak.',
    title: 'Zerbait gaizki joan da.',
    unexpected: 'Errore bat gertatu da. Saiatu berriro.',
  },
  common: {
    empty: '',
    ok: 'Itxi',
  },
  menu: {
    settings: 'Ezarpenak',
    quality: 'Kalitatea',
    audio: 'Audioa',
    default: 'Lehenetsia',
    speed: 'Abiadura',
    captions: 'Azpitituluak',
    playbackRate: 'Erreprodukzio-abiadura',
    back: 'Atzera',
    off: 'Desaktibatuta',
    auto: 'Automatikoa',
    autoWithLabel: 'Automatikoa ({label})',
    subtitles: 'Azpitituluak',
  },
} as const satisfies Translations;
