/**
 * Applies human-reviewed copy aligned with V10 key semantics (not legacy Video.js strings).
 *
 * Usage: node --import tsx packages/core/scripts/apply-locale-review.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BUILT_IN_LOCALES } from '../src/core/i18n/built-in-locales.ts';
import type { TranslationParams } from '../src/core/i18n/types.ts';

type LocaleOverrides = Partial<Record<keyof TranslationParams, string>>;

/** Reviewed overrides per locale — only keys that differ from sensible V10 UI copy. */
const OVERRIDES: Record<string, LocaleOverrides> = {
  ar: {
    exitFullscreen: 'الخروج من وضع ملء الشاشة',
    enableCaptions: 'تفعيل التسميات التوضيحية',
    disableCaptions: 'إيقاف التسميات التوضيحية',
    playingLive: 'بث مباشر',
    seekToLiveEdge: 'الانتقال إلى البث المباشر',
  },
  az: {
    enableCaptions: 'Altyazıları aktiv et',
    disableCaptions: 'Altyazıları söndür',
    playingLive: 'Canlı yayımda',
    seekToLiveEdge: 'Canlı yayıma keç',
  },
  bg: {
    enableCaptions: 'Включи субтитри',
    disableCaptions: 'Изключи субтитри',
    playingLive: 'На живо',
    seekToLiveEdge: 'Към живото предаване',
  },
  bn: {
    playingLive: 'লাইভ চলছে',
    seekToLiveEdge: 'লাইভে যান',
  },
  bs: {
    exitFullscreen: 'Izađi iz cijelog ekrana',
    enableCaptions: 'Uključi titlove',
    disableCaptions: 'Isključi titlove',
    playingLive: 'Reprodukcija uživo',
    seekToLiveEdge: 'Idi na live',
  },
  ca: {
    enableCaptions: 'Activa subtítols',
    disableCaptions: 'Desactiva subtítols',
    playingLive: 'Reproducció en directe',
    seekToLiveEdge: 'Anar al directe',
  },
  cs: {
    exitFullscreen: 'Ukončit režim celé obrazovky',
    enableCaptions: 'Zapnout titulky',
    disableCaptions: 'Vypnout titulky',
    playingLive: 'Přehrává se živě',
    seekToLiveEdge: 'Přejít na živé vysílání',
  },
  cy: {
    enableCaptions: 'Galluogi capsiynau',
    disableCaptions: 'Analluogi capsiynau',
    playingLive: 'Yn chwarae’n fyw',
    seekToLiveEdge: 'Mynd i’r ymyl byw',
  },
  da: {
    enableCaptions: 'Aktivér undertekster',
    disableCaptions: 'Deaktiver undertekster',
    playingLive: 'Afspiller live',
    seekToLiveEdge: 'Gå til live',
  },
  de: {
    enableCaptions: 'Untertitel einschalten',
    disableCaptions: 'Untertitel ausschalten',
    playingLive: 'Wird live wiedergegeben',
    seekToLiveEdge: 'Zum Live-Rand springen',
  },
  el: {
    enableCaptions: 'Ενεργοποίηση υποτίτλων',
    disableCaptions: 'Απενεργοποίηση υποτίτλων',
    playingLive: 'Αναπαραγωγή ζωντανά',
    seekToLiveEdge: 'Μετάβαση στο ζωντανό',
  },
  es: {
    exitFullscreen: 'Salir de pantalla completa',
    enableCaptions: 'Activar subtítulos',
    disableCaptions: 'Desactivar subtítulos',
    playingLive: 'Reproduciendo en directo',
    seekToLiveEdge: 'Ir al directo',
  },
  et: {
    enableCaptions: 'Lülita subtiitrid sisse',
    disableCaptions: 'Lülita subtiitrid välja',
    playingLive: 'Mängib reaalajas',
    seekToLiveEdge: 'Mine otseülekande äärele',
  },
  eu: {
    enableCaptions: 'Aktibatu azpitituluak',
    disableCaptions: 'Desaktibatu azpitituluak',
    playingLive: 'Zuzenean erreproduzitzen',
    seekToLiveEdge: 'Zuzeneko ertzeraino joan',
  },
  fa: {
    enableCaptions: 'فعال‌سازی زیرنویس',
    disableCaptions: 'غیرفعال‌سازی زیرنویس',
    playingLive: 'پخش زنده',
    seekToLiveEdge: 'رفتن به پخش زنده',
  },
  fi: {
    enableCaptions: 'Ota tekstitykset käyttöön',
    disableCaptions: 'Poista tekstitykset käytöstä',
    playingLive: 'Toistetaan livenä',
    seekToLiveEdge: 'Siirry liveen',
  },
  fr: {
    exitFullscreen: 'Quitter le plein écran',
    enableCaptions: 'Activer les sous-titres',
    disableCaptions: 'Désactiver les sous-titres',
    playingLive: 'Lecture en direct',
    seekToLiveEdge: 'Aller au direct',
    seek: 'Barre de lecture',
  },
  gd: {
    enableCaptions: 'Cuir capsaidean air',
    disableCaptions: 'Toir capsaidean dheth',
    playingLive: 'A’ cluich beò',
    seekToLiveEdge: 'Tèarmann gu beò',
  },
  gl: {
    exitFullscreen: 'Saír da pantalla completa',
    enableCaptions: 'Activar subtítulos',
    disableCaptions: 'Desactivar subtítulos',
    playingLive: 'Reproducindo en directo',
    seekToLiveEdge: 'Ir ao directo',
  },
  he: {
    enableCaptions: 'הפעל כתוביות',
    disableCaptions: 'כבה כתוביות',
    playingLive: 'משדר חי',
    seekToLiveEdge: 'עבור לשידור חי',
  },
  hi: {
    enableCaptions: 'कैप्शन चालू करें',
    disableCaptions: 'कैप्शन बंद करें',
    playingLive: 'लाइव चल रहा है',
    seekToLiveEdge: 'लाइव पर जाएँ',
  },
  hr: {
    exitFullscreen: 'Izađi iz cijelog zaslona',
    enableCaptions: 'Uključi titlove',
    disableCaptions: 'Isključi titlove',
    playingLive: 'Reprodukcija uživo',
    seekToLiveEdge: 'Prijeđi na live',
  },
  hu: {
    exitFullscreen: 'Kilépés a teljes képernyős módból',
    enableCaptions: 'Feliratok bekapcsolása',
    disableCaptions: 'Feliratok kikapcsolása',
    playingLive: 'Élő adás',
    seekToLiveEdge: 'Ugrás az élő adáshoz',
  },
  it: {
    enableCaptions: 'Attiva sottotitoli',
    disableCaptions: 'Disattiva sottotitoli',
    playingLive: 'Riproduzione in diretta',
    seekToLiveEdge: 'Vai al live',
  },
  ja: {
    exitFullscreen: '全画面表示を終了',
    enableCaptions: '字幕を表示',
    disableCaptions: '字幕を非表示',
    playingLive: 'ライブ再生中',
    seekToLiveEdge: 'ライブ位置へ移動',
  },
  ko: {
    enableCaptions: '자막 켜기',
    disableCaptions: '자막 끄기',
    playingLive: '라이브 재생 중',
    seekToLiveEdge: '라이브 지점으로 이동',
  },
  lv: {
    enableCaptions: 'Ieslēgt parakstus',
    disableCaptions: 'Izslēgt parakstus',
    playingLive: 'Tiešraide',
    seekToLiveEdge: 'Pāriet uz tiešraidi',
  },
  mr: {
    playingLive: 'थेट प्रसारण सुरू आहे',
    seekToLiveEdge: 'थेट प्रसारणाकडे जा',
  },
  nb: {
    enableCaptions: 'Slå på teksting',
    disableCaptions: 'Slå av teksting',
    playingLive: 'Spiller live',
    seekToLiveEdge: 'Gå til live',
  },
  ne: {
    playingLive: 'लाइभ चलिरहेको छ',
    seekToLiveEdge: 'लाइभमा जानुहोस्',
  },
  nl: {
    exitFullscreen: 'Volledig scherm sluiten',
    enableCaptions: 'Ondertiteling inschakelen',
    disableCaptions: 'Ondertiteling uitschakelen',
    playingLive: 'Speelt live',
    seekToLiveEdge: 'Ga naar live',
  },
  nn: {
    enableCaptions: 'Slå på teksting',
    disableCaptions: 'Slå av teksting',
    playingLive: 'Spelar live',
    seekToLiveEdge: 'Hopp til live',
  },
  oc: {
    exitFullscreen: 'Sortir del ecran complèt',
    enableCaptions: 'Activar los subtítols',
    disableCaptions: 'Desactivar los subtítols',
    playingLive: 'Lectura dirècta',
    seekToLiveEdge: 'Anar al dirècte',
  },
  pl: {
    exitFullscreen: 'Wyjdź z trybu pełnoekranowego',
    enableCaptions: 'Włącz napisy',
    disableCaptions: 'Wyłącz napisy',
    playingLive: 'Odtwarzanie na żywo',
    seekToLiveEdge: 'Przejdź na transmisję na żywo',
  },
  'pt-BR': {
    exitFullscreen: 'Sair da tela cheia',
    enableCaptions: 'Ativar legendas',
    disableCaptions: 'Desativar legendas',
    playingLive: 'Reproduzindo ao vivo',
    seekToLiveEdge: 'Ir para o ao vivo',
  },
  'pt-PT': {
    enableCaptions: 'Ativar legendas',
    disableCaptions: 'Desativar legendas',
    playingLive: 'A reproduzir em direto',
    seekToLiveEdge: 'Ir para o em direto',
  },
  ro: {
    enableCaptions: 'Activează subtitrările',
    disableCaptions: 'Dezactivează subtitrările',
    playingLive: 'Redare în direct',
    seekToLiveEdge: 'Salt la direct',
  },
  ru: {
    exitFullscreen: 'Выйти из полноэкранного режима',
    enableCaptions: 'Включить субтитры',
    disableCaptions: 'Отключить субтитры',
    playingLive: 'Прямой эфир',
    seekToLiveEdge: 'Перейти к прямому эфиру',
  },
  sk: {
    enableCaptions: 'Zapnúť titulky',
    disableCaptions: 'Vypnúť titulky',
    playingLive: 'Prehráva sa naživo',
    seekToLiveEdge: 'Prejsť na živé vysielanie',
  },
  sl: {
    enableCaptions: 'Vklopi podnapise',
    disableCaptions: 'Izklopi podnapise',
    playingLive: 'Predvajanje v živo',
    seekToLiveEdge: 'Skoči na live',
  },
  sr: {
    enableCaptions: 'Uključi titlove',
    disableCaptions: 'Isključi titlove',
    playingLive: 'Reprodukcija uživo',
    seekToLiveEdge: 'Idi na live',
  },
  sv: {
    enableCaptions: 'Aktivera textning',
    disableCaptions: 'Inaktivera textning',
    playingLive: 'Spelar live',
    seekToLiveEdge: 'Gå till live',
  },
  te: {
    playingLive: 'లైవ్‌లో ప్లే అవుతోంది',
    seekToLiveEdge: 'లైవ్‌కు వెళ్లండి',
  },
  th: {
    enableCaptions: 'เปิดคำบรรยาย',
    disableCaptions: 'ปิดคำบรรยาย',
    playingLive: 'กำลังถ่ายทอดสด',
    seekToLiveEdge: 'ไปยังจุดถ่ายทอดสด',
  },
  tr: {
    enableCaptions: 'Altyazıları aç',
    disableCaptions: 'Altyazıları kapat',
    playingLive: 'Canlı oynatılıyor',
    seekToLiveEdge: 'Canlıya git',
  },
  uk: {
    enableCaptions: 'Увімкнути субтитри',
    disableCaptions: 'Вимкнути субтитри',
    playingLive: 'Прямий ефір',
    seekToLiveEdge: 'Перейти до прямого ефіру',
  },
  vi: {
    enableCaptions: 'Bật phụ đề',
    playingLive: 'Đang phát trực tiếp',
    seekToLiveEdge: 'Tua tới trực tiếp',
  },
  'zh-CN': {
    enableCaptions: '开启字幕',
    disableCaptions: '关闭字幕',
    playingLive: '正在直播',
    seekToLiveEdge: '跳转到直播',
  },
  'zh-TW': {
    enableCaptions: '開啟字幕',
    disableCaptions: '關閉字幕',
    playingLive: '正在直播',
    seekToLiveEdge: '跳轉至直播',
  },
};

const localesDir = resolve(dirname(fileURLToPath(import.meta.url)), '../src/core/i18n/locales');

function patchKey(source: string, key: keyof TranslationParams, value: string): string {
  const escaped = value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const pattern = new RegExp(`^  ${key}: '(?:\\\\'|[^'])*',`, 'm');
  if (!pattern.test(source)) {
    throw new Error(`Missing key ${key} in locale file`);
  }
  return source.replace(pattern, `  ${key}: '${escaped}',`);
}

let updated = 0;
for (const tag of BUILT_IN_LOCALES) {
  const overrides = OVERRIDES[tag];
  if (!overrides) continue;

  const path = resolve(localesDir, `${tag}.ts`);
  let source = readFileSync(path, 'utf8');
  let changed = false;

  for (const [key, value] of Object.entries(overrides) as [keyof TranslationParams, string][]) {
    const next = patchKey(source, key, value);
    if (next !== source) {
      source = next;
      changed = true;
    }
  }

  if (changed) {
    writeFileSync(path, source);
    updated++;
  }
}

console.log(`[apply-locale-review] Updated ${updated} locale files`);
