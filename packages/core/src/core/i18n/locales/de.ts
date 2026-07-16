import type { Translations } from '../params';

export default {
  buttons: {
    play: 'Wiedergabe',
    pause: 'Pause',
    replay: 'Erneut abspielen',
    mute: 'Stumm schalten',
    unmute: 'Ton einschalten',
  },
  seek: {
    forward: '{seconds} Sekunden vorwärts',
    backward: '{seconds} Sekunden zurück',
  },
  fullscreen: {
    enter: 'Vollbild',
    exit: 'Vollbild beenden',
  },
  captions: {
    enable: 'Untertitel einschalten',
    disable: 'Untertitel ausschalten',
  },
  pip: {
    enter: 'Bild-im-Bild-Modus',
    exit: 'Bild-im-Bild-Modus beenden',
  },
  live: {
    playing: 'Wird live wiedergegeben',
    seekToEdge: 'Zum Live-Rand springen',
    badge: 'Live',
  },
  cast: {
    start: 'Übertragung starten',
    stop: 'Übertragung beenden',
    connecting: 'Verbinden',
  },
  airplay: {
    start: 'AirPlay starten',
    stop: 'AirPlay stoppen',
  },
  slider: {
    seek: 'Spule',
  },
  time: {
    current: 'Aktueller Zeitpunkt',
    duration: 'Dauer',
    remaining: 'Verbleibende Zeit',
    remainingSuffix: 'Noch {duration}',
    showElapsed: '{duration}. Verstrichene Zeit anzeigen.',
    showDuration: '{duration}. Dauer anzeigen.',
    showRemaining: '{duration}. Verbleibende Zeit anzeigen.',
    position: '{current} von {duration}',
  },
  playback: {
    rate: 'Wiedergabegeschwindigkeit {rate}',
  },
  volume: {
    mutedValue: '{percent}, stummgeschaltet',
    muted: 'Stummgeschaltet',
    label: 'Lautstärke',
    value: 'Lautstärke {value}',
  },
  status: {
    captionsOn: 'Untertitel ein',
    captionsOff: 'Untertitel aus',
    paused: 'Pausiert',
    playing: 'Wird wiedergegeben',
    fullscreen: 'Vollbild',
    pip: 'Bild-in-Bild',
    exitPip: 'Bild-in-Bild beenden',
  },
  errors: {
    aborted: 'Sie haben die Videowiedergabe abgebrochen.',
    network: 'Der Videodownload ist aufgrund eines Netzwerkfehlers fehlgeschlagen.',
    decode:
      'Die Videowiedergabe wurde entweder wegen eines Problems mit einem beschädigten Video oder wegen verwendeten Funktionen, die vom Browser nicht unterstützt werden, abgebrochen.',
    source:
      'Das Video konnte nicht geladen werden, da entweder ein Server- oder Netzwerkfehler auftrat oder das Format nicht unterstützt wird.',
    encrypted: 'Die Entschlüsselungsschlüssel für den verschlüsselten Medieninhalt sind nicht verfügbar.',
    title: 'Etwas ist schiefgelaufen.',
    unexpected: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
  },
  common: {
    empty: '',
    ok: 'Schließen',
  },
  menu: {
    settings: 'Einstellungen',
    quality: 'Qualität',
    audio: 'Ton',
    default: 'Standard',
    speed: 'Geschwindigkeit',
    captions: 'Untertitel',
    playbackRate: 'Wiedergabegeschwindigkeit',
    back: 'Zurück',
    off: 'Aus',
    auto: 'Auto',
    autoWithLabel: 'Auto ({label})',
    subtitles: 'Untertitel',
  },
} as const satisfies Translations;
