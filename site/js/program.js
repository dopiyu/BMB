// Exercise library, session templates, target suggestions and muscle coverage.

export const MUSCLES = {
  chest: { name: 'Chest', view: 'front' },
  shoulders: { name: 'Shoulders', view: 'front' },
  biceps: { name: 'Biceps', view: 'front' },
  forearms: { name: 'Forearms', view: 'front' },
  abs: { name: 'Abs', view: 'front' },
  obliques: { name: 'Obliques', view: 'front' },
  quads: { name: 'Quads', view: 'front' },
  traps: { name: 'Traps', view: 'back' },
  'rear-delts': { name: 'Rear shoulders', view: 'back' },
  lats: { name: 'Lats', view: 'back' },
  'mid-back': { name: 'Mid-back', view: 'back' },
  triceps: { name: 'Triceps', view: 'back' },
  'lower-back': { name: 'Lower back', view: 'back' },
  glutes: { name: 'Glutes', view: 'back' },
  hamstrings: { name: 'Hamstrings', view: 'back' },
  calves: { name: 'Calves', view: 'back' },
};

// kind: weight (kg × reps), bodyweight (reps), time (seconds)
// muscles: 2 = main target, 1 = helper
export const LIBRARY = [
  { name: 'Chest press', kind: 'weight', area: 'upper', step: 5, start: 20, muscles: { chest: 2, shoulders: 1, triceps: 1 } },
  { name: 'Seated cable row', kind: 'weight', area: 'upper', step: 5, start: 30, muscles: { 'mid-back': 2, lats: 1, 'rear-delts': 1, biceps: 1 } },
  { name: 'Shoulder press', kind: 'weight', area: 'upper', step: 2.5, start: 15, muscles: { shoulders: 2, triceps: 1, traps: 1 } },
  { name: 'Lat pulldown', kind: 'weight', area: 'upper', step: 5, start: 25, muscles: { lats: 2, biceps: 1, 'rear-delts': 1 } },
  { name: 'Bicep curls', kind: 'weight', area: 'upper', step: 2, start: 8, muscles: { biceps: 2, forearms: 1 } },
  { name: 'Tricep pushdown', kind: 'weight', area: 'upper', step: 2.5, start: 15, muscles: { triceps: 2 } },
  { name: 'Lateral raise', kind: 'weight', area: 'upper', step: 1, start: 4, muscles: { shoulders: 2, traps: 1 } },
  { name: 'Face pull', kind: 'weight', area: 'upper', step: 2.5, start: 10, muscles: { 'rear-delts': 2, 'mid-back': 1, traps: 1 } },
  { name: 'Pec fly', kind: 'weight', area: 'upper', step: 5, start: 20, muscles: { chest: 2, shoulders: 1 } },
  { name: 'Romanian deadlift', kind: 'weight', area: 'lower', step: 2, start: 8, muscles: { hamstrings: 2, glutes: 2, 'lower-back': 1 } },
  { name: 'Back extension (45°)', kind: 'bodyweight', area: 'lower', muscles: { 'lower-back': 2, glutes: 1, hamstrings: 1 } },
  { name: 'Angled leg press', kind: 'weight', area: 'lower', step: 10, start: 60, muscles: { quads: 2, glutes: 1 } },
  { name: 'Leg press', kind: 'weight', area: 'lower', step: 10, start: 60, muscles: { quads: 2, glutes: 1 } },
  { name: 'Leg extension', kind: 'weight', area: 'lower', step: 5, start: 25, muscles: { quads: 2 } },
  { name: 'Leg curl', kind: 'weight', area: 'lower', step: 5, start: 25, muscles: { hamstrings: 2 } },
  { name: 'Squats', kind: 'bodyweight', area: 'lower', muscles: { quads: 2, glutes: 2, 'lower-back': 1 } },
  { name: 'Hip thrust', kind: 'weight', area: 'lower', step: 10, start: 40, muscles: { glutes: 2, hamstrings: 1 } },
  { name: 'Calf raise', kind: 'weight', area: 'lower', step: 5, start: 30, muscles: { calves: 2 } },
  { name: 'Plank', kind: 'time', area: 'core', muscles: { abs: 2, obliques: 1, 'lower-back': 1 } },
  { name: 'Dead bug', kind: 'bodyweight', area: 'core', muscles: { abs: 2, obliques: 1 } },
];

export const TEMPLATES = {
  upper: ['Chest press', 'Seated cable row', 'Shoulder press', 'Lat pulldown', 'Bicep curls', 'Plank'],
  lower: ['Romanian deadlift', 'Angled leg press', 'Leg extension', 'Leg curl', 'Plank'],
};

export const TYPE_LABEL = { upper: 'Upper body', lower: 'Lower body', full: 'Full body' };

const ALIASES = {
  'plank (seconds)': 'plank', 'body weight plank': 'plank', 'bodyweight plank': 'plank',
  'bicep curl': 'bicep curls', 'biceps curl': 'bicep curls', 'biceps curls': 'bicep curls', 'dumbbell curl': 'bicep curls',
  'lat pull down': 'lat pulldown', 'lat pull-down': 'lat pulldown', 'lat pulldowns': 'lat pulldown',
  'seated row': 'seated cable row', 'cable row': 'seated cable row', 'seated rows': 'seated cable row',
  'romanian dead lift': 'romanian deadlift', 'rdl': 'romanian deadlift',
  'back extension': 'back extension (45°)', '45° back extension': 'back extension (45°)', 'hyperextension': 'back extension (45°)',
  'squat': 'squats', 'bodyweight squats': 'squats', 'body weight squats': 'squats',
  'leg extensions': 'leg extension', 'leg curls': 'leg curl', 'chest presses': 'chest press',
};

export const canon = (n) => {
  const k = String(n || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return ALIASES[k] || k;
};
export const findEx = (n) => LIBRARY.find((e) => e.name.toLowerCase() === canon(n)) || null;

function guessMuscles(name) {
  const n = canon(name);
  if (/calf|calves/.test(n)) return { calves: 2 };
  if (/plank|crunch|abs?\b|sit ?up|leg raise|twist|core|hollow/.test(n)) return { abs: 2, obliques: 1 };
  if (/leg curl|hamstring/.test(n)) return { hamstrings: 2 };
  if (/deadlift|good morning|extension \(|hyperext/.test(n)) return { hamstrings: 2, glutes: 1, 'lower-back': 1 };
  if (/leg press|squat|lunge|leg extension|step ?up/.test(n)) return { quads: 2, glutes: 1 };
  if (/glute|hip thrust|bridge/.test(n)) return { glutes: 2 };
  if (/rear delt|face pull|reverse fly/.test(n)) return { 'rear-delts': 2 };
  if (/shoulder|overhead|lateral|military|arnold/.test(n)) return { shoulders: 2, triceps: 1 };
  if (/shrug|trap/.test(n)) return { traps: 2 };
  if (/\brow/.test(n)) return { 'mid-back': 2, lats: 1, biceps: 1 };
  if (/pull ?down|pull ?up|chin ?up|\blats?\b/.test(n)) return { lats: 2, biceps: 1 };
  if (/tricep|push ?down|dips?|skull/.test(n)) return { triceps: 2 };
  if (/curl/.test(n)) return { biceps: 2, forearms: 1 };
  if (/chest|bench|push ?up|fly|pec/.test(n)) return { chest: 2, triceps: 1 };
  return {};
}

export const musclesOf = (name) => findEx(name)?.muscles || guessMuscles(name);

export function kindOf(name, sets) {
  const d = findEx(name);
  if (d) return d.kind;
  if (sets && sets.some((s) => s.secs != null)) return 'time';
  if (sets && sets.length && sets.every((s) => s.kg == null)) return 'bodyweight';
  return 'weight';
}

function areaOf(name) {
  const d = findEx(name);
  if (d) return d.area;
  const m = Object.keys(guessMuscles(name));
  if (!m.length) return 'other';
  if (m.some((x) => ['abs', 'obliques'].includes(x))) return 'core';
  return m.some((x) => ['quads', 'hamstrings', 'glutes', 'calves'].includes(x)) ? 'lower' : 'upper';
}

export function classify(session) {
  let up = 0, lo = 0;
  (session.exercises || []).forEach((e) => {
    const a = areaOf(e.name);
    if (a === 'upper') up++;
    if (a === 'lower') lo++;
  });
  if (up >= 2 && lo >= 2) return 'full';
  return lo > up ? 'lower' : 'upper';
}
export const typeOf = (s) => s.type || classify(s);

export function nextType(sessions) {
  const last = [...sessions].sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!last) return 'upper';
  const t = typeOf(last);
  return t === 'upper' ? 'lower' : 'upper';
}

export const fmtKg = (k) => (k == null ? '' : String(Math.round(k * 100) / 100));
export const secsOf = (s) => s.secs ?? s.reps ?? 0;

export function setText(s, kind) {
  if (kind === 'time') return `${secsOf(s)}s`;
  if (kind === 'bodyweight' || s.kg == null) return `BW × ${s.reps}`;
  return `${fmtKg(s.kg)} × ${s.reps}`;
}

export function volumeOf(session) {
  return (session.exercises || []).reduce((t, e) =>
    t + (e.sets || []).reduce((u, s) => u + (s.kg || 0) * (s.reps || 0), 0), 0);
}
export const setCount = (session) => (session.exercises || []).reduce((t, e) => t + (e.sets || []).length, 0);

export function historyOf(name, sessions, beforeDate) {
  const k = canon(name);
  return sessions
    .filter((s) => s.date < beforeDate)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((s) => ({ date: s.date, ex: (s.exercises || []).find((e) => canon(e.name) === k) }))
    .filter((x) => x.ex && x.ex.sets && x.ex.sets.length);
}

const REP_TARGET = 10;
const roundTo = (v, step) => Math.max(step, Math.round(v / step) * step);

// Returns { kind, last, note, sets:[...] } with one target per set.
export function suggestFor(name, sessions, date) {
  const def = findEx(name);
  const h = historyOf(name, sessions, date);
  const kind = def ? def.kind : kindOf(name, h[0]?.ex.sets);
  const three = (s) => [0, 1, 2].map(() => ({ ...s }));

  if (!h.length) {
    if (kind === 'time') return { kind, last: null, note: 'First time. Hold with a flat back.', sets: three({ secs: 20 }) };
    if (kind === 'bodyweight') return { kind, last: null, note: 'First time. Slow and controlled.', sets: three({ reps: 8 }) };
    return { kind, last: null, note: 'First time. Start light and learn the movement.', sets: three({ kg: def?.start ?? null, reps: REP_TARGET }) };
  }

  const last = h[0];
  const ls = last.ex.sets;

  if (kind === 'time') {
    const t = ls.map(secsOf);
    const max = Math.max(...t), min = Math.min(...t);
    if (min >= max) return { kind, last, note: 'Held every set last time. Add 5 seconds.', sets: three({ secs: max + 5 }) };
    return { kind, last, note: 'Hold your best time on every set.', sets: three({ secs: max }) };
  }

  if (kind === 'bodyweight') {
    const r = ls.map((s) => s.reps || 0);
    const max = Math.max(...r), min = Math.min(...r);
    if (min >= max) return { kind, last, note: 'Matched every set. Add 1 rep.', sets: three({ reps: Math.min(max + 1, 15) }) };
    return { kind, last, note: 'Match your best set on every set.', sets: three({ reps: max }) };
  }

  const step = def?.step ?? 2.5;
  const top = Math.max(...ls.map((s) => s.kg || 0));
  const atTop = ls.filter((s) => (s.kg || 0) === top);
  const allAtTop = atTop.length === ls.length;

  if (h.length >= 3) {
    const recent = h.slice(0, 3);
    const tops = recent.map((o) => Math.max(...o.ex.sets.map((s) => s.kg || 0)));
    const repsAtTop = recent.map((o) => o.ex.sets.filter((s) => (s.kg || 0) === top).reduce((t, s) => t + (s.reps || 0), 0));
    const sameWeight = tops.every((t) => t === top);
    const neverAll10 = recent.every((o) => !o.ex.sets.every((s) => (s.kg || 0) === top && s.reps >= REP_TARGET));
    if (sameWeight && neverAll10 && repsAtTop[0] <= repsAtTop[2]) {
      const kg = roundTo(top * 0.9, step);
      return { kind, last, note: `Stuck at ${fmtKg(top)} kg for 3 sessions. Drop to ${fmtKg(kg)} kg and build back up.`, sets: three({ kg, reps: REP_TARGET }), reset: true };
    }
  }

  if (allAtTop && ls.every((s) => s.reps >= REP_TARGET)) {
    return { kind, last, note: `10 reps on every set last time. Add ${fmtKg(step)} kg.`, sets: three({ kg: top + step, reps: 8 }), up: true };
  }
  if (!allAtTop && (atTop[atTop.length - 1]?.reps || 0) >= REP_TARGET) {
    return { kind, last, note: 'Top set hit 10. Now do every set at that weight.', sets: three({ kg: top, reps: REP_TARGET }) };
  }
  return { kind, last, note: 'Same weight. Aim for 10 reps on every set.', sets: three({ kg: top, reps: REP_TARGET }) };
}

// Weighted set count per muscle: main target = 1 per set, helper = 0.5 per set.
export function coverage(sessions) {
  const out = {};
  Object.keys(MUSCLES).forEach((m) => (out[m] = { v: 0, ex: new Set() }));
  sessions.forEach((s) => (s.exercises || []).forEach((e) => {
    const n = (e.sets || []).length;
    Object.entries(musclesOf(e.name)).forEach(([m, w]) => {
      if (!out[m]) return;
      out[m].v += n * (w === 2 ? 1 : 0.5);
      out[m].ex.add(findEx(e.name)?.name || e.name);
    });
  }));
  return out;
}
