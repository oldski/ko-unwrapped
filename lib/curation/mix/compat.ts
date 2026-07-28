import type { MixInfo } from './types';

export interface MixCompat {
  bpmDelta: number | null; // % change vs. best of straight/double/half time
  keyRelation: 'same' | 'adjacent' | 'energy-boost' | 'clash' | null;
  score: number; // 0-1 blended mixability; 0.5 when no data at all
}

const KEY_SCORE: Record<NonNullable<MixCompat['keyRelation']>, number> = {
  same: 1,
  adjacent: 0.9,
  'energy-boost': 0.75,
  clash: 0.2,
};

function parseCamelot(code: string): { num: number; letter: 'A' | 'B' } | null {
  const m = code.match(/^([1-9]|1[0-2])([AB])$/);
  return m ? { num: Number(m[1]), letter: m[2] as 'A' | 'B' } : null;
}

export function harmonicCompat(a: MixInfo, b: MixInfo): MixCompat {
  let bpmDelta: number | null = null;
  if (a.bpm && b.bpm) {
    const ratios = [b.bpm / a.bpm, (b.bpm * 2) / a.bpm, b.bpm / (a.bpm * 2)];
    const best = ratios.reduce((r, x) => (Math.abs(x - 1) < Math.abs(r - 1) ? x : r));
    bpmDelta = (best - 1) * 100;
  }

  let keyRelation: MixCompat['keyRelation'] = null;
  const ka = a.camelotKey ? parseCamelot(a.camelotKey) : null;
  const kb = b.camelotKey ? parseCamelot(b.camelotKey) : null;
  if (ka && kb) {
    const dist = Math.min(Math.abs(ka.num - kb.num), 12 - Math.abs(ka.num - kb.num));
    if (ka.num === kb.num && ka.letter === kb.letter) keyRelation = 'same';
    else if (ka.letter === kb.letter && dist === 1) keyRelation = 'adjacent';
    else if (ka.num === kb.num) keyRelation = 'energy-boost';
    else keyRelation = 'clash';
  }

  const parts: number[] = [];
  if (bpmDelta !== null) parts.push(Math.max(0, Math.min(1, 1 - Math.abs(bpmDelta) / 12)));
  if (keyRelation !== null) parts.push(KEY_SCORE[keyRelation]);
  const score = parts.length ? parts.reduce((s, x) => s + x, 0) / parts.length : 0.5;

  return { bpmDelta, keyRelation, score };
}
