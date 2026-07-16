import type { Translations } from '../params';

export default {
  buttons: {
    play: '再生',
    pause: '一時停止',
    replay: 'もう一度見る',
    mute: 'ミュート',
    unmute: 'サウンドをオン',
  },
  seek: {
    forward: '{seconds}秒進む',
    backward: '{seconds}秒戻る',
  },
  fullscreen: {
    enter: 'フルスクリーン',
    exit: '全画面表示解除',
  },
  captions: {
    enable: '字幕を表示',
    disable: '字幕を非表示',
  },
  pip: {
    enter: 'ピクチャーインピクチャー',
    exit: 'ピクチャーインピクチャー機能の終了',
  },
  live: {
    playing: 'ライブ再生中',
    seekToEdge: 'ライブ位置へ移動',
    badge: 'ライブ',
  },
  cast: {
    start: 'キャスト開始',
    stop: 'キャスト停止',
    connecting: '接続中',
  },
  airplay: {
    start: 'AirPlayを開始',
    stop: 'AirPlayを停止',
  },
  slider: {
    seek: 'シーク',
  },
  time: {
    current: '現在の時間',
    duration: '長さ',
    remaining: '残りの時間',
    remainingSuffix: '残り {duration}',
    showElapsed: '{duration}. 経過時間を表示.',
    showDuration: '{duration}. 再生時間を表示.',
    showRemaining: '{duration}. 残り時間を表示.',
    position: '{duration}の{current}',
  },
  playback: {
    rate: '再生レート {rate}',
  },
  volume: {
    mutedValue: '{percent}、ミュート',
    muted: 'ミュート',
    label: '音量',
    value: '音量 {value}',
  },
  status: {
    captionsOn: '字幕オン',
    captionsOff: '字幕オフ',
    paused: '一時停止',
    playing: '再生中',
    fullscreen: '全画面表示',
    pip: 'ピクチャーインピクチャー表示',
    exitPip: 'ピクチャーインピクチャー表示解除',
  },
  errors: {
    aborted: '動画再生を中止しました',
    network: 'ネットワーク エラーにより動画のダウンロードが途中で失敗しました',
    decode:
      '破損の問題、またはお使いのブラウザがサポートしていない機能が動画に使用されていたため、動画の再生が中止されました',
    source:
      'サーバーまたはネットワークのエラー、またはフォーマットがサポートされていないため、動画をロードできませんでした',
    encrypted: 'メディアは暗号化されており、解読するためのキーがありません。',
    title: '問題が発生しました。',
    unexpected: 'エラーが発生しました。再度お試しください。',
  },
  common: {
    empty: '',
    ok: '閉じる',
  },
  menu: {
    settings: '設定',
    quality: '画質',
    audio: '音声',
    default: 'デフォルト',
    speed: '速度',
    captions: 'キャプション',
    playbackRate: '再生速度',
    back: '戻る',
    off: 'オフ',
    auto: '自動',
    autoWithLabel: '自動 ({label})',
    subtitles: '字幕',
  },
} as const satisfies Translations;
