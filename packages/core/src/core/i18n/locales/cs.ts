import type { Translations } from '../params';

export default {
  buttons: {
    play: 'Přehrát',
    pause: 'Pozastavit',
    replay: 'Přehrát znovu',
    mute: 'Ztlumit',
    unmute: 'Zrušit ztlumení',
  },
  seek: {
    forward: 'Posunout vpřed o {seconds} sekund',
    backward: 'Posunout zpět o {seconds} sekund',
  },
  fullscreen: {
    enter: 'Celá obrazovka',
    exit: 'Ukončit celou obrazovku',
  },
  captions: {
    enable: 'Zapnout titulky',
    disable: 'Vypnout titulky',
  },
  pip: {
    enter: 'Obraz v obraze',
    exit: 'Ukončit obraz v obraze',
  },
  live: {
    playing: 'Přehrává se živě',
    seekToEdge: 'Přejít na živé vysílání',
    badge: 'Živě',
  },
  cast: {
    start: 'Začít přenášet',
    stop: 'Zastavit přenos',
    connecting: 'Připojování',
  },
  airplay: {
    start: 'Spustit AirPlay',
    stop: 'Zastavit AirPlay',
  },
  slider: {
    seek: 'Posun',
  },
  time: {
    current: 'Aktuální čas',
    duration: 'Doba trvání',
    remaining: 'Zbývající čas',
    remainingSuffix: 'Zbývá {duration}',
    showElapsed: '{duration}. Zobrazit uplynulý čas.',
    showDuration: '{duration}. Zobrazit délku.',
    showRemaining: '{duration}. Zobrazit zbývající čas.',
    position: '{current} z {duration}',
  },
  playback: {
    rate: 'Rychlost přehrávání {rate}',
  },
  volume: {
    mutedValue: '{percent}, ztlumeno',
    muted: 'Ztlumeno',
    label: 'Hlasitost',
    value: 'Hlasitost {value}',
  },
  status: {
    captionsOn: 'Popisky zapnuty',
    captionsOff: 'Popisky vypnuty',
    paused: 'Pozastaveno',
    playing: 'Přehrávání',
    fullscreen: 'Celá obrazovka',
    pip: 'Obraz v obraze',
    exitPip: 'Ukončit obraz v obraze',
  },
  errors: {
    aborted: 'Přehrávání videa bylo přerušeno.',
    network: 'Video nemohlo být načteno kvůli chybě v síti.',
    decode: 'Váš prohlížeč nepodporuje tento formát videa.',
    source: 'Video nemohlo být načteno, buď kvůli chybě serveru, sítě nebo proto, že daný formát není podporován.',
    encrypted: 'Chyba při dešifrování videa.',
    title: 'Něco se pokazilo.',
    unexpected: 'Došlo k chybě. Zkuste to prosím znovu.',
  },
  common: {
    empty: '',
    ok: 'Zavřít',
  },
  menu: {
    settings: 'Nastavení',
    quality: 'Kvalita',
    audio: 'Zvuk',
    default: 'Výchozí',
    speed: 'Rychlost',
    captions: 'Titulky',
    playbackRate: 'Rychlost přehrávání',
    back: 'Zpět',
    off: 'Vypnuto',
    auto: 'Automaticky',
    autoWithLabel: 'Automaticky ({label})',
    subtitles: 'Titulky',
  },
} as const satisfies Translations;
