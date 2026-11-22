// AI Coach client. Sends the logic-layer request to our Netlify function (/api/coach),
// which checks the Firebase sign-in, applies daily limits and calls the AI model.
import { isDemo } from './store.js';
import { suggestFor, findEx, fmtKg, setText, kindOf } from './program.js';

// Preset questions shown under "Ask your coach". Edit freely.
export const PRESET_QUESTIONS = [
  'Am I making progress?',
  'What should I focus on next session?',
  'Is my training balanced?',
  'How do I stay consistent this week?',
  'Why is one of my lifts stuck?',
];

export async function callCoach(store, mode, payload) {
  if (isDemo) return demoCoach(mode, payload);
  const token = await store.idToken();
  if (!token) { const e = new Error('unauthenticated'); e.code = 'unauthenticated'; throw e; }
  let res;
  try {
    res = await fetch('/api/coach', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ mode, ...payload, sessionsFull: undefined }),
    });
  } catch { const e = new Error('offline'); e.code = 'offline'; throw e; }
  let data = {};
  try { data = await res.json(); } catch {}
  if (!res.ok) { const e = new Error(data.error || `http_${res.status}`); e.code = data.error || `http_${res.status}`; e.scope = data.scope; e.usage = data.usage; e.detail = [data.provider && `${data.provider} ${data.model || ''}`.trim(), data.detail].filter(Boolean).join(' · ') || `HTTP ${res.status}`; throw e; }
  return data;
}

export const COACH_ERRORS = {
  limit: 'You\'ve used all of today\'s AI Coach requests. They reset at midnight.',
  'limit-global': 'AI Coach is very busy today and has paused for everyone. It\'ll be back tomorrow.',
  'not-configured': 'AI Coach isn\'t switched on for this app yet.',
  offline: 'You\'re offline. Try again when you\'re back online.',
  unauthenticated: 'Your sign-in has expired. Log out from Profile and sign in again.',
  'bad-output': 'AI Coach sent back something unreadable. Try again.',
  'ai-error': 'AI Coach couldn\'t reply just now. Try again in a minute.',
  'ai-busy': 'The AI service is very busy right now. Try again in a minute or two. This didn\'t use up any of your requests.',
  'server-error': 'AI Coach hit a problem on our side. Try again in a minute.',
};

/* ---------- demo mode: a rule-based stand-in so the screens can be tried ---------- */
function demoCoach(mode, p) {
  const usage = { used: 1, limit: 10 };
  if (mode === 'ask') {
    return Promise.resolve({ result: { answer: `Demo answer to "${p.question}". With AI Coach switched on, this is where your coach replies using your log and goals.` }, usage });
  }
  const next = p.plan.workouts.find((w) => w.id === p.nextWorkoutHint) || p.plan.workouts[0];
  const last = p.sessions[0];
  const recs = next.exercises.map((n) => {
    const sg = suggestFor(n, p.sessionsFull || [], p.today);
    return { exercise: n, sets: sg.sets, note: sg.note };
  });
  const lastText = last ? last.exercises.map((e) => `${findEx(e.name)?.name || e.name} ${e.sets.map((x) => setText(x, kindOf(e.name, e.sets))).join(', ')}`).slice(0, 2).join('; ') : '';
  return new Promise((r) => setTimeout(() => r({
    usage,
    result: {
      summary: {
        headline: last ? 'Solid session. Keep the streak going.' : 'Your plan is ready. Start light.',
        recent: last ? `Demo summary of your ${last.date} workout: ${lastText}.` : `You'll train ${p.plan.workouts.length} workouts in rotation. The first goal is simply to show up.`,
        comparison: last ? 'Demo comparison with your previous similar workout.' : '',
        next: `Next up: ${next.name}. Targets are below.`,
      },
      nudge: 'Pick your next training day now and put it in your calendar.',
      nextWorkout: next.id,
      recommendations: recs,
      memory: ['Demo note: prefers short, clear targets.'],
    },
  }), 600));
}

export function recText(kind, s) {
  if (kind === 'time') return `${s.secs}s`;
  if (kind === 'bodyweight') return `${s.reps} reps`;
  return `${fmtKg(s.kg)} kg × ${s.reps}`;
}

// "22.5 kg × 10 · 3 sets" when every set is the same, otherwise each set listed.
export function recSummary(kind, sets) {
  if (!sets || !sets.length) return '';
  const same = sets.every((s) => recText(kind, s) === recText(kind, sets[0]));
  return same ? `${recText(kind, sets[0])} · ${sets.length} set${sets.length === 1 ? '' : 's'}` : sets.map((s) => recText(kind, s)).join(' · ');
}
