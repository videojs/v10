import type { Translations } from '../params';

export default {
  buttons: {
    play: 'เล่น',
    pause: 'หยุดชั่วคราว',
    replay: 'เล่นซ้ำ',
    mute: 'ปิดเสียง',
    unmute: 'ยกเลิกการปิดเสียง',
  },
  seek: {
    forward: 'ข้ามไปข้างหน้า {seconds} วินาที',
    backward: 'ข้ามไปข้างหลัง {seconds} วินาที',
  },
  fullscreen: {
    enter: 'แบบเต็มหน้าจอ',
    exit: 'ออกจากเต็มหน้าจอ',
  },
  captions: {
    enable: 'เปิดคำบรรยาย',
    disable: 'ปิดคำบรรยาย',
  },
  pip: {
    enter: 'การเล่นภาพควบคู่',
    exit: 'ออกจากการเล่นภาพควบคู่',
  },
  live: {
    playing: 'กำลังถ่ายทอดสด',
    seekToEdge: 'ไปยังจุดถ่ายทอดสด',
    badge: 'ถ่ายทอดสด',
  },
  cast: {
    start: 'เริ่มแคสต์',
    stop: 'หยุดแคสต์',
    connecting: 'กำลังเชื่อมต่อ',
  },
  airplay: {
    start: 'เริ่ม AirPlay',
    stop: 'หยุด AirPlay',
  },
  slider: {
    seek: 'ค้นหา',
  },
  time: {
    current: 'เวลาปัจจุบัน',
    duration: 'ระยะเวลา',
    remaining: 'เวลาที่เหลือ',
    remainingSuffix: 'เหลือ {duration}',
    showElapsed: '{duration}. แสดงเวลาที่ผ่านไป.',
    showDuration: '{duration}. แสดงระยะเวลา.',
    showRemaining: '{duration}. แสดงเวลาที่เหลือ.',
    position: '{current} ของ {duration}',
  },
  playback: {
    rate: 'อัตราการเล่น {rate}',
  },
  volume: {
    mutedValue: '{percent}, ปิดเสียง',
    muted: 'ปิดเสียงแล้ว',
    label: 'ระดับเสียง',
    value: 'ระดับเสียง {value}',
  },
  status: {
    captionsOn: 'เปิดคำอธิบายภาพ',
    captionsOff: 'ปิดคำอธิบายภาพ',
    paused: 'หยุดชั่วคราว',
    playing: 'กำลังเล่น',
    fullscreen: 'เต็มหน้าจอ',
    pip: 'ภาพซ้อนภาพ',
    exitPip: 'ออกจากภาพซ้อนภาพ',
  },
  errors: {
    aborted: 'คุณยกเลิกการเล่นสื่อแล้ว',
    network: 'ข้อผิดพลาดของเครือข่ายทำให้การดาวน์โหลดสื่อไม่สำเร็จเป็นบางส่วน',
    decode: 'การเล่นสื่อถูกยกเลิกเนื่องจากปัญหาเกี่ยวกับความเสียหาย หรือเนื่องจากสื่อใช้ฟีเจอร์ที่เบราว์เซอร์ของคุณไม่รองรับ',
    source: 'ไม่สามารถโหลดสื่อได้ โดยอาจเป็นเพราะเซิร์ฟเวอร์หรือเครือข่ายล้มเหลว หรือเพราะรูปแบบไม่ได้รับการรองรับ',
    encrypted: 'สื่อถูกเข้ารหัสลับแล้ว และเราไม่มีคีย์ที่จะถอดรหัสลับดังกล่าว',
    title: 'เกิดข้อผิดพลาด',
    unexpected: 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง',
  },
  common: {
    empty: '',
    ok: 'ปิด',
  },
  menu: {
    settings: 'การตั้งค่า',
    quality: 'คุณภาพ',
    audio: 'เสียง',
    default: 'ค่าเริ่มต้น',
    speed: 'ความเร็ว',
    captions: 'คำบรรยาย',
    playbackRate: 'อัตราการเล่น',
    back: 'กลับ',
    off: 'ปิด',
    auto: 'อัตโนมัติ',
    autoWithLabel: 'อัตโนมัติ ({label})',
    subtitles: 'คำบรรยาย',
  },
} as const satisfies Translations;
