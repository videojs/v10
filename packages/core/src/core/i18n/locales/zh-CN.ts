import type { Translations } from '../params';

export default {
  buttons: {
    play: '播放',
    pause: '暂停',
    replay: '重新播放',
    mute: '静音',
    unmute: '开启音效',
  },
  seek: {
    forward: '快进 {seconds} 秒',
    backward: '快退 {seconds} 秒',
  },
  fullscreen: {
    enter: '全屏',
    exit: '退出全屏',
  },
  captions: {
    enable: '开启字幕',
    disable: '关闭字幕',
  },
  pip: {
    enter: '画中画',
    exit: '退出画中画',
  },
  live: {
    playing: '正在直播',
    seekToEdge: '跳转到直播',
    badge: '直播',
  },
  cast: {
    start: '开始投屏',
    stop: '停止投屏',
    connecting: '正在连接',
  },
  airplay: {
    start: '启动 AirPlay',
    stop: '停止 AirPlay',
  },
  slider: {
    seek: '定位',
  },
  time: {
    current: '当前时间',
    duration: '时长',
    remaining: '剩余时间',
    remainingSuffix: '剩余 {duration}',
    showElapsed: '{duration}. 显示已播放时间.',
    showDuration: '{duration}. 显示时长.',
    showRemaining: '{duration}. 显示剩余时间.',
    position: '{current}，总时长 {duration}',
  },
  playback: {
    rate: '播放速度 {rate}',
  },
  volume: {
    mutedValue: '{percent}，已静音',
    muted: '已静音',
    label: '音量',
    value: '音量 {value}',
  },
  status: {
    captionsOn: '字幕已开启',
    captionsOff: '字幕已关闭',
    paused: '已暂停',
    playing: '正在播放',
    fullscreen: '全屏',
    pip: '画中画',
    exitPip: '退出画中画',
  },
  errors: {
    aborted: '视频播放被终止',
    network: '网络错误导致视频下载中途失败。',
    decode: '由于视频文件损坏或是该视频使用了你的浏览器不支持的功能，播放终止。',
    source: '视频因格式不支持或者服务器或网络的问题无法加载。',
    encrypted: '视频已加密，无法解密。',
    title: '出现问题。',
    unexpected: '发生错误，请重试。',
  },
  common: {
    empty: '',
    ok: '关闭',
  },
  menu: {
    settings: '设置',
    quality: '画质',
    audio: '音频',
    default: '默认',
    speed: '速度',
    captions: '字幕',
    playbackRate: '播放速度',
    back: '返回',
    off: '关闭',
    auto: '自动',
    autoWithLabel: '自动（{label}）',
    subtitles: '字幕',
  },
} as const satisfies Translations;
