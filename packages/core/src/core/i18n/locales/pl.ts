import type { Translations } from '../params';

export default {
  buttons: {
    play: 'Odtwórz',
    pause: 'Wstrzymaj',
    replay: 'Odtwórz ponownie',
    mute: 'Wycisz',
    unmute: 'Wyłącz wyciszenie',
  },
  seek: {
    forward: 'Przewiń do przodu o {seconds} s',
    backward: 'Przewiń do tyłu o {seconds} s',
  },
  fullscreen: {
    enter: 'Pełny ekran',
    exit: 'Wyjdź z pełnego ekranu',
  },
  captions: {
    enable: 'Włącz napisy',
    disable: 'Wyłącz napisy',
  },
  pip: {
    enter: 'Obraz w obrazie',
    exit: 'Wyjdź z trybu obraz w obrazie',
  },
  live: {
    playing: 'Odtwarzanie na żywo',
    seekToEdge: 'Przejdź na transmisję na żywo',
    badge: 'Na żywo',
  },
  cast: {
    start: 'Rozpocznij przesyłanie',
    stop: 'Zatrzymaj przesyłanie',
    connecting: 'Łączenie',
  },
  airplay: {
    start: 'Uruchom AirPlay',
    stop: 'Zatrzymaj AirPlay',
  },
  slider: {
    seek: 'Przewijanie',
  },
  time: {
    current: 'Aktualny czas',
    duration: 'Czas trwania',
    remaining: 'Pozostały czas',
    remainingSuffix: 'Pozostało {duration}',
    showElapsed: '{duration}. Pokaż upływ czasu.',
    showDuration: '{duration}. Pokaż czas trwania.',
    showRemaining: '{duration}. Pokaż pozostały czas.',
    position: '{current} z {duration}',
  },
  playback: {
    rate: 'Prędkość odtwarzania {rate}',
  },
  volume: {
    mutedValue: '{percent}, wyciszono',
    muted: 'Wyciszono',
    label: 'Głośność',
    value: 'Głośność {value}',
  },
  status: {
    captionsOn: 'Napisy włączone',
    captionsOff: 'Napisy wyłączone',
    paused: 'Wstrzymano',
    playing: 'Odtwarzanie',
    fullscreen: 'Pełny ekran',
    pip: 'Obraz w obrazie',
    exitPip: 'Wyjdź z obrazu w obrazie',
  },
  errors: {
    aborted: 'Odtwarzanie zostało przerwane',
    network: 'Błąd sieci spowodował częściowe niepowodzenie pobierania materiału wideo.',
    decode:
      'Odtwarzanie materiału wideo zostało przerwane z powodu uszkodzonego pliku wideo lub z powodu użycia funkcji multimediów nieobsługiwanych przez Twoją przeglądarkę.',
    source:
      'Materiał wideo nie może zostać załadowany, ponieważ wystąpił problem z serwerem lub siecią albo format materiału wideo nie jest obsługiwany',
    encrypted: 'Materiał jest zaszyfrowany, a nie mamy kluczy do jego odszyfrowania.',
    title: 'Coś poszło nie tak.',
    unexpected: 'Wystąpił błąd. Spróbuj ponownie.',
  },
  common: {
    empty: '',
    ok: 'Zamknij',
  },
  menu: {
    settings: 'Ustawienia',
    quality: 'Jakość',
    audio: 'Dźwięk',
    default: 'Domyślne',
    speed: 'Szybkość',
    captions: 'Napisy',
    playbackRate: 'Prędkość odtwarzania',
    back: 'Wstecz',
    off: 'Wyłączone',
    auto: 'Auto',
    autoWithLabel: 'Auto ({label})',
    subtitles: 'Napisy',
  },
} as const satisfies Translations;
