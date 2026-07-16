import type { Translations } from '../params';

export default {
  buttons: {
    play: '播放',
    pause: '暫停',
    replay: '重播',
    mute: '靜音',
    unmute: '開啟音效',
  },
  seek: {
    forward: '快轉 {seconds} 秒',
    backward: '倒轉 {seconds} 秒',
  },
  fullscreen: {
    enter: '全螢幕',
    exit: '退出全螢幕',
  },
  captions: {
    enable: '開啟字幕',
    disable: '關閉字幕',
  },
  pip: {
    enter: '子母畫面',
    exit: '離開子母畫面',
  },
  live: {
    playing: '正在直播',
    seekToEdge: '跳轉至直播',
    badge: '直播',
  },
  cast: {
    start: '開始投屏',
    stop: '停止投屏',
    connecting: '連線中',
  },
  airplay: {
    start: '啟動 AirPlay',
    stop: '停止 AirPlay',
  },
  slider: {
    seek: '定位',
  },
  time: {
    current: '目前時間',
    duration: '總共時間',
    remaining: '剩餘時間',
    remainingSuffix: '剩餘 {duration}',
    showElapsed: '{duration}. 顯示已播放時間.',
    showDuration: '{duration}. 顯示時長.',
    showRemaining: '{duration}. 顯示剩餘時間.',
    position: '{current}，總時長 {duration}',
  },
  playback: {
    rate: '播放速率 {rate}',
  },
  volume: {
    mutedValue: '{percent}，已靜音',
    muted: '已靜音',
    label: '音量',
    value: '音量 {value}',
  },
  status: {
    captionsOn: '字幕已開啟',
    captionsOff: '字幕已關閉',
    paused: '已暫停',
    playing: '正在播放',
    fullscreen: '全螢幕',
    pip: '子母畫面',
    exitPip: '離開子母畫面',
  },
  errors: {
    aborted: '影片播放已終止',
    network: '網路錯誤導致影片下載失敗。',
    decode: '由於影片檔案損毀或是該影片使用了您的瀏覽器不支援的功能，已終止播放媒體。',
    source: '因格式不支援、伺服器或網路的問題無法載入媒體。',
    encrypted: '媒體已加密，無法解密。',
    title: '發生問題。',
    unexpected: '發生錯誤，請重試。',
  },
  common: {
    empty: '',
    ok: '關閉',
  },
  menu: {
    settings: '設定',
    quality: '畫質',
    audio: '音訊',
    default: '預設',
    speed: '速度',
    captions: '字幕',
    playbackRate: '播放速率',
    back: '返回',
    off: '關閉',
    auto: '自動',
    autoWithLabel: '自動（{label}）',
    subtitles: '字幕',
  },
} as const satisfies Translations;
