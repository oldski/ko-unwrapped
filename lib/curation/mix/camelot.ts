// Musical key -> Camelot wheel code. Minor keys land on the A wheel,
// majors on B. Pure lookup, shared by enrichment parsing and (via
// harmonicCompat) both sequencers and the UI.

const NOTE_TO_PITCH: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};

// pitch class -> Camelot number, per mode
const MAJOR_NUM: Record<number, number> = { 0: 8, 1: 3, 2: 10, 3: 5, 4: 12, 5: 7, 6: 2, 7: 9, 8: 4, 9: 11, 10: 6, 11: 1 };
const MINOR_NUM: Record<number, number> = { 0: 5, 1: 12, 2: 7, 3: 2, 4: 9, 5: 4, 6: 11, 7: 6, 8: 1, 9: 8, 10: 3, 11: 10 };

export function toCamelot(rawKey: string): string | null {
  if (!rawKey) return null;
  let s = rawKey.trim().replace(/♯/g, '#').replace(/♭/g, 'b');

  let minor = false;
  const modeMatch = s.match(/\s*(m|min|minor)$/i);
  if (modeMatch) {
    minor = true;
    s = s.slice(0, -modeMatch[0].length).trim();
  } else if (/\s*(maj|major)$/i.test(s)) {
    s = s.replace(/\s*(maj|major)$/i, '').trim();
  }

  const note = s.length >= 1 ? s[0].toUpperCase() + s.slice(1, 2).replace(/B$/, 'b') : '';
  const pitch = NOTE_TO_PITCH[note];
  if (pitch === undefined) return null;

  const num = minor ? MINOR_NUM[pitch] : MAJOR_NUM[pitch];
  return `${num}${minor ? 'A' : 'B'}`;
}
