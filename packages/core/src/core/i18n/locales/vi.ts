import type { Translations } from '../params';

export default {
  buttons: {
    play: 'Phát',
    pause: 'Tạm dừng',
    replay: 'Phát lại',
    mute: 'Tắt tiếng',
    unmute: 'Bật âm thanh',
  },
  seek: {
    forward: 'Tua tới {seconds} giây',
    backward: 'Tua lại {seconds} giây',
  },
  fullscreen: {
    enter: 'Toàn màn hình',
    exit: 'Thoát toàn màn hình',
  },
  captions: {
    enable: 'Bật phụ đề',
    disable: 'Tắt chú thích',
  },
  pip: {
    enter: 'Màn hình trong màn hình',
    exit: 'Thoát màn hình trong màn hình',
  },
  live: {
    playing: 'Đang phát trực tiếp',
    seekToEdge: 'Tua tới trực tiếp',
    badge: 'Trực tiếp',
  },
  cast: {
    start: 'Bắt đầu truyền phát',
    stop: 'Dừng truyền phát',
    connecting: 'Đang kết nối',
  },
  airplay: {
    start: 'Bắt đầu AirPlay',
    stop: 'Dừng AirPlay',
  },
  slider: {
    seek: 'Tua',
  },
  time: {
    current: 'Thời gian hiện tại',
    duration: 'Độ dài',
    remaining: 'Thời gian còn lại',
    remainingSuffix: 'Còn {duration}',
    showElapsed: '{duration}. Hiển thị thời gian đã phát.',
    showDuration: '{duration}. Hiển thị thời lượng.',
    showRemaining: '{duration}. Hiển thị thời gian còn lại.',
    position: '{current} của {duration}',
  },
  playback: {
    rate: 'Tỉ lệ phát lại {rate}',
  },
  volume: {
    mutedValue: '{percent}, đã tắt tiếng',
    muted: 'Đã tắt tiếng',
    label: 'Âm lượng',
    value: 'Âm lượng {value}',
  },
  status: {
    captionsOn: 'Bật chú thích',
    captionsOff: 'Tắt chú thích',
    paused: 'Đã tạm dừng',
    playing: 'Đang phát',
    fullscreen: 'Toàn màn hình',
    pip: 'Màn hình trong màn hình',
    exitPip: 'Thoát màn hình trong màn hình',
  },
  errors: {
    aborted: 'Bạn đã hủy việc phát lại media.',
    network: 'Một lỗi mạng dẫn đến việc tải media bị lỗi.',
    decode: 'Phát media đã bị hủy do một sai lỗi hoặc media sử dụng những tính năng trình duyệt không hỗ trợ.',
    source: 'Video không tải được, mạng hay server có lỗi hoặc định dạng không được hỗ trợ.',
    encrypted: 'Media đã được mã hóa và chúng tôi không có khóa để giải mã.',
    title: 'Đã xảy ra lỗi.',
    unexpected: 'Đã xảy ra lỗi. Vui lòng thử lại.',
  },
  common: {
    empty: '',
    ok: 'Đóng',
  },
  menu: {
    settings: 'Cài đặt',
    quality: 'Chất lượng',
    audio: 'Âm thanh',
    default: 'Mặc định',
    speed: 'Tốc độ',
    captions: 'Phụ đề',
    playbackRate: 'Tốc độ phát lại',
    back: 'Quay lại',
    off: 'Tắt',
    auto: 'Tự động',
    autoWithLabel: 'Tự động ({label})',
    subtitles: 'Phụ đề',
  },
} as const satisfies Translations;
