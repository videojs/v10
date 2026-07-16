import type { Translations } from '../params';

export default {
  buttons: {
    play: 'Chwarae',
    pause: 'Oedi',
    replay: 'Ailchwarae',
    mute: 'Pylu',
    unmute: 'Dad-bylu',
  },
  seek: {
    forward: 'Neidla ymlaen {seconds} eiliad',
    backward: 'Neidla yn ôl {seconds} eiliad',
  },
  fullscreen: {
    enter: 'Sgrîn Lawn',
    exit: 'Gadael sgrîn lawn',
  },
  captions: {
    enable: 'Galluogi capsiynau',
    disable: 'Analluogi capsiynau',
  },
  pip: {
    enter: 'Llun mewn llun',
    exit: 'Gadael llun mewn llun',
  },
  live: {
    playing: 'Yn chwarae’n fyw',
    seekToEdge: 'Mynd i’r ymyl byw',
    badge: 'Yn fyw',
  },
  cast: {
    start: 'Dechrau bwrw',
    stop: 'Stopio bwrw',
    connecting: 'Cysylltu',
  },
  airplay: {
    start: 'Cychwyn AirPlay',
    stop: 'Stopio AirPlay',
  },
  slider: {
    seek: 'Chwilio',
  },
  time: {
    current: 'Amser Cyfredol',
    duration: 'Parhad',
    remaining: 'Amser ar ôl',
    remainingSuffix: '{duration} yn weddill',
    showElapsed: '{duration}. Dangos yr amser a aeth heibio.',
    showDuration: '{duration}. Dangos hyd.',
    showRemaining: "{duration}. Dangos yr amser sy'n weddill.",
    position: '{current} o {duration}',
  },
  playback: {
    rate: 'Cyfradd Chwarae {rate}',
  },
  volume: {
    mutedValue: '{percent}, mud',
    muted: 'Mud',
    label: 'Sain',
    value: 'Sain {value}',
  },
  status: {
    captionsOn: 'Capsiynau ymlaen',
    captionsOff: 'Capsiynau i ffwrdd',
    paused: 'Wedi oedi',
    playing: 'Yn chwarae',
    fullscreen: 'Sgrîn lawn',
    pip: 'Llun mewn llun',
    exitPip: 'Gadael llun mewn llun',
  },
  errors: {
    aborted: 'Atalwyd y fideo gennych',
    network: 'Mae gwall rhwydwaith wedi achosi methiant lawrlwytho.',
    decode:
      "Atalwyd y fideo oherwydd problem llygredd data neu oherwydd nid yw'ch porwr yn cefnogi nodweddion penodol o'r fideo.",
    source:
      "Ni lwythodd y fideo, oherwydd methiant gweinydd neu rwydwaith, neu achos nid yw'r system yn cefnogi'r fformat.",
    encrypted: "Mae'r fideo wedi ei amgryptio ac nid oes allweddion gennym.",
    title: "Aeth rhywbeth o'i le.",
    unexpected: 'Digwyddodd gwall. Ceisiwch eto.',
  },
  common: {
    empty: '',
    ok: 'Cau',
  },
  menu: {
    settings: 'Gosodiadau',
    quality: 'Ansawdd',
    audio: 'Sain',
    default: 'Rhagosodedig',
    speed: 'Cyflymder',
    captions: 'Capsiynau',
    playbackRate: 'Cyfradd chwarae',
    back: 'Yn ôl',
    off: 'I ffwrdd',
    auto: 'Awtomatig',
    autoWithLabel: 'Awtomatig ({label})',
    subtitles: 'Isdeitlau',
  },
} as const satisfies Translations;
