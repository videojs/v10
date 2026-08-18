import type { Translations } from '../params';

export default {
  buttons: {
    play: 'Oynat',
    pause: 'Pauza',
    replay: 'Yenidən oynat',
    mute: 'Səssizi qoş',
    unmute: 'Səssizi söndür',
  },
  seek: {
    forward: '{seconds} saniyə qabağa keçin',
    backward: '{seconds} saniyə geriyə keçin',
  },
  fullscreen: {
    enter: 'Tam ekran',
    exit: 'Tam ekrandan çıx',
  },
  captions: {
    enable: 'Altyazıları aktiv et',
    disable: 'Altyazıları söndür',
  },
  pip: {
    enter: 'Şəkil içində şəkil rejimi',
    exit: 'Şəkil içində şəkil rejimindən çıxın',
  },
  live: {
    playing: 'Canlı yayımda',
    seekToEdge: 'Canlı yayıma keç',
    badge: 'Canlı',
  },
  cast: {
    start: 'Yayımı başlat',
    stop: 'Yayımı durdur',
    connecting: 'Qoşulur',
  },
  airplay: {
    start: 'AirPlay-i başlat',
    stop: 'AirPlay-i dayandır',
  },
  slider: {
    seek: 'Sürüşdür',
  },
  time: {
    current: 'Cari Vaxt',
    duration: 'Müddət',
    remaining: 'Qalan vaxt',
    elapsedSuffix: '{duration} keçən vaxt',
    durationSuffix: '{duration} müddət',
    remainingSuffix: 'Qalan {duration}',
    showElapsed: 'Keçən vaxtı göstər, {duration}.',
    showDuration: 'Müddəti göstər, {duration}.',
    showRemaining: 'Qalan vaxtı göstər, {duration}.',
    toggleElapsed: 'Keçən vaxt və qalan vaxt arasında keçid edin.',
    toggleDuration: 'Müddət və qalan vaxt arasında keçid edin.',
    position: '{current} / {duration}',
  },
  playback: {
    rate: 'Oynatma sürəti {rate}',
  },
  volume: {
    mutedValue: '{percent}, səssiz',
    muted: 'Səssiz',
    label: 'Səs',
    value: 'Səs {value}',
  },
  status: {
    captionsOn: 'Başlıqlar aktiv',
    captionsOff: 'Başlıqlar söndürülüb',
    paused: 'Dayandırılıb',
    playing: 'Oynadılır',
    fullscreen: 'Tam ekran',
    pip: 'Şəkil içində şəkil',
    exitPip: 'Şəkil içində şəkildən çıxın',
    seekedTo: '{time} vaxtına keçildi',
  },
  container: {
    label: 'Media pleyeri',
  },
  errors: {
    aborted: 'Siz medianın oxudulmasını dayandırdınız',
    network: 'Şəbəkə xətası səbəbindən medianın endirilməsi yarıda qaldı.',
    decode:
      'Media faylının korlanması səbəbilə və ya media faylın brauzerinizin dəstəkləmədiyi funksiyalardan istifadə etdiyinə görə medianın oxudulması dayandırılıb.',
    source: 'Yükləmə xətası.',
    encrypted: 'Media faylı şifrələnib və onun şifrəsini açmaq üçün açarlar yoxdur.',
    unplayable: 'Bu media pleyer tərəfindən dəstəklənmir.',
    title: 'Bir şey yanlış getdi.',
    unexpected: 'Xəta baş verdi. Yenidən cəhd edin.',
  },
  common: {
    empty: '',
    ok: 'Bağla',
  },
  menu: {
    settings: 'Parametrlər',
    quality: 'Keyfiyyət',
    audio: 'Səs',
    default: 'Defolt',
    speed: 'Sürət',
    captions: 'Başlıqlar',
    playbackRate: 'Oynatma sürəti',
    back: 'Geri',
    off: 'Söndür',
    auto: 'Avtomatik',
    autoWithLabel: 'Avtomatik ({label})',
    subtitles: 'Altyazılar',
  },
} as const satisfies Translations;
