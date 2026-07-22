import type { Translations } from '../params';

export default {
  buttons: {
    play: 'Aναπαραγωγή',
    pause: 'Παύση',
    replay: 'Επανάληψη',
    mute: 'Σίγαση',
    unmute: 'Kατάργηση σίγασης',
  },
  seek: {
    forward: 'Μεταβείτε μπροστά {seconds} δευτερόλεπτα',
    backward: 'Μεταβείτε πίσω {seconds} δευτερόλεπτα',
  },
  fullscreen: {
    enter: 'Πλήρης οθόνη',
    exit: 'Έξοδος από πλήρη οθόνη',
  },
  captions: {
    enable: 'Ενεργοποίηση υποτίτλων',
    disable: 'Απενεργοποίηση υποτίτλων',
  },
  pip: {
    enter: 'Εικόνα-μέσα-σε-Εικόνα',
    exit: 'Έξοδος από την Εικόνα-μέσα-σε-Εικόνα',
  },
  live: {
    playing: 'Αναπαραγωγή ζωντανά',
    seekToEdge: 'Μετάβαση στο ζωντανό',
    badge: 'Ζωντανά',
  },
  cast: {
    start: 'Έναρξη μετάδοσης',
    stop: 'Διακοπή μετάδοσης',
    connecting: 'Σύνδεση',
  },
  airplay: {
    start: 'Έναρξη AirPlay',
    stop: 'Διακοπή AirPlay',
  },
  slider: {
    seek: 'Μετακίνηση',
  },
  time: {
    current: 'Τρέχων χρόνος',
    duration: 'Συνολικός χρόνος',
    remaining: 'Υπολοιπόμενος χρόνος',
    remainingSuffix: 'Απομένουν {duration}',
    showElapsed: '{duration}. Εμφάνιση χρόνου που πέρασε.',
    showDuration: '{duration}. Εμφάνιση διάρκειας.',
    showRemaining: '{duration}. Εμφάνιση υπολειπόμενου χρόνου.',
    position: '{current} από {duration}',
  },
  playback: {
    rate: 'Ρυθμός αναπαραγωγής {rate}',
  },
  volume: {
    mutedValue: '{percent}, σε σίγαση',
    muted: 'Σε σίγαση',
    label: 'Ένταση',
    value: 'Ένταση {value}',
  },
  status: {
    captionsOn: 'Λεζάντες ενεργές',
    captionsOff: 'Λεζάντες ανενεργές',
    paused: 'Σε παύση',
    playing: 'Αναπαραγωγή',
    fullscreen: 'Πλήρης οθόνη',
    pip: 'Εικόνα μέσα σε εικόνα',
    exitPip: 'Έξοδος από εικόνα μέσα σε εικόνα',
  },
  errors: {
    aborted: 'Ακυρώσατε την αναπαραγωγή',
    network: 'Ένα σφάλμα δικτύου προκάλεσε την αποτυχία μεταφόρτωσης του αρχείου προς αναπαραγωγή.',
    decode:
      'Η αναπαραγωγή ακυρώθηκε είτε λόγω κατεστραμμένου αρχείου, είτε γιατί το αρχείο απαιτεί λειτουργίες που δεν υποστηρίζονται από το πρόγραμμα περιήγησης που χρησιμοποιείτε.',
    source:
      'Το αρχείο προς αναπαραγωγή δεν ήταν δυνατό να φορτωθεί είτε γιατί υπήρξε σφάλμα στον διακομιστή ή το δίκτυο, είτε γιατί ο τύπος του αρχείου δεν υποστηρίζεται.',
    encrypted:
      'Το αρχείο προς αναπαραγωγή είναι κρυπτογραφημένo και δεν υπάρχουν τα απαραίτητα κλειδιά αποκρυπτογράφησης.',
    title: 'Κάτι πήγε στραβά.',
    unexpected: 'Παρουσιάστηκε σφάλμα. Δοκιμάστε ξανά.',
  },
  common: {
    empty: '',
    ok: 'Κλείσιμο',
  },
  menu: {
    settings: 'Ρυθμίσεις',
    quality: 'Ποιότητα',
    audio: 'Ήχος',
    default: 'Προεπιλογή',
    speed: 'Ταχύτητα',
    captions: 'Λεζάντες',
    playbackRate: 'Ρυθμός αναπαραγωγής',
    back: 'Πίσω',
    off: 'Απενεργοποίηση',
    auto: 'Αυτόματα',
    autoWithLabel: 'Αυτόματα ({label})',
    subtitles: 'Υπότιτλοι',
  },
} as const satisfies Translations;
