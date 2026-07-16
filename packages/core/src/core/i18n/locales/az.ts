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
    remainingSuffix: 'Qalan {duration}',
    showElapsed: '{duration}. Keçən vaxtı göstər.',
    showDuration: '{duration}. Müddəti göstər.',
    showRemaining: '{duration}. Qalan vaxtı göstər.',
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
  },
  errors: {
    aborted: 'Siz medianın oxudulmasını dayandırdınız',
    network: 'Şəbəkə xətası səbəbindən medianın endirilməsi yarıda qaldı.',
    decode:
      'Media faylının korlanması səbəbilə və ya media faylın brauzerinizin dəstəkləmədiyi funksiyalardan istifadə etdiyinə görə medianın oxudulması dayandırılıb.',
    source: 'Yükləmə xətası.',
    encrypted: 'Media faylı şifrələnib və onun şifrəsini açmaq üçün açarlar yoxdur.',
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
