import type { Translations } from '../params';

export default {
  buttons: {
    play: 'Lejátszás',
    pause: 'Szünet',
    replay: 'Visszajátszás',
    mute: 'Némítás',
    unmute: 'Némítás kikapcsolva',
  },
  seek: {
    forward: 'Ugrás előre {seconds} másodpercet',
    backward: 'Ugrás vissza {seconds} másodpercet',
  },
  fullscreen: {
    enter: 'Teljes képernyő',
    exit: 'Kilépés teljes képernyőből',
  },
  captions: {
    enable: 'Feliratok bekapcsolása',
    disable: 'Feliratok kikapcsolása',
  },
  pip: {
    enter: 'Kép a képben',
    exit: 'Kilépés kép a képben módból',
  },
  live: {
    playing: 'Élő adás',
    seekToEdge: 'Ugrás az élő adáshoz',
    badge: 'Élő',
  },
  cast: {
    start: 'Vetítés indítása',
    stop: 'Vetítés leállítása',
    connecting: 'Csatlakozás',
  },
  airplay: {
    start: 'AirPlay indítása',
    stop: 'AirPlay leállítása',
  },
  slider: {
    seek: 'Teke',
  },
  time: {
    current: 'Aktuális időpont',
    duration: 'Hossz',
    remaining: 'Hátralévő idő',
    remainingSuffix: '{duration} van hátra',
    showElapsed: '{duration}. Eltelt idő megjelenítése.',
    showDuration: '{duration}. Időtartam megjelenítése.',
    showRemaining: '{duration}. Hátralévő idő megjelenítése.',
    position: '{current} / {duration}',
  },
  playback: {
    rate: 'Lejátszási sebesség {rate}',
  },
  volume: {
    mutedValue: '{percent}, némítva',
    muted: 'Némítva',
    label: 'Hangerő',
    value: 'Hangerő {value}',
  },
  status: {
    captionsOn: 'Feliratok bekapcsolva',
    captionsOff: 'Feliratok kikapcsolva',
    paused: 'Szüneteltetve',
    playing: 'Lejátszás',
    fullscreen: 'Teljes képernyő',
    pip: 'Kép a képben',
    exitPip: 'Kilépés kép a képben módból',
  },
  errors: {
    aborted: 'Leállította a lejátszást',
    network: 'Hálózati hiba miatt a videó részlegesen töltődött le.',
    decode: 'A lejátszás adatsérülés miatt leállt, vagy a videó egyes tulajdonságait a böngészője nem támogatja.',
    source: 'A videó nem tölthető be hálózati vagy kiszolgálói hiba miatt, vagy a formátuma nem támogatott.',
    encrypted: 'A média titkosítva van és nincsenek kulcsok a visszafejtéshez.',
    title: 'Valami hiba történt.',
    unexpected: 'Hiba történt. Kérjük, próbálja újra.',
  },
  common: {
    empty: '',
    ok: 'Bezárás',
  },
  menu: {
    settings: 'Beállítások',
    quality: 'Minőség',
    audio: 'Hang',
    default: 'Alapértelmezett',
    speed: 'Sebesség',
    captions: 'Feliratok',
    playbackRate: 'Lejátszási sebesség',
    back: 'Vissza',
    off: 'Ki',
    auto: 'Automatikus',
    autoWithLabel: 'Automatikus ({label})',
    subtitles: 'Feliratok',
  },
} as const satisfies Translations;
