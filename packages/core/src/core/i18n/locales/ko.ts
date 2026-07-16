import type { Translations } from '../params';

export default {
  buttons: {
    play: '재생',
    pause: '일시중지',
    replay: '다시 재생',
    mute: '음소거',
    unmute: '소리 활성화하기',
  },
  seek: {
    forward: '{seconds}초 앞으로',
    backward: '{seconds}초 뒤로',
  },
  fullscreen: {
    enter: '전체 화면',
    exit: '전체 화면 종료',
  },
  captions: {
    enable: '자막 켜기',
    disable: '자막 끄기',
  },
  pip: {
    enter: '화면 속 화면',
    exit: '화면 속 화면 종료',
  },
  live: {
    playing: '라이브 재생 중',
    seekToEdge: '라이브 지점으로 이동',
    badge: '라이브',
  },
  cast: {
    start: '전송 시작',
    stop: '전송 중지',
    connecting: '연결 중',
  },
  airplay: {
    start: 'AirPlay 시작',
    stop: 'AirPlay 중지',
  },
  slider: {
    seek: '탐색',
  },
  time: {
    current: '현재 시간',
    duration: '지정 기간',
    remaining: '남은 시간',
    remainingSuffix: '{duration} 남음',
    showElapsed: '{duration}. 경과 시간 표시.',
    showDuration: '{duration}. 길이 표시.',
    showRemaining: '{duration}. 남은 시간 표시.',
    position: '{duration} 중 {current}',
  },
  playback: {
    rate: '재생 속도 {rate}',
  },
  volume: {
    mutedValue: '{percent}, 음소거',
    muted: '음소거',
    label: '볼륨',
    value: '볼륨 {value}',
  },
  status: {
    captionsOn: '자막 켜짐',
    captionsOff: '자막 꺼짐',
    paused: '일시정지',
    playing: '재생 중',
    fullscreen: '전체 화면',
    pip: '화면 속 화면',
    exitPip: '화면 속 화면 종료',
  },
  errors: {
    aborted: '비디오 재생을 취소했습니다.',
    network: '네트워크 오류로 인하여 비디오 일부를 다운로드하지 못 했습니다.',
    decode:
      '비디오 재생이 취소됐습니다. 비디오가 손상되었거나 비디오가 사용하는 기능을 브라우저에서 지원하지 않는 것 같습니다.',
    source: '비디오를 로드할 수 없습니다. 서버 혹은 네트워크 오류 때문이거나 지원되지 않는 형식 때문일 수 있습니다.',
    encrypted: '미디어는 암호화되어 있으며 이를 해독할 키를 갖고 있지 않습니다.',
    title: '문제가 발생했습니다.',
    unexpected: '오류가 발생했습니다. 다시 시도해 주세요.',
  },
  common: {
    empty: '',
    ok: '닫기',
  },
  menu: {
    settings: '설정',
    quality: '품질',
    audio: '오디오',
    default: '기본값',
    speed: '속도',
    captions: '캡션',
    playbackRate: '재생 속도',
    back: '뒤로',
    off: '끄기',
    auto: '자동',
    autoWithLabel: '자동 ({label})',
    subtitles: '자막',
  },
} as const satisfies Translations;
