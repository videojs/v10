import type { Translations } from '../params';

export default {
  buttons: {
    play: 'প্লে করুন',
    pause: 'বিরাম',
    replay: 'রিপ্লে করুন',
    mute: 'মিউট',
    unmute: 'আনমিউট',
  },
  seek: {
    forward: '{seconds} সেকেন্ড এগিয়ে যান',
    backward: '{seconds} সেকেন্ড পিছিয়ে যান',
  },
  fullscreen: {
    enter: 'পূর্ণ স্ক্রীন',
    exit: 'পূর্ণ স্ক্রীন থেকে বেরিয়ে আসুন',
  },
  captions: {
    enable: 'ক্যাপশন',
    disable: 'ক্যাপশন বন্ধ করুন',
  },
  pip: {
    enter: 'পিকচার-ইন-পিকচার',
    exit: 'পিকচার-ইন-পিকচার থেকে প্রস্থান করুন',
  },
  live: {
    playing: 'লাইভ চলছে',
    seekToEdge: 'লাইভে যান',
    badge: 'লাইভ',
  },
  cast: {
    start: 'কাস্টিং শুরু করুন',
    stop: 'কাস্টিং বন্ধ করুন',
    connecting: 'সংযুক্ত হচ্ছে',
  },
  airplay: {
    start: 'AirPlay শুরু করুন',
    stop: 'AirPlay বন্ধ করুন',
  },
  slider: {
    seek: 'অনুসন্ধান',
  },
  time: {
    current: 'বর্তমান সময়',
    duration: 'ব্যাপ্তিকাল',
    remaining: 'অবশিষ্ট সময়',
    remainingSuffix: 'বাকি {duration}',
    showElapsed: '{duration}. অতিবাহিত সময় দেখান.',
    showDuration: '{duration}. সময়কাল দেখান.',
    showRemaining: '{duration}. বাকি সময় দেখান.',
    position: '{duration} এর মধ্যে {current}',
  },
  playback: {
    rate: 'প্লেব্যাক রেট {rate}',
  },
  volume: {
    mutedValue: '{percent}, নিঃশব্দ',
    muted: 'নিঃশব্দ',
    label: 'ভলিউম',
    value: 'ভলিউম {value}',
  },
  status: {
    captionsOn: 'ক্যাপশন চালু',
    captionsOff: 'ক্যাপশন বন্ধ',
    paused: 'বিরাম',
    playing: 'চলছে',
    fullscreen: 'পূর্ণ স্ক্রীন',
    pip: 'পিকচার ইন পিকচার',
    exitPip: 'পিকচার ইন পিকচার থেকে বেরিয়ে আসুন',
  },
  errors: {
    aborted: 'আপনি মিডিয়া প্লেব্যাক বাতিল করেছেন',
    network: 'একটি নেটওয়ার্ক ত্রুটির কারণে মিডিয়া ডাউনলোড আংশিকভাবে ব্যর্থ হয়েছে৷',
    decode: 'মিডিয়া প্লেব্যাক একটি সমস্যার কারণে বা মিডিয়া ব্যবহার করা বৈশিষ্ট্যগুলি আপনার ব্রাউজার সমর্থন করে না বলে বাতিল করা হয়েছে৷',
    source: 'মিডিয়া লোড করা যায়নি, হয় সার্ভার বা নেটওয়ার্ক ব্যর্থ হওয়ার কারণে বা ফর্ম্যাটটি সমর্থিত নয়।',
    encrypted: 'মিডিয়া এনক্রিপ্ট করা হয়েছে এবং এটি ডিক্রিপ্ট করার সমাধান আমাদের কাছে নেই।',
    title: 'কিছু একটা ভুল হয়েছে।',
    unexpected: 'একটি ত্রুটি ঘটেছে। আবার চেষ্টা করুন।',
  },
  common: {
    empty: '',
    ok: 'বন্ধ করুন',
  },
  menu: {
    settings: 'সেটিংস',
    quality: 'গুণমান',
    audio: 'অডিও',
    default: 'ডিফল্ট',
    speed: 'গতি',
    captions: 'ক্যাপশন',
    playbackRate: 'প্লেব্যাক রেট',
    back: 'পিছনে',
    off: 'বন্ধ',
    auto: 'স্বয়ংক্রিয়',
    autoWithLabel: 'স্বয়ংক্রিয় ({label})',
    subtitles: 'সাবটাইটেল',
  },
} as const satisfies Translations;
