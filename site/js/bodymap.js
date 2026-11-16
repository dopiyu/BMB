// Front and back body figures. Each muscle shape carries data-m so taps select it.
import { MUSCLES } from './program.js';

const SIL = [
  ['circle', { cx: 180, cy: 36, r: 20 }],
  ['rect', { x: 171, y: 54, width: 18, height: 14, rx: 4 }],
  ['rect', { x: 140, y: 68, width: 80, height: 140, rx: 28 }],
  ['rect', { x: 146, y: 194, width: 68, height: 42, rx: 16 }],
  ['rect', { x: 108, y: 78, width: 26, height: 84, rx: 13 }],
  ['rect', { x: 226, y: 78, width: 26, height: 84, rx: 13 }],
  ['rect', { x: 102, y: 158, width: 22, height: 76, rx: 11 }],
  ['rect', { x: 236, y: 158, width: 22, height: 76, rx: 11 }],
  ['circle', { cx: 113, cy: 244, r: 10 }],
  ['circle', { cx: 247, cy: 244, r: 10 }],
  ['rect', { x: 148, y: 224, width: 31, height: 104, rx: 15 }],
  ['rect', { x: 181, y: 224, width: 31, height: 104, rx: 15 }],
  ['rect', { x: 152, y: 326, width: 24, height: 84, rx: 12 }],
  ['rect', { x: 184, y: 326, width: 24, height: 84, rx: 12 }],
  ['ellipse', { cx: 164, cy: 414, rx: 15, ry: 6 }],
  ['ellipse', { cx: 196, cy: 414, rx: 15, ry: 6 }],
];

const SHAPES = {
  front: [
    ['shoulders', 'ellipse', { cx: 127, cy: 88, rx: 16, ry: 14 }],
    ['shoulders', 'ellipse', { cx: 233, cy: 88, rx: 16, ry: 14 }],
    ['chest', 'ellipse', { cx: 162, cy: 104, rx: 19, ry: 15 }],
    ['chest', 'ellipse', { cx: 198, cy: 104, rx: 19, ry: 15 }],
    ['biceps', 'ellipse', { cx: 121, cy: 126, rx: 10, ry: 22 }],
    ['biceps', 'ellipse', { cx: 239, cy: 126, rx: 10, ry: 22 }],
    ['forearms', 'ellipse', { cx: 113, cy: 194, rx: 9, ry: 28 }],
    ['forearms', 'ellipse', { cx: 247, cy: 194, rx: 9, ry: 28 }],
    ['obliques', 'ellipse', { cx: 152, cy: 162, rx: 8, ry: 26 }],
    ['obliques', 'ellipse', { cx: 208, cy: 162, rx: 8, ry: 26 }],
    ['abs', 'rect', { x: 167, y: 124, width: 26, height: 70, rx: 9 }],
    ['quads', 'ellipse', { cx: 163, cy: 274, rx: 14, ry: 44 }],
    ['quads', 'ellipse', { cx: 197, cy: 274, rx: 14, ry: 44 }],
  ],
  back: [
    ['mid-back', 'rect', { x: 169, y: 98, width: 22, height: 58, rx: 6 }],
    ['traps', 'path', { d: 'M180 60 L208 82 L180 112 L152 82 Z' }],
    ['rear-delts', 'ellipse', { cx: 127, cy: 90, rx: 15, ry: 13 }],
    ['rear-delts', 'ellipse', { cx: 233, cy: 90, rx: 15, ry: 13 }],
    ['lats', 'path', { d: 'M146 100 Q138 142 160 178 L174 170 L166 110 Z' }],
    ['lats', 'path', { d: 'M214 100 Q222 142 200 178 L186 170 L194 110 Z' }],
    ['triceps', 'ellipse', { cx: 121, cy: 128, rx: 10, ry: 22 }],
    ['triceps', 'ellipse', { cx: 239, cy: 128, rx: 10, ry: 22 }],
    ['forearms', 'ellipse', { cx: 113, cy: 194, rx: 9, ry: 28 }],
    ['forearms', 'ellipse', { cx: 247, cy: 194, rx: 9, ry: 28 }],
    ['lower-back', 'rect', { x: 166, y: 166, width: 28, height: 32, rx: 8 }],
    ['glutes', 'ellipse', { cx: 164, cy: 222, rx: 17, ry: 18 }],
    ['glutes', 'ellipse', { cx: 196, cy: 222, rx: 17, ry: 18 }],
    ['hamstrings', 'ellipse', { cx: 164, cy: 282, rx: 13, ry: 38 }],
    ['hamstrings', 'ellipse', { cx: 196, cy: 282, rx: 13, ry: 38 }],
    ['calves', 'ellipse', { cx: 164, cy: 360, rx: 11, ry: 28 }],
    ['calves', 'ellipse', { cx: 196, cy: 360, rx: 11, ry: 28 }],
  ],
};

// [muscle, side, labelY, targetX, targetY]
const LABELS = {
  front: [
    ['shoulders', 'L', 88, 112, 88],
    ['biceps', 'L', 126, 112, 126],
    ['forearms', 'L', 194, 105, 194],
    ['quads', 'L', 274, 150, 274],
    ['chest', 'R', 104, 216, 104],
    ['abs', 'R', 146, 193, 146],
    ['obliques', 'R', 178, 215, 178],
  ],
  back: [
    ['rear-delts', 'L', 90, 113, 90],
    ['triceps', 'L', 128, 112, 128],
    ['lower-back', 'L', 182, 166, 182],
    ['hamstrings', 'L', 282, 152, 282],
    ['calves', 'L', 360, 154, 360],
    ['traps', 'R', 66, 190, 72],
    ['mid-back', 'R', 126, 191, 126],
    ['lats', 'R', 152, 218, 152],
    ['glutes', 'R', 222, 212, 222],
  ],
};

const attrs = (o) => Object.entries(o).map(([k, v]) => `${k}="${v}"`).join(' ');
const fmt = (v) => String(Math.round(v * 10) / 10);

export function bodySVG(view, levels, values, sel) {
  const sil = SIL.map(([t, a]) => `<${t} class="sil" ${attrs(a)}/>`).join('');
  const shapes = SHAPES[view].map(([m, t, a]) =>
    `<${t} class="mus lv${levels[m] || 0}${sel === m ? ' sel' : ''}" data-m="${m}" ${attrs(a)}><title>${MUSCLES[m].name}</title></${t}>`).join('');
  const labels = LABELS[view].map(([m, side, y, tx, ty]) => {
    const v = values[m] || 0;
    const left = side === 'L';
    const text = `${MUSCLES[m].name} · ${fmt(v)}`;
    const x = left ? 6 : 354;
    const lx = left ? 92 : 268;
    return `<g class="lab${v ? '' : ' zero'}${sel === m ? ' sel' : ''}" data-m="${m}">
      <line x1="${lx}" y1="${y}" x2="${tx}" y2="${ty}"/>
      <circle cx="${tx}" cy="${ty}" r="2"/>
      <text x="${x}" y="${y + 4}" text-anchor="${left ? 'start' : 'end'}">${text}</text></g>`;
  }).join('');
  return `<svg class="body" viewBox="0 0 360 428" role="img" aria-label="${view === 'front' ? 'Front' : 'Back'} of the body, muscles shaded by sets trained">${sil}${shapes}${labels}</svg>`;
}
