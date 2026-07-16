import type { Translations } from '../params';

export default {
  buttons: {
    play: 'Afspelen',
    pause: 'Pauzeren',
    replay: 'Opnieuw afspelen',
    mute: 'Dempen',
    unmute: 'Dempen uit',
  },
  seek: {
    forward: '{seconds} seconden vooruit',
    backward: '{seconds} seconden terug',
  },
  fullscreen: {
    enter: 'Volledig scherm',
    exit: 'Volledig scherm verlaten',
  },
  captions: {
    enable: 'Ondertiteling inschakelen',
    disable: 'Ondertiteling uitschakelen',
  },
  pip: {
    enter: 'Picture-in-Picture',
    exit: 'Picture-in-Picture uit',
  },
  live: {
    playing: 'Speelt live',
    seekToEdge: 'Ga naar live',
    badge: 'Live',
  },
  cast: {
    start: 'Casten starten',
    stop: 'Casten stoppen',
    connecting: 'Verbinden',
  },
  airplay: {
    start: 'AirPlay starten',
    stop: 'AirPlay stoppen',
  },
  slider: {
    seek: 'Spoelen',
  },
  time: {
    current: 'Huidige tijd',
    duration: 'Tijdsduur',
    remaining: 'Resterende tijd',
    remainingSuffix: 'Nog {duration}',
    showElapsed: '{duration}. Verstreken tijd tonen.',
    showDuration: '{duration}. Duur tonen.',
    showRemaining: '{duration}. Resterende tijd tonen.',
    position: '{current} van {duration}',
  },
  playback: {
    rate: 'Afspeelsnelheid {rate}',
  },
  volume: {
    mutedValue: '{percent}, gedempt',
    muted: 'Gedempt',
    label: 'Geluidsniveau',
    value: 'Geluidsniveau {value}',
  },
  status: {
    captionsOn: 'Ondertiteling aan',
    captionsOff: 'Ondertiteling uit',
    paused: 'Gepauzeerd',
    playing: 'Wordt afgespeeld',
    fullscreen: 'Volledig scherm',
    pip: 'Beeld-in-beeld',
    exitPip: 'Beeld-in-beeld verlaten',
  },
  errors: {
    aborted: 'U heeft het afspelen van de media afgebroken',
    network: 'Een netwerkfout heeft ervoor gezorgd dat het downloaden van de media is mislukt.',
    decode:
      'Het afspelen van de media werd afgebroken vanwege een corruptieprobleem of omdat de uw browser de gebruikte mediafuncties niet ondersteund.',
    source:
      'De media kon niet worden geladen, doordat de server of het netwerk faalde of doordat het formaat niet wordt ondersteund.',
    encrypted: 'De media is gecodeerd en we hebben niet de sleutels om het te decoderen.',
    title: 'Er is iets misgegaan.',
    unexpected: 'Er is een fout opgetreden. Probeer het opnieuw.',
  },
  common: {
    empty: '',
    ok: 'Sluiten',
  },
  menu: {
    settings: 'Instellingen',
    quality: 'Kwaliteit',
    audio: 'Geluid',
    default: 'Standaard',
    speed: 'Snelheid',
    captions: 'Ondertiteling',
    playbackRate: 'Afspeelsnelheid',
    back: 'Terug',
    off: 'Uit',
    auto: 'Auto',
    autoWithLabel: 'Auto ({label})',
    subtitles: 'Ondertiteling',
  },
} as const satisfies Translations;
