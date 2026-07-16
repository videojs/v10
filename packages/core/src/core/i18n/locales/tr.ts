import type { Translations } from '../params';

export default {
  buttons: {
    play: 'Oynat',
    pause: 'Duraklat',
    replay: 'Yeniden Oynat',
    mute: 'Sessiz',
    unmute: 'Sesi Aç',
  },
  seek: {
    forward: '{seconds} saniye ileri sar',
    backward: '{seconds} saniye geri sar',
  },
  fullscreen: {
    enter: 'Tam Ekran',
    exit: 'Tam ekrandan çık',
  },
  captions: {
    enable: 'Altyazıları aç',
    disable: 'Altyazıları kapat',
  },
  pip: {
    enter: 'Mini oynatıcı',
    exit: 'Mini oynatıcıdan çık',
  },
  live: {
    playing: 'Canlı oynatılıyor',
    seekToEdge: 'Canlıya git',
    badge: 'Canlı',
  },
  cast: {
    start: 'Yansıtmayı başlat',
    stop: 'Yansıtmayı durdur',
    connecting: 'Bağlanıyor',
  },
  airplay: {
    start: "AirPlay'i başlat",
    stop: "AirPlay'i durdur",
  },
  slider: {
    seek: 'Ara',
  },
  time: {
    current: 'Süre',
    duration: 'Toplam Süre',
    remaining: 'Kalan Süre',
    remainingSuffix: '{duration} kaldı',
    showElapsed: '{duration}. Geçen süreyi göster.',
    showDuration: '{duration}. Süreyi göster.',
    showRemaining: '{duration}. Kalan süreyi göster.',
    position: '{current} / {duration}',
  },
  playback: {
    rate: 'Oynatma Hızı {rate}',
  },
  volume: {
    mutedValue: '{percent}, sessiz',
    muted: 'Sessiz',
    label: 'Ses',
    value: 'Ses {value}',
  },
  status: {
    captionsOn: 'Altyazılar açık',
    captionsOff: 'Altyazılar kapalı',
    paused: 'Duraklatıldı',
    playing: 'Oynatılıyor',
    fullscreen: 'Tam ekran',
    pip: 'Resim içinde resim',
    exitPip: 'Resim içinde resimden çık',
  },
  errors: {
    aborted: 'Medyayı oynatmayı iptal ettiniz',
    network: 'Medya indirme işleminin kısmen başarısız olmasına neden olan bir ağ sorunu oluştu.',
    decode:
      'Medya oynatma, bir bozulma sorunu nedeniyle veya medya, tarayıcınızın desteklemediği özellikleri kullandığı için durduruldu.',
    source: 'Sunucu veya ağ hatasından ya da biçim desteklenmediğinden medya yüklenemedi.',
    encrypted: 'Medya, şifrelenmiş bir kaynaktan geliyor ve oynatmak için gerekli anahtar bulunamadı.',
    title: 'Bir şeyler ters gitti.',
    unexpected: 'Bir hata oluştu. Lütfen tekrar deneyin.',
  },
  common: {
    empty: '',
    ok: 'Kapat',
  },
  menu: {
    settings: 'Ayarlar',
    quality: 'Kalite',
    audio: 'Ses',
    default: 'Varsayılan',
    speed: 'Hız',
    captions: 'Altyazılar',
    playbackRate: 'Oynatma hızı',
    back: 'Geri',
    off: 'Kapalı',
    auto: 'Otomatik',
    autoWithLabel: 'Otomatik ({label})',
    subtitles: 'Altyazılar',
  },
} as const satisfies Translations;
