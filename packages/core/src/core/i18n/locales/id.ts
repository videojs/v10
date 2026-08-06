import type { Translations } from '../params';

export default {
  buttons: {
    play: 'Putar',
    pause: 'Jeda',
    replay: 'Putar ulang',
    mute: 'Bisukan',
    unmute: 'Bunyikan',
  },
  seek: {
    forward: 'Maju {seconds} detik',
    backward: 'Mundur {seconds} detik',
  },
  fullscreen: {
    enter: 'Masuk layar penuh',
    exit: 'Keluar layar penuh',
  },
  captions: {
    enable: 'Aktifkan teks',
    disable: 'Nonaktifkan teks',
  },
  pip: {
    enter: 'Masuk mode mini',
    exit: 'Keluar dari mode mini',
  },
  live: {
    playing: 'Sedang diputar langsung',
    seekToEdge: 'Ke siaran langsung',
    badge: 'Langsung',
  },
  cast: {
    start: 'Mulai transmisi',
    stop: 'Hentikan transmisi',
    connecting: 'Menghubungkan',
  },
  airplay: {
    start: 'Mulai AirPlay',
    stop: 'Hentikan AirPlay',
  },
  slider: {
    seek: 'Cari',
  },
  time: {
    current: 'Waktu saat ini',
    duration: 'Durasi',
    remaining: 'Waktu tersisa',
    remainingSuffix: '{duration} tersisa',
    showElapsed: '{duration}. Tampilkan waktu berlalu.',
    showDuration: '{duration}. Tampilkan durasi.',
    showRemaining: '{duration}. Tampilkan waktu tersisa.',
    position: '{current} dari {duration}',
  },
  playback: {
    rate: 'Kecepatan pemutaran {rate}',
  },
  volume: {
    mutedValue: '{percent}, dibisukan',
    muted: 'Dibisukan',
    label: 'Volume',
    value: 'Volume {value}',
  },
  status: {
    captionsOn: 'Teks aktif',
    captionsOff: 'Teks nonaktif',
    paused: 'Dijeda',
    playing: 'Sedang diputar',
    fullscreen: 'Layar penuh',
    pip: 'Mode mini',
    exitPip: 'Keluar dari mode mini',
    seekedTo: 'Melompat ke {time}',
  },
  container: {
    label: 'Pemutar media',
  },
  errors: {
    aborted: 'Anda menghentikan pemutaran media sebelum selesai.',
    network: 'Media tidak dapat dimuat karena masalah jaringan atau server.',
    decode: 'Media tidak dapat diputar. Media mungkin rusak atau formatnya tidak didukung oleh peramban Anda.',
    source: 'Media tidak dapat dimuat. Media mungkin tidak tersedia atau formatnya tidak didukung oleh peramban Anda.',
    encrypted: 'Media tidak dapat diputar karena tidak dapat didekripsi.',
    unplayable: 'Media ini tidak didukung oleh pemutar.',
    title: 'Terjadi kesalahan.',
    unexpected: 'Terjadi kesalahan yang tidak terduga.',
  },
  common: {
    empty: '',
    ok: 'OK',
  },
  menu: {
    settings: 'Pengaturan',
    quality: 'Kualitas',
    audio: 'Audio',
    default: 'Bawaan',
    speed: 'Kecepatan',
    captions: 'Pilihan teks',
    playbackRate: 'Kecepatan pemutaran',
    back: 'Kembali',
    off: 'Nonaktif',
    auto: 'Otomatis',
    autoWithLabel: 'Otomatis ({label})',
    subtitles: 'Teks',
  },
} as const satisfies Translations;
