import type { Translations } from '../params';

export default {
  buttons: {
    play: 'Riproduci',
    pause: 'Pausa',
    replay: 'Riproduci di nuovo',
    mute: 'Disattiva l’audio',
    unmute: 'Attiva l’audio',
  },
  seek: {
    forward: 'Avanti {seconds} secondi',
    backward: 'Indietro {seconds} secondi',
  },
  fullscreen: {
    enter: 'Schermo intero',
    exit: 'Esci da schermo intero',
  },
  captions: {
    enable: 'Attiva sottotitoli',
    disable: 'Disattiva sottotitoli',
  },
  pip: {
    enter: 'Picture-in-Picture',
    exit: 'Esci dalla modalità Picture-in-Picture',
  },
  live: {
    playing: 'Riproduzione in diretta',
    seekToEdge: 'Vai al live',
    badge: 'In diretta',
  },
  cast: {
    start: 'Avvia trasmissione',
    stop: 'Interrompi trasmissione',
    connecting: 'Connessione',
  },
  airplay: {
    start: 'Avvia AirPlay',
    stop: 'Arresta AirPlay',
  },
  slider: {
    seek: 'Scorrimento',
  },
  time: {
    current: 'Orario attuale',
    duration: 'Durata',
    remaining: 'Tempo rimanente',
    remainingSuffix: 'Restano {duration}',
    showElapsed: '{duration}. Mostra tempo trascorso.',
    showDuration: '{duration}. Mostra durata.',
    showRemaining: '{duration}. Mostra tempo rimanente.',
    position: '{current} di {duration}',
  },
  playback: {
    rate: 'Velocità di riproduzione {rate}',
  },
  volume: {
    mutedValue: '{percent}, audio disattivato',
    muted: 'Audio disattivato',
    label: 'Livello del volume',
    value: 'Livello del volume {value}',
  },
  status: {
    captionsOn: 'Sottotitoli attivi',
    captionsOff: 'Sottotitoli disattivi',
    paused: 'In pausa',
    playing: 'In riproduzione',
    fullscreen: 'Schermo intero',
    pip: 'Picture-in-picture',
    exitPip: 'Esci dalla modalità Picture-in-picture',
  },
  errors: {
    aborted: 'La riproduzione del contenuto multimediale è stata interrotta.',
    network: 'Il download del contenuto multimediale è stato interrotto a causa di un problema rete.',
    decode:
      'La riproduzione del contenuto multimediale è stata interrotta a causa di un file danneggiato o per l’utilizzo di impostazioni non supportate dal browser.',
    source:
      'Il contenuto multimediale non può essere caricato a causa di un errore nel server o nella rete o perché il formato non viene supportato.',
    encrypted: 'Il contenuto multimediale è criptato e non disponiamo delle chiavi per decifrarlo.',
    title: 'Qualcosa è andato storto.',
    unexpected: 'Si è verificato un errore. Riprova.',
  },
  common: {
    empty: '',
    ok: 'Chiudi',
  },
  menu: {
    settings: 'Impostazioni',
    quality: 'Qualità',
    audio: 'Audio',
    default: 'Predefinito',
    speed: 'Velocità',
    captions: 'Sottotitoli',
    playbackRate: 'Velocità di riproduzione',
    back: 'Indietro',
    off: 'Disattivato',
    auto: 'Auto',
    autoWithLabel: 'Auto ({label})',
    subtitles: 'Sottotitoli',
  },
} as const satisfies Translations;
