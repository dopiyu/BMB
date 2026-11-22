import { createStore, isDemo } from './store.js';
import {
  LIBRARY, TYPE_LABEL, MUSCLES, DEFAULT_PLAN, findEx, canon, musclesOf, kindOf, typeOf, classify,
  coverage, volumeOf, setCount, setText, fmtKg, secsOf, historyOf, buildPlan, workoutMuscles, nextWorkoutId, clampRec,
} from './program.js';
import { bodySVG } from './bodymap.js';
import { QUESTIONS, ONBOARDING_VERSION, answerLabel } from './onboarding.js';
import { callCoach, COACH_ERRORS, PRESET_QUESTIONS, recSummary } from './coach.js';

/* ---------- helpers ---------- */
const app = document.getElementById('app');
const navEl = document.getElementById('nav');
const sheetEl = document.getElementById('sheet');
const toastEl = document.getElementById('toast');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const toStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => toStr(new Date());
const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return toStr(d); };
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const fShort = (s) => { const d = parse(s); return `${d.getDate()} ${MON[d.getMonth()]}`; };
const fLong = (s) => { const d = parse(s); return `${DAY[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`; };
const weekStart = (s) => { const d = parse(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return toStr(d); };
const num = (v) => { if (v === '' || v == null) return null; const n = Number(String(v).replace(',', '.')); return Number.isFinite(n) && n >= 0 ? n : null; };
const round1 = (v) => Math.round(v * 10) / 10;
const kgFmt = (v) => Math.round(v).toLocaleString('en-IN');
const kgShort = (v) => (v >= 10000 ? `${round1(v / 1000)}k` : kgFmt(v));

const ICON = {
  home: '<path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>',
  history: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  progress: '<circle cx="12" cy="5" r="2.2"/><path d="M7 9.5h10M12 9.5v5.5M12 15l-3 5.5M12 15l3 5.5M7 9.5l-1.5 5M17 9.5l1.5 5"/>',
  profile: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20.5c1.3-3.8 4.2-5.5 7.5-5.5s6.2 1.7 7.5 5.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  chev: '<path d="m9 6 6 6-6 6"/>',
  left: '<path d="m15 6-6 6 6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  dl: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14"/>',
  phone: '<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2"/>',
  ai: '<path d="M12 3.5 13.9 9l5.6 1.9-5.6 1.9L12 18.5l-1.9-5.7L4.5 10.9 10.1 9z"/><path d="M18.5 3.5v3M17 5h3"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
};
const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[n]}</svg>`;

function toast(msg, kind = 'ok') {
  toastEl.textContent = msg;
  toastEl.className = `toast show ${kind}`;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (toastEl.className = 'toast'), 2600);
}

/* ---------- theme ---------- */
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
const savedTheme = () => { try { const t = localStorage.getItem('bmb-theme'); return t === 'light' || t === 'dark' ? t : null; } catch { return null; } };
const isDark = () => (savedTheme() || (prefersDark.matches ? 'dark' : 'light')) === 'dark';
function applyTheme() {
  const t = savedTheme();
  if (t) document.documentElement.setAttribute('data-theme', t); else document.documentElement.removeAttribute('data-theme');
  document.getElementById('theme-color')?.setAttribute('content', isDark() ? '#0E1013' : '#F3F4F6');
}
function toggleTheme() {
  try { localStorage.setItem('bmb-theme', isDark() ? 'light' : 'dark'); } catch {}
  applyTheme(); render();
}
prefersDark.addEventListener?.('change', () => { applyTheme(); render(); });
const themeBtn = () => `<div class="topbar"><button type="button" class="theme-btn" data-act="theme" aria-label="Switch to ${isDark() ? 'light' : 'dark'} mode" title="Switch to ${isDark() ? 'light' : 'dark'} mode">${ic(isDark() ? 'sun' : 'moon')}</button></div>`;

/* ---------- install (PWA) ---------- */
let installPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; if (!S.user) render(); });
window.addEventListener('appinstalled', () => { installPrompt = null; toast('App installed. Open it from your home screen.'); render(); });
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/* ---------- 30-day sign-in ---------- */
const SESSION_DAYS = 30;
function sessionExpired(u) {
  if (!u || !u.lastSignIn) return false;
  const t = Date.parse(u.lastSignIn);
  return Number.isFinite(t) && Date.now() - t > SESSION_DAYS * 864e5;
}
async function enforceExpiry() {
  if (!sessionExpired(S.user)) return false;
  S.authNote = `For your security, you're signed out every ${SESSION_DAYS} days. Sign in with Google to carry on. Your workouts are safe.`;
  S.unsub?.();
  await store.signOut();
  return true;
}


/* ---------- state ---------- */
const store = createStore();
const ROUTES = ['home', 'history', 'coach', 'progress', 'profile'];
const NAV_LABEL = { home: 'Home', history: 'History', coach: 'AI Coach', progress: 'Progress', profile: 'Profile' };
const routeFromHash = () => { const h = location.hash.replace('#', ''); return ROUTES.includes(h) || h === 'onboarding' ? h : 'home'; };

const S = {
  user: null, authReady: false, authErr: '', authNote: '', signingIn: false, installOpen: false,
  sessions: [], loaded: false, unsub: null,
  profile: {}, profileLoaded: false, punsub: null,
  route: routeFromHash(),
  draft: null, saving: false, formErr: '', exErr: {},
  sheet: null,
  hist: { mode: 'week', anchor: today(), open: new Set(), confirm: null },
  prog: { filter: 'all', view: 'front', sel: null },
  ob: null,
  coachBusy: null, coachErr: '', coachOffConfirm: false,
};

const plan = () => (S.profile.plan?.workouts?.length ? S.profile.plan : DEFAULT_PLAN);
const coach = () => S.profile.coach || {};
const coachOn = () => !!coach().enabled;
const recFor = (name) => (coachOn() ? coach().recs?.[canon(name)] || null : null);
const isPartial = (s) => s.status === 'in-progress';
const label = (s) => s.workoutName || TYPE_LABEL[typeOf(s)] || 'Workout';
const needsOnboarding = () => S.profileLoaded && !S.profile.onboarding?.done;
const forcedOnboarding = () => needsOnboarding() && S.loaded && S.sessions.length === 0;
const FREESTYLE = { id: 'freestyle', name: 'Freestyle', exercises: [] };
const workoutById = (id) => (id === 'freestyle' ? FREESTYLE : plan().workouts.find((w) => w.id === id) || null);
const recommendedId = () => {
  const p = plan(); const c = coach();
  if (coachOn() && p.workouts.some((w) => w.id === c.nextWorkout)) return c.nextWorkout;
  return nextWorkoutId(p, S.sessions);
};

const draftKey = () => `bmb-draft2:${S.user?.uid}`;
const saveDraft = () => { try { localStorage.setItem(draftKey(), JSON.stringify(S.draft)); } catch {} };
const clearDraft = () => { try { localStorage.removeItem(draftKey()); } catch {} };

function newDraft(date = today()) {
  return { date, workoutId: null, workoutName: '', status: 'in-progress', editingId: null, forceEdit: false,
    exercises: [], cardio: [{ type: 'Brisk walk', km: null, min: null }], notes: '' };
}
const blankEx = (name, kind) => ({ name, kind: kind || findEx(name)?.kind || 'weight', sets: [{}, {}, {}], saved: false });
function pickWorkout(id) {
  const d = S.draft; const w = workoutById(id); if (!w) return;
  const saved = d.exercises.filter((e) => e.saved);
  const have = new Set(saved.map((e) => canon(e.name)));
  d.workoutId = w.id; d.workoutName = w.name;
  d.exercises = [...saved, ...w.exercises.filter((n) => !have.has(canon(n))).map((n) => blankEx(n))];
}
function draftFromSession(s) {
  return {
    date: s.date, workoutId: s.workoutId || (plan().workouts.some((w) => w.id === typeOf(s)) ? typeOf(s) : 'freestyle'),
    workoutName: label(s), status: isPartial(s) ? 'in-progress' : 'complete', editingId: s.id, forceEdit: true,
    exercises: (s.exercises || []).map((e) => ({ name: e.name, kind: kindOf(e.name, e.sets), sets: (e.sets || []).map((x) => ({ ...x })), saved: true })),
    cardio: (s.cardio || []).length ? s.cardio.map((c) => ({ ...c })) : [{ type: 'Brisk walk', km: null, min: null }],
    notes: s.notes || '',
  };
}
function loadDraft() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(draftKey()) || 'null'); } catch {}
  if (d && Array.isArray(d.exercises) && (d.editingId || d.date === today() || d.forceEdit)) return d;
  const open = S.sessions.find((s) => s.date === today() && isPartial(s));
  return open ? draftFromSession(open) : newDraft();
}
const hasData = (e) => e.sets.some((s) => s.kg != null || s.reps != null || s.secs != null);
const touched = (d) => d.forceEdit || !!d.workoutId || d.exercises.some(hasData)
  || d.cardio.some((c) => c.km != null || c.min != null) || (d.notes || '').trim();

const sorted = () => [...S.sessions].sort((a, b) => b.date.localeCompare(a.date));

/* ---------- render ---------- */
function render() {
  if (!S.authReady) { app.innerHTML = `<div class="splash"><div class="mark">${markSVG()}</div></div>`; navEl.hidden = true; return; }
  if (!S.user) { app.innerHTML = loginView(); navEl.hidden = true; sheetEl.innerHTML = ''; return; }
  if (S.loaded && S.profileLoaded && (forcedOnboarding() || S.route === 'onboarding')) {
    if (!S.ob) startOnboarding();
    navEl.hidden = true; sheetEl.innerHTML = ''; sheetEl.hidden = true;
    app.innerHTML = `<main class="page ob-page" id="page">${themeBtn()}${onboardingView()}</main>`;
    return;
  }
  navEl.hidden = false;
  renderNav();
  const view = { home: homeView, history: historyView, coach: coachView, progress: progressView, profile: profileView }[S.route] || homeView;
  app.innerHTML = `<main class="page" id="page">${themeBtn()}${view()}</main>`;
  renderSheet();
}

function renderNav() {
  const dot = coachOn() && S.sessions.some((s) => isPartial(s) && s.date < today());
  navEl.innerHTML = ROUTES.map((r) => `<a href="#${r}" class="nb${r === 'coach' ? ' center' : ''}${S.route === r ? ' on' : ''}" ${S.route === r ? 'aria-current="page"' : ''}>
    ${r === 'coach' ? `<span class="nb-orb">${ic('ai')}${dot ? '<i class="nb-dot" aria-label="Needs attention"></i>' : ''}</span>` : ic(r)}<span>${NAV_LABEL[r]}</span></a>`).join('');
}

const markSVG = () => `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="6" y="24" width="8" height="16" rx="2"/><rect x="14" y="18" width="8" height="28" rx="2"/><rect x="22" y="29" width="20" height="6" rx="2"/><rect x="42" y="18" width="8" height="28" rx="2"/><rect x="50" y="24" width="8" height="16" rx="2"/></svg>`;

function loginView() {
  const ios = isIOS();
  const iosSteps = `<div><h3>${ic('phone')} iPhone or iPad${ios ? ' <span class="tag-me">Your phone</span>' : ''}</h3>
    <ol><li>Open this page in <b>Safari</b>.</li><li>Tap the <b>Share</b> button (square with an arrow) at the bottom.</li><li>Scroll down and tap <b>Add to Home Screen</b>, then <b>Add</b>.</li></ol></div>`;
  const androidSteps = `<div><h3>${ic('phone')} Android${!ios ? ' <span class="tag-me">Your phone</span>' : ''}</h3>
    <ol><li>Open this page in <b>Chrome</b>.</li><li>Tap <b>⋮</b> at the top right.</li><li>Tap <b>Install app</b> (or <b>Add to Home screen</b>), then <b>Install</b>.</li></ol></div>`;
  const help = `<div class="install-help" id="install-help">
    ${installPrompt ? `<button type="button" class="btn primary block" data-act="installNow">${ic('dl')} Install now</button><p class="fine center">Or add it by hand:</p>` : ''}
    ${ios ? iosSteps + '<div class="sep"></div>' + androidSteps : androidSteps + '<div class="sep"></div>' + iosSteps}
    <p class="fine">It opens full screen from your home screen, like any other app. Nothing to download from an app store.</p>
  </div>`;
  return `<section class="login">
    ${themeBtn()}
    <div class="login-top">
      <div class="mark big">${markSVG()}</div>
      <h1 class="brand">Build My<br>Bicep</h1>
      <p class="login-sub">AI-powered workout buddy for first timers</p>
      <p class="tag">Log every set. See every muscle you hit. Get a target for each lift, every session.</p>
    </div>
    <div class="login-card">
      ${S.authNote ? `<div class="banner info" role="status">${esc(S.authNote)}</div>` : ''}
      ${isStandalone() ? '' : `<button type="button" class="btn block" data-act="install" aria-expanded="${S.installOpen}" aria-controls="install-help">${ic('dl')} Download app</button>${S.installOpen ? help : ''}`}
      <button type="button" class="gbtn" data-act="signin" ${S.signingIn ? 'disabled' : ''}>
        <svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
        <span>${S.signingIn ? 'Opening Google…' : 'Continue with Google'}</span>
      </button>
      <p class="fine">New here? The same button creates your account.</p>
      ${S.authErr ? `<p class="err" role="alert">${esc(S.authErr)}</p>` : ''}
      ${isDemo ? '<p class="fine demo">Demo mode: Firebase isn\'t set up yet, so sign-in is simulated and data stays on this device.</p>' : ''}
    </div>
  </section>`;
}


/* ----- home ----- */
const LOAD_ERR = {
  'permission-denied': ['Firebase is blocking access to your data.', 'In Firebase, go to Firestore → Rules, paste in the contents of firestore.rules, then Publish.'],
  'failed-precondition': ['The Firestore database isn\'t set up yet.', 'In Firebase, go to Databases and storage → Firestore → Create database. Keep the ID as (default).'],
  'not-found': ['The Firestore database isn\'t set up yet.', 'In Firebase, go to Databases and storage → Firestore → Create database. Keep the ID as (default).'],
  'unavailable': ['You\'re offline.', 'Sessions will load when you\'re back online.'],
  'unauthenticated': ['Your sign-in has expired.', 'Log out from Profile, then sign in again.'],
};
function errorCard() {
  const [title, fix] = LOAD_ERR[S.loadErr] || ['Couldn\'t load your sessions.', 'Check your connection and try again.'];
  return `<section class="card err-card" role="alert"><h3>${title}</h3><p class="muted">${fix}</p><p class="fine">Error code: ${esc(S.loadErr)}</p><button type="button" class="btn primary" data-act="retry">Try again</button></section>`;
}


function onboardingBanner() {
  if (!needsOnboarding()) return '';
  return `<div class="banner info row-banner"><span><b>Get a plan made for you.</b> Answer 6 quick questions to unlock personalised workouts and AI Coach suggestions.</span><button type="button" class="btn small primary" data-act="go" data-r="onboarding">Start</button></div>`;
}

function homeView() {
  if (S.loadErr) return errorCard();
  if (!S.loaded || !S.profileLoaded) return `<div class="empty">Loading your sessions…</div>`;
  const d = S.draft;
  const first = (S.user.displayName || '').split(' ')[0] || 'there';
  const head = `<header class="top"><p class="eyebrow">${fLong(today())}</p><h1 class="h1">Hi, ${esc(first)}</h1></header>`;
  const doneToday = S.sessions.find((s) => s.date === today() && !isPartial(s));
  if (doneToday && !d.editingId && !touched(d)) return head + onboardingBanner() + doneView(doneToday);

  const clash = S.sessions.find((s) => s.date === d.date && s.id !== d.editingId && !isPartial(s));
  const w = d.workoutId ? workoutById(d.workoutId) : null;
  const savedCount = d.exercises.filter((e) => e.saved).length;
  return head + onboardingBanner() + `
  <section class="pick">
    <div class="pick-head">
      <div><p class="eyebrow">${d.editingId ? 'Editing workout' : 'Today\'s workout'}</p><h2 class="h2">${d.workoutId ? esc(d.workoutName) : 'What are you training today?'}</h2></div>
      <label class="date-chip"><span class="sr">Workout date</span><input type="date" id="d-date" data-f="date" value="${d.date}" max="${today()}"></label>
    </div>
    ${carousel()}
  </section>
  ${clash ? `<div class="banner warn">You already logged ${fShort(d.date)}. Saving replaces that workout. <button type="button" class="link" data-act="openSaved" data-id="${clash.id}">Open it</button></div>` : ''}
  ${!coachOn() && w ? `<button type="button" class="cta-coach" data-act="go" data-r="coach">${ic('ai')}<span><b>Enable AI Coach</b><small>Get sets, reps and weights picked for you after every workout</small></span>${ic('chev')}</button>` : ''}
  ${!w ? `<div class="empty small-empty">Pick a workout above to see its exercises.</div>` : `
  ${coachOn() && d.exercises.some((e) => !e.saved && recFor(e.name)) ? `<button type="button" class="btn small rec-all" data-act="fillall">${ic('ai')} Fill all AI Coach recommendations</button>` : ''}
  <div class="stack">${d.exercises.map((e, i) => exCard(e, i)).join('') || '<div class="empty small-empty">No exercises yet. Add one below.</div>'}</div>
  <button type="button" class="btn dashed block" data-act="addEx">${ic('plus')} Add exercise</button>
  ${cardioCard()}
  <section class="card"><label class="lbl" for="d-notes">Notes</label><textarea id="d-notes" data-f="notes" rows="2" placeholder="How it felt, machine used, any pain">${esc(d.notes)}</textarea></section>
  ${S.formErr ? `<p class="err" role="alert">${esc(S.formErr)}</p>` : ''}
  <div class="finish">
    <p class="fine">${savedCount ? `${savedCount} of ${d.exercises.length} exercises saved.` : 'Save each exercise as you finish it, or log everything at the end.'}${coachOn() ? ' AI Coach reviews the workout when you finish.' : ''}</p>
    <div class="save-row">
      <button type="button" class="btn primary grow" data-act="finish" ${S.saving ? 'disabled' : ''}>${S.saving ? 'Saving…' : d.status === 'complete' && d.editingId ? 'Update workout' : 'Finish workout'}</button>
      <button type="button" class="btn" data-act="discard">${d.editingId ? 'Cancel' : 'Reset'}</button>
    </div>
  </div>`}`;
}

function carousel() {
  const d = S.draft; const rec = recommendedId();
  const cards = [...plan().workouts, FREESTYLE].map((w) => {
    const on = d.workoutId === w.id;
    const mus = w.id === 'freestyle' ? 'Log anything you like' : workoutMuscles(w).slice(0, 4).join(' · ');
    const meta = w.id === 'freestyle' ? 'Your own exercises' : `${w.exercises.length} exercises · about ${Math.max(20, w.exercises.length * 8)} min`;
    return `<button type="button" class="wcard${on ? ' on' : ''}" data-act="pickW" data-id="${w.id}" aria-pressed="${on}">
      ${w.id === rec && !d.editingId ? '<span class="badge">Recommended</span>' : '<span class="badge ghost" aria-hidden="true"></span>'}
      <span class="wname">${esc(w.name)}</span><span class="wmeta">${esc(meta)}</span><span class="wmus">${esc(mus)}</span>
      ${on ? `<span class="wcheck">${ic('check')}</span>` : ''}</button>`;
  }).join('');
  return `<div class="carousel" role="group" aria-label="Choose a workout">${cards}</div>`;
}

function exCard(e, i) {
  const d = S.draft;
  const kind = e.kind || kindOf(e.name, e.sets);
  const name = findEx(e.name)?.name || e.name;
  const mus = Object.entries(musclesOf(e.name)).filter(([, w]) => w === 2).map(([m]) => MUSCLES[m].name);
  const prev = historyOf(e.name, S.sessions.filter((s) => s.id !== d.editingId && s.date !== d.date), d.date)[0];
  const last = prev ? `<p class="last"><span>Last · ${fShort(prev.date)}</span> ${prev.ex.sets.map((s) => setText(s, kind)).join(' · ')}</p>` : '<p class="last"><span>No history yet</span></p>';
  if (e.saved) {
    return `<article class="card ex saved">
      <div class="ex-head"><div class="ex-title"><h3>${esc(name)}</h3><p class="mus-tags">${e.sets.map((s) => setText(s, kind)).join(' · ')}</p></div>
      <span class="pill up">${ic('check')} Saved</span></div>
      <div class="ex-foot"><button type="button" class="btn small" data-act="editEx" data-i="${i}">Edit</button></div>
    </article>`;
  }
  const rec = recFor(e.name);
  const hasT = !!rec;
  const hdr = `<span>Set</span>${kind === 'time' ? '<span>Seconds</span><span></span>' : kind === 'bodyweight' ? '<span>Reps</span><span></span>' : '<span>Kg</span><span>Reps</span>'}${hasT ? '<span>AI target</span>' : ''}<span></span>`;
  const rows = e.sets.map((s, j) => {
    const t = hasT ? rec.sets[Math.min(j, rec.sets.length - 1)] : null;
    const tl = t ? (kind === 'time' ? `${t.secs}s` : kind === 'bodyweight' ? `${t.reps}` : `${fmtKg(t.kg)}×${t.reps}`) : '';
    const used = t && (kind === 'time' ? s.secs === t.secs : kind === 'bodyweight' ? s.reps === t.reps : s.kg === t.kg && s.reps === t.reps);
    const inA = kind === 'time'
      ? `<input id="e${i}s${j}secs" type="number" inputmode="numeric" min="0" step="5" aria-label="Set ${j + 1} seconds" data-f="secs" data-i="${i}" data-j="${j}" value="${s.secs ?? ''}">`
      : kind === 'bodyweight' ? `<input id="e${i}s${j}reps" type="number" inputmode="numeric" min="0" aria-label="Set ${j + 1} reps" data-f="reps" data-i="${i}" data-j="${j}" value="${s.reps ?? ''}">`
        : `<input id="e${i}s${j}kg" type="number" inputmode="decimal" min="0" step="0.5" aria-label="Set ${j + 1} weight in kg" data-f="kg" data-i="${i}" data-j="${j}" value="${s.kg ?? ''}">`;
    const inB = kind === 'weight' ? `<input id="e${i}s${j}reps" type="number" inputmode="numeric" min="0" aria-label="Set ${j + 1} reps" data-f="reps" data-i="${i}" data-j="${j}" value="${s.reps ?? ''}">` : '<span></span>';
    return `<span class="setno">${j + 1}</span>${inA}${inB}
      ${hasT ? `<button type="button" class="chip${used ? ' used' : ''}" data-act="use" data-i="${i}" data-j="${j}" aria-label="Use AI Coach target ${tl} for set ${j + 1}">${used ? ic('check') : ''}${tl}</button>` : ''}
      <button type="button" class="icon" data-act="rmSet" data-i="${i}" data-j="${j}" aria-label="Remove set ${j + 1}">${ic('x')}</button>`;
  }).join('');
  const recBox = rec ? `<div class="target"><span class="target-lbl">${ic('ai')} AI Coach's Recommendation</span><b>${recSummary(rec.kind || kind, rec.sets)}</b>${rec.note ? `<span>${esc(rec.note)}</span>` : ''}</div>` : '';
  return `<article class="card ex">
    <div class="ex-head">
      <div class="ex-title"><h3>${esc(name)}</h3>${mus.length ? `<p class="mus-tags">${mus.join(' · ')}</p>` : ''}</div>
      <button type="button" class="icon" data-act="rmEx" data-i="${i}" aria-label="Remove ${esc(name)}">${ic('x')}</button>
    </div>
    ${last}
    ${recBox}
    <div class="sets ${kind}${hasT ? '' : ' nt'}">${hdr}${rows}</div>
    ${S.exErr[i] ? `<p class="err" role="alert">${esc(S.exErr[i])}</p>` : ''}
    <div class="ex-foot">
      <button type="button" class="btn small" data-act="addSet" data-i="${i}">${ic('plus')} Set</button>
      ${hasT ? `<button type="button" class="btn small" data-act="useAll" data-i="${i}">${ic('check')} Use targets</button>` : ''}
      <button type="button" class="btn small primary push" data-act="saveEx" data-i="${i}">Save exercise</button>
    </div>
  </article>`;
}

function cardioCard() {
  const d = S.draft;
  const rows = d.cardio.map((c, i) => {
    const pace = c.km && c.min ? `${round1(c.km / (c.min / 60))} km/h` : '';
    return `<div class="cardio-row">
      <input id="c${i}type" aria-label="Cardio type" data-f="ctype" data-i="${i}" value="${esc(c.type)}" placeholder="Brisk walk">
      <input id="c${i}km" type="number" inputmode="decimal" step="0.01" min="0" aria-label="Distance in km" placeholder="km" data-f="km" data-i="${i}" value="${c.km ?? ''}">
      <input id="c${i}min" type="number" inputmode="numeric" min="0" aria-label="Minutes" placeholder="min" data-f="min" data-i="${i}" value="${c.min ?? ''}">
      <button type="button" class="icon" data-act="rmCardio" data-i="${i}" aria-label="Remove cardio">${ic('x')}</button>
      <span class="pace" id="pace${i}">${pace ? `${pace}${c.km / (c.min / 60) >= 5.5 ? ' · brisk' : ' · speed up to 5.5+'}` : 'Brisk is 5.5 to 6.5 km/h'}</span>
    </div>`;
  }).join('');
  return `<section class="card"><div class="card-head"><h3>Cardio</h3><button type="button" class="btn small" data-act="addCardio">${ic('plus')} Add</button></div>${rows || '<p class="muted">No cardio added.</p>'}</section>`;
}


function doneView(s) {
  const nid = recommendedId(); const nw = workoutById(nid) || plan().workouts[0];
  const c = coach();
  const next = nw.exercises.map((n) => {
    const r = recFor(n);
    return `<li><span>${esc(n)}</span>${r ? `<b>${recSummary(r.kind, r.sets)}</b>` : ''}</li>`;
  }).join('');
  return `<section class="hero done">
    <p class="eyebrow on-hero">${ic('check')} Logged today</p>
    <h2 class="hero-title">${esc(label(s))}</h2>
    <p class="on-hero-sub">${(s.exercises || []).length} exercises · ${setCount(s)} sets · ${kgFmt(volumeOf(s))} kg moved</p>
    <div class="row"><button type="button" class="ghost-hero" data-act="openSaved" data-id="${s.id}">Edit today's workout</button><button type="button" class="ghost-hero" data-act="otherDate">Log another date</button></div>
  </section>
  ${coachOn() && c.summary ? `<button type="button" class="cta-coach" data-act="go" data-r="coach">${ic('ai')}<span><b>${esc(c.summary.headline)}</b><small>Read AI Coach's review</small></span>${ic('chev')}</button>` : ''}
  <section class="card"><div class="card-head"><h3>Next up · ${esc(nw.name)}</h3>${coachOn() ? '' : '<button type="button" class="link" data-act="go" data-r="coach">Get targets</button>'}</div><ul class="next-list">${next}</ul></section>`;
}

/* ----- AI Coach ----- */
function coachView() {
  const head = `<header class="top"><p class="eyebrow">Your trainer</p><h1 class="h1">AI Coach</h1></header>`;
  if (!S.loaded || !S.profileLoaded) return head + '<div class="empty">Loading…</div>';
  if (!coachOn()) {
    return head + `<section class="hero coach-hero">
      <span class="orb-big">${ic('ai')}</span>
      <h2 class="hero-title small">A coach that reads every workout</h2>
      <ul class="coach-points">
        <li>${ic('check')} A short, honest review after each workout</li>
        <li>${ic('check')} How you did compared with last time</li>
        <li>${ic('check')} Sets, reps and weights for your next session, raised slowly and safely</li>
        <li>${ic('check')} Quick answers to common questions</li>
      </ul>
      <button type="button" class="btn primary block" data-act="enableCoach" ${S.coachBusy ? 'disabled' : ''}>${S.coachBusy ? 'Turning on…' : 'Enable AI Coach'}</button>
      <p class="fine on-hero-sub">When it's on, your workout log and onboarding answers are sent to our AI provider to create your review. Your name and email aren't sent. You can turn it off any time.</p>
    </section>
    ${needsOnboarding() ? onboardingBanner() : ''}`;
  }
  const c = coach();
  const partials = sorted().filter((s) => isPartial(s) && s.date < today());
  const nid = recommendedId(); const nw = workoutById(nid) || plan().workouts[0];
  const recRows = nw.exercises.map((n) => { const r = recFor(n); return `<li><span>${esc(n)}</span><b>${r ? recSummary(r.kind, r.sets) : '—'}</b></li>`; }).join('');
  const usage = c.usage && c.usage.day === today() ? c.usage : null;
  const busy = S.coachBusy;
  return head + `
  ${partials.map((s) => `<section class="card partial">
    <div class="card-head"><h3>Partial workout detected</h3><span class="pill">${fShort(s.date)}</span></div>
    <p class="muted">${esc(label(s))}: ${(s.exercises || []).length} exercise${(s.exercises || []).length === 1 ? '' : 's'} saved, workout not finished.</p>
    <button type="button" class="btn primary" data-act="partialToCoach" data-id="${s.id}" ${busy ? 'disabled' : ''}>Update to AI Coach</button>
  </section>`).join('')}
  ${needsOnboarding() ? onboardingBanner() : ''}
  ${S.coachErr ? `<div class="banner warn" role="alert">${esc(S.coachErr)}${S.coachErrDetail ? `<span class="err-detail">Details: ${esc(S.coachErrDetail)}</span>` : ''}</div>` : ''}
  ${busy && busy !== 'ask' ? `<section class="card thinking" aria-live="polite"><span class="pulse"></span><div><h3>AI Coach is reviewing your training…</h3><p class="muted">This usually takes 5 to 15 seconds.</p></div></section>` : ''}
  ${c.summary ? `<section class="card summary">
    <p class="eyebrow">${ic('ai')} Updated ${c.lastRunAt ? timeAgo(c.lastRunAt) : ''}</p>
    <h2 class="sum-head">${esc(c.summary.headline)}</h2>
    ${c.summary.recent ? `<div class="sum-block"><b>Latest workout</b><p>${esc(c.summary.recent)}</p></div>` : ''}
    ${c.summary.comparison ? `<div class="sum-block"><b>Compared with last time</b><p>${esc(c.summary.comparison)}</p></div>` : ''}
    ${c.summary.next ? `<div class="sum-block"><b>Next session</b><p>${esc(c.summary.next)}</p></div>` : ''}
    ${c.nudge ? `<p class="nudge">${esc(c.nudge)}</p>` : ''}
  </section>
  <section class="card"><div class="card-head"><h3>AI Coach's Recommendation · ${esc(nw.name)}</h3></div><ul class="next-list">${recRows}</ul>
    <p class="fine">These show on each exercise when you start ${esc(nw.name)}. Increases are capped to small, safe steps.</p></section>`
    : !busy ? `<section class="card"><h3>No review yet</h3><p class="muted">${S.sessions.length ? 'Run your first review now, or finish a workout and AI Coach will review it.' : 'Finish your first workout and AI Coach will review it.'}</p>
    <button type="button" class="btn primary" data-act="runCoach">Review my training</button></section>` : ''}
  <section class="card">
    <div class="card-head"><h3>Ask your coach</h3></div>
    <div class="chips-wrap">${PRESET_QUESTIONS.map((q, k) => `<button type="button" class="qchip" data-act="ask" data-k="${k}" ${busy ? 'disabled' : ''}>${esc(q)}</button>`).join('')}</div>
    ${busy === 'ask' ? '<p class="muted" aria-live="polite">Thinking…</p>' : ''}
    ${(c.qa || []).slice(0, 5).map((x) => `<div class="qa"><p class="q">${esc(x.q)}</p><p class="a">${esc(x.a)}</p></div>`).join('')}
  </section>
  <div class="coach-foot">
    ${usage ? `<span class="fine">${Math.max(0, usage.limit - usage.used)} of ${usage.limit} AI Coach requests left today</span>` : '<span></span>'}
    ${c.summary && !busy ? '<button type="button" class="link" data-act="runCoach">Refresh review</button>' : ''}
  </div>
  <button type="button" class="link danger-link" data-act="disableCoach">${S.coachOffConfirm ? 'Tap again to turn off AI Coach' : 'Turn off AI Coach'}</button>`;
}

function timeAgo(iso) {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (!Number.isFinite(m)) return '';
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} h ago`;
  return fShort(toStr(new Date(Date.parse(iso))));
}

/* ----- onboarding ----- */
function startOnboarding() {
  S.ob = { step: 0, answers: { ...(S.profile.onboarding?.answers || {}) }, enable: !coachOn() };
}
function onboardingView() {
  const ob = S.ob; const n = QUESTIONS.length; const forced = forcedOnboarding();
  const close = forced ? '' : `<button type="button" class="icon ob-close" data-act="obClose" aria-label="Close">${ic('x')}</button>`;
  if (ob.step < n) {
    const q = QUESTIONS[ob.step]; const v = ob.answers[q.id];
    const sel = (val) => (q.type === 'multi' ? (v || []).includes(val) : v === val);
    const ok = q.optional || (q.type === 'multi' ? true : v != null);
    return `<section class="ob">
      <div class="ob-top">${ob.step ? `<button type="button" class="icon" data-act="obBack" aria-label="Back">${ic('left')}</button>` : '<span></span>'}
        <div class="ob-bar" role="progressbar" aria-valuemin="1" aria-valuemax="${n}" aria-valuenow="${ob.step + 1}"><i style="width:${((ob.step + 1) / (n + 1)) * 100}%"></i></div>${close}</div>
      <p class="eyebrow">Question ${ob.step + 1} of ${n}</p>
      <h1 class="ob-title">${esc(q.title)}</h1>
      ${q.help ? `<p class="muted">${esc(q.help)}</p>` : ''}
      <div class="ob-opts" role="${q.type === 'multi' ? 'group' : 'radiogroup'}" aria-label="${esc(q.title)}">
        ${q.options.map((o) => `<button type="button" class="ob-opt${sel(o.value) ? ' on' : ''}" data-act="obPick" data-q="${q.id}" data-v="${esc(o.value)}" role="${q.type === 'multi' ? 'checkbox' : 'radio'}" aria-checked="${sel(o.value)}">
          <span class="ob-opt-txt"><b>${esc(o.label)}</b>${o.sub ? `<small>${esc(o.sub)}</small>` : ''}</span><span class="ob-tick">${sel(o.value) ? ic('check') : ''}</span></button>`).join('')}
      </div>
      <button type="button" class="btn primary block" data-act="obNext" ${ok ? '' : 'disabled'}>${q.type === 'multi' && !(v || []).length ? 'Nothing, continue' : 'Continue'}</button>
    </section>`;
  }
  const p = buildPlan(ob.answers);
  return `<section class="ob">
    <div class="ob-top"><button type="button" class="icon" data-act="obBack" aria-label="Back">${ic('left')}</button><div class="ob-bar"><i style="width:100%"></i></div>${close}</div>
    <p class="eyebrow">Your plan</p>
    <h1 class="ob-title">${p.workouts.length} workouts, ${esc(answerLabel(QUESTIONS.find((q) => q.id === 'days'), ob.answers.days)).toLowerCase()} a week</h1>
    <p class="muted">Rotate through these in order. The app shows which one is next.</p>
    <div class="stack">${p.workouts.map((w) => `<div class="card ob-plan"><h3>${esc(w.name)}</h3><p class="muted small">${esc(workoutMuscles(w).join(' · '))}</p><ol>${w.exercises.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></div>`).join('')}</div>
    <div class="card ob-ans">${QUESTIONS.map((q, k) => `<button type="button" class="ob-ans-row" data-act="obGo" data-k="${k}"><span class="muted small">${esc(q.title)}</span><b>${esc(answerLabel(q, ob.answers[q.id]) || 'Not answered')}</b></button>`).join('')}</div>
    ${coachOn() ? '' : `<label class="ob-coach"><input type="checkbox" id="ob-coach" data-f="obcoach" ${ob.enable ? 'checked' : ''}><span><b>Turn on AI Coach</b><small>Your answers and workout log are sent to our AI provider to set your targets and review each workout. Your name and email aren't sent.</small></span></label>`}
    <button type="button" class="btn primary block" data-act="obFinish" ${S.saving ? 'disabled' : ''}>${S.saving ? 'Saving…' : 'Start training'}</button>
  </section>`;
}

async function finishOnboarding() {
  const ob = S.ob; const p = buildPlan(ob.answers);
  const enable = coachOn() || ob.enable;
  const c = coach();
  S.saving = true; render();
  try {
    await store.saveProfile({
      onboarding: { done: true, version: ONBOARDING_VERSION, answers: ob.answers, completedAt: new Date().toISOString() },
      plan: p,
      ...(enable && !c.enabled ? { coach: { ...c, enabled: true, consentAt: new Date().toISOString() } } : {}),
    });
    S.profile = { ...S.profile, onboarding: { done: true, answers: ob.answers }, plan: p, ...(enable ? { coach: { ...c, enabled: true } } : {}) };
    S.ob = null; S.saving = false;
    if (!S.draft.editingId && !S.draft.exercises.some((e) => e.saved)) { S.draft = newDraft(S.draft.date); clearDraft(); }
    location.hash = enable ? 'coach' : 'home'; S.route = enable ? 'coach' : 'home';
    toast('Your plan is ready');
    render();
    if (enable) runCoach(S.sessions.length ? 'analyze' : 'onboard');
  } catch {
    S.saving = false; toast('Couldn\'t save your answers. Try again.', 'bad'); render();
  }
}

/* ----- history ----- */
function rangeFor(mode, anchor) {
  if (mode === 'day') return [anchor, anchor, fLong(anchor)];
  if (mode === 'week') { const a = weekStart(anchor), b = addDays(a, 6); return [a, b, `${fShort(a)} – ${fShort(b)} ${parse(b).getFullYear()}`]; }
  if (mode === 'month') { const d = parse(anchor); const a = toStr(new Date(d.getFullYear(), d.getMonth(), 1)); const b = toStr(new Date(d.getFullYear(), d.getMonth() + 1, 0)); return [a, b, `${MONTH[d.getMonth()]} ${d.getFullYear()}`]; }
  return ['0000-01-01', '9999-12-31', 'All sessions'];
}
function shift(mode, anchor, dir) {
  if (mode === 'day') return addDays(anchor, dir);
  if (mode === 'week') return addDays(anchor, 7 * dir);
  const d = parse(anchor); return toStr(new Date(d.getFullYear(), d.getMonth() + dir, 1));
}


function historyView() {
  if (S.loadErr) return errorCard();
  const H = S.hist;
  const [a, b, label] = rangeFor(H.mode, H.anchor);
  const list = sorted().filter((s) => s.date >= a && s.date <= b);
  const sets = list.reduce((t, s) => t + setCount(s), 0);
  const vol = list.reduce((t, s) => t + volumeOf(s), 0);
  const km = list.reduce((t, s) => t + (s.cardio || []).reduce((u, c) => u + (c.km || 0), 0), 0);
  const inputType = H.mode === 'month' ? 'month' : 'date';
  const inputVal = H.mode === 'month' ? H.anchor.slice(0, 7) : H.anchor;
  return `<header class="top"><p class="eyebrow">Your log</p><h1 class="h1">History</h1></header>
  <div class="seg" role="group" aria-label="Filter by">${['day', 'week', 'month', 'all'].map((m) => `<button type="button" data-act="hmode" data-m="${m}" class="${H.mode === m ? 'on' : ''}" aria-pressed="${H.mode === m}">${m[0].toUpperCase() + m.slice(1)}</button>`).join('')}</div>
  ${H.mode !== 'all' ? `<div class="period">
    <button type="button" class="icon" data-act="hprev" aria-label="Previous">${ic('left')}</button>
    <label class="period-label"><span>${label}</span><input type="${inputType}" id="h-pick" data-f="hpick" value="${inputVal}" aria-label="Pick a ${H.mode}"></label>
    <button type="button" class="icon" data-act="hnext" aria-label="Next">${ic('chev')}</button>
  </div>` : ''}
  <div class="stats">
    <div><b>${list.length}</b><span>Sessions</span></div>
    <div><b>${sets}</b><span>Sets</span></div>
    <div><b>${kgShort(vol)}</b><span>Kg moved</span></div>
    <div><b>${round1(km)}</b><span>Cardio km</span></div>
  </div>
  <div class="stack">${list.length ? list.map(logItem).join('') : `<div class="empty">No sessions in this ${H.mode}.<br><button type="button" class="link" data-act="go" data-r="home">Log a workout</button></div>`}</div>`;
}

function logItem(s) {
  const open = S.hist.open.has(s.id);
  const t = typeOf(s);
  const km = (s.cardio || []).reduce((u, c) => u + (c.km || 0), 0);
  return `<article class="log${open ? ' open' : ''}">
    <button type="button" class="log-sum" data-act="toggle" data-id="${s.id}" aria-expanded="${open}">
      <span class="log-date"><b>${parse(s.date).getDate()}</b><span>${MON[parse(s.date).getMonth()]}</span></span>
      <span class="log-main"><span class="row tight"><span class="pill ${t}">${esc(label(s))}</span>${isPartial(s) ? '<span class="pill warn-pill">Partial</span>' : ''}</span><span class="log-meta">${(s.exercises || []).length} exercises · ${setCount(s)} sets · ${kgFmt(volumeOf(s))}&nbsp;kg${km ? ` · ${round1(km)}&nbsp;km` : ''}</span></span>
      ${ic('down', 'chev')}
    </button>
    ${open ? `<div class="log-body">
      <p class="muted">${fLong(s.date)}</p>
      <ul class="lines">${(s.exercises || []).map((e) => { const k = kindOf(e.name, e.sets); return `<li><span>${esc(findEx(e.name)?.name || e.name)}</span><span class="sets-txt">${(e.sets || []).map((x) => setText(x, k)).join(' · ')}</span></li>`; }).join('')}
      ${(s.cardio || []).map((c) => `<li><span>${esc(c.type || 'Cardio')}</span><span class="sets-txt">${[c.km != null ? `${c.km} km` : '', c.min != null ? `${c.min} min` : '', c.km && c.min ? `${round1(c.km / (c.min / 60))} km/h` : ''].filter(Boolean).join(' · ')}</span></li>`).join('')}</ul>
      ${s.notes ? `<p class="note">${esc(s.notes)}</p>` : ''}
      <div class="row">
        <button type="button" class="btn small" data-act="openSaved" data-id="${s.id}">Edit</button>
        <button type="button" class="btn small danger" data-act="del" data-id="${s.id}">${S.hist.confirm === s.id ? 'Tap again to delete' : 'Delete'}</button>
      </div>
    </div>` : ''}
  </article>`;
}


/* ----- progress ----- */
function progressView() {
  if (S.loadErr) return errorCard();
  const P = S.prog;
  const all = sorted();
  let list = all;
  if (P.filter === '7') list = all.filter((s) => s.date >= addDays(today(), -6));
  else if (P.filter === '30') list = all.filter((s) => s.date >= addDays(today(), -29));
  else if (P.filter !== 'all') list = all.filter((s) => s.id === P.filter);
  const single = P.filter !== 'all' && P.filter !== '7' && P.filter !== '30';
  const cov = coverage(list);
  const values = Object.fromEntries(Object.entries(cov).map(([m, o]) => [m, o.v]));
  const lv = (v) => (v <= 0 ? 0 : single ? (v < 1.5 ? 1 : v < 3 ? 3 : 4) : (v < 3 ? 1 : v < 6 ? 2 : v < 10 ? 3 : 4));
  const levels = Object.fromEntries(Object.entries(values).map(([m, v]) => [m, lv(v)]));
  const sel = P.sel && MUSCLES[P.sel] ? P.sel : null;
  const missing = Object.keys(MUSCLES).filter((m) => !values[m]);
  const rows = Object.keys(MUSCLES).filter((m) => MUSCLES[m].view === P.view)
    .sort((x, y) => values[y] - values[x])
    .map((m) => {
      const v = values[m]; const max = Math.max(1, ...Object.values(values));
      return `<button type="button" class="mrow${sel === m ? ' sel' : ''}" data-act="msel" data-m="${m}">
        <span class="mname"><i class="sw lv${levels[m]}"></i>${MUSCLES[m].name}</span>
        <span class="mbar"><i style="width:${(v / max) * 100}%"></i></span>
        <span class="mval">${v ? `${round1(v)} sets` : '<em>Not trained</em>'}</span></button>`;
    }).join('');

  const lifts = new Map();
  [...all].reverse().forEach((s) => (s.exercises || []).forEach((e) => {
    const k = canon(e.name); const kind = kindOf(e.name, e.sets);
    if (kind !== 'weight') return;
    const top = Math.max(...(e.sets || []).map((x) => x.kg || 0)); if (!top) return;
    if (!lifts.has(k)) lifts.set(k, { name: findEx(e.name)?.name || e.name, first: top, firstDate: s.date, last: top, n: 0 });
    const o = lifts.get(k); o.last = top; o.n++;
  }));
  const liftRows = [...lifts.values()].sort((a, b) => (b.last / b.first) - (a.last / a.first)).map((o) => {
    const pct = Math.round(((o.last - o.first) / o.first) * 100);
    return `<li><span>${esc(o.name)}</span><span class="lift-v">${fmtKg(o.first)} → <b>${fmtKg(o.last)} kg</b></span><span class="pill ${pct > 0 ? 'up' : 'flat'}">${pct > 0 ? `+${pct}%` : o.n > 1 ? 'Same' : 'New'}</span></li>`;
  }).join('');

  const selInfo = sel ? `<div class="sel-info"><b>${MUSCLES[sel].name}</b><span>${values[sel] ? `${round1(values[sel])} sets from ${[...cov[sel].ex].map(esc).join(', ')}` : 'Not trained in this range'}</span></div>` : '<div class="sel-info muted">Tap a muscle to see which exercises hit it.</div>';

  return `<header class="top"><p class="eyebrow">Muscle coverage</p><h1 class="h1">Progress</h1></header>
  <div class="filter-row">
    <label class="lbl" for="p-filter">Show</label>
    <select id="p-filter" data-f="pfilter">
      <option value="all" ${P.filter === 'all' ? 'selected' : ''}>All sessions (${all.length})</option>
      <option value="7" ${P.filter === '7' ? 'selected' : ''}>Last 7 days</option>
      <option value="30" ${P.filter === '30' ? 'selected' : ''}>Last 30 days</option>
      <optgroup label="One session">${all.map((s) => `<option value="${s.id}" ${P.filter === s.id ? 'selected' : ''}>${fLong(s.date)} · ${esc(label(s))}</option>`).join('')}</optgroup>
    </select>
  </div>
  <section class="card body-card">
    <div class="seg small" role="group" aria-label="Body view">${['front', 'back'].map((v) => `<button type="button" data-act="pview" data-v="${v}" class="${P.view === v ? 'on' : ''}" aria-pressed="${P.view === v}">${v === 'front' ? 'Front' : 'Back'}</button>`).join('')}</div>
    ${bodySVG(P.view, levels, values, sel)}
    <div class="legend"><span><i class="sw lv0"></i>None</span><span><i class="sw lv1"></i>Light</span><span><i class="sw lv2"></i>Some</span><span><i class="sw lv3"></i>Good</span><span><i class="sw lv4"></i>High</span></div>
    ${selInfo}
  </section>
  ${missing.length ? `<div class="banner warn">Not trained ${single ? 'in this session' : 'in this range'}: ${missing.map((m) => MUSCLES[m].name).join(', ')}</div>` : '<div class="banner ok">Every muscle group got some work.</div>'}
  <section class="card"><div class="card-head"><h3>${P.view === 'front' ? 'Front' : 'Back'} muscles</h3><span class="muted small">Sets, helpers count half</span></div><div class="mlist">${rows}</div></section>
  ${liftRows ? `<section class="card"><div class="card-head"><h3>Top set, first → latest</h3></div><ul class="lifts">${liftRows}</ul></section>` : ''}`;
}


/* ----- profile ----- */
function profileView() {
  const u = S.user;
  const initials = (u.displayName || u.email || '?').split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase();
  const first = sorted()[S.sessions.length - 1];
  const p = plan();
  return `<header class="top"><p class="eyebrow">Account</p><h1 class="h1">Profile</h1></header>
  <section class="card profile">
    ${u.photoURL ? `<img class="avatar" src="${esc(u.photoURL)}" alt="" referrerpolicy="no-referrer">` : `<span class="avatar">${esc(initials)}</span>`}
    <dl>
      <div><dt>Full name</dt><dd>${esc(u.displayName || 'Not set')}</dd></div>
      <div><dt>Email ID</dt><dd>${esc(u.email || 'Not set')}</dd></div>
    </dl>
  </section>
  <section class="card">
    <div class="card-head"><h3>Training plan</h3><span class="muted small">${p.source === 'onboarding' ? 'Made from your answers' : 'Starter plan'}</span></div>
    <ul class="next-list">${p.workouts.map((w) => `<li><span>${esc(w.name)}</span><b>${w.exercises.length} exercises</b></li>`).join('')}</ul>
    <button type="button" class="btn small" data-act="go" data-r="onboarding">${needsOnboarding() ? 'Complete onboarding' : 'Update my answers'}</button>
  </section>
  <section class="card">
    <div class="card-head"><h3>Your data</h3><span class="muted small">${S.sessions.length} sessions${first ? ` since ${fShort(first.date)}` : ''}</span></div>
    <p class="muted">Copy your log to paste into any AI chat, or keep a backup file.</p>
    <div class="row wrap">
      <button type="button" class="btn small" data-act="copy">Copy my log</button>
      <button type="button" class="btn small" data-act="export">Download backup</button>
      <label class="btn small file">Import backup<input type="file" id="imp" accept="application/json,.json" data-f="import"></label>
    </div>
  </section>
  <button type="button" class="btn danger block" data-act="signout">Log out</button>
  <p class="fine center">Build My Bicep${isDemo ? ' · demo mode' : ''}</p>`;
}

/* ----- add exercise sheet ----- */
function renderSheet() {
  if (!S.sheet) { sheetEl.innerHTML = ''; sheetEl.hidden = true; return; }
  sheetEl.hidden = false;
  const have = new Set(S.draft.exercises.map((e) => canon(e.name)));
  const q = (S.sheet.q || '').toLowerCase();
  const groups = { upper: 'Upper body', lower: 'Lower body', core: 'Core' };
  const body = Object.entries(groups).map(([a, label]) => {
    const items = LIBRARY.filter((e) => e.area === a && !have.has(e.name.toLowerCase()) && (!q || e.name.toLowerCase().includes(q)));
    if (!items.length) return '';
    return `<p class="sheet-group">${label}</p>${items.map((e) => `<button type="button" class="sheet-item" data-act="pick" data-n="${esc(e.name)}"><span>${esc(e.name)}</span><span class="muted small">${Object.entries(e.muscles).filter(([, w]) => w === 2).map(([m]) => MUSCLES[m].name).join(', ')}</span></button>`).join('')}`;
  }).join('');
  sheetEl.innerHTML = `<div class="scrim" data-act="closeSheet"></div>
  <div class="sheet-panel" role="dialog" aria-modal="true" aria-label="Add exercise">
    <div class="card-head"><h3>Add exercise</h3><button type="button" class="icon" data-act="closeSheet" aria-label="Close">${ic('x')}</button></div>
    <input id="sheet-q" data-f="sheetq" placeholder="Search or type a new exercise" value="${esc(S.sheet.q || '')}" autocomplete="off">
    <div class="sheet-list" id="sheet-list">${body || '<p class="muted">No match in the list.</p>'}</div>
    ${q && !LIBRARY.some((e) => e.name.toLowerCase() === canon(q)) ? `<div class="custom">
      <p class="muted small">Add “${esc(S.sheet.q)}” as</p>
      <div class="row wrap">
        <button type="button" class="btn small" data-act="custom" data-k="weight">Weight × reps</button>
        <button type="button" class="btn small" data-act="custom" data-k="bodyweight">Reps only</button>
        <button type="button" class="btn small" data-act="custom" data-k="time">Seconds</button>
      </div></div>` : ''}
  </div>`;
}


/* ---------- coach ---------- */
const compact = (s) => ({
  date: s.date, workout: label(s), status: isPartial(s) ? 'partial' : 'complete',
  exercises: (s.exercises || []).map((e) => ({ name: findEx(e.name)?.name || e.name, sets: (e.sets || []).map((x) => (x.secs != null ? { secs: x.secs } : { kg: x.kg ?? null, reps: x.reps })) })),
  cardio: (s.cardio || []).map((c) => ({ type: c.type, km: c.km, min: c.min })),
  notes: s.notes || '',
});
function coachPayload(extra = {}) {
  const p = plan(); const c = coach();
  const ans = S.profile.onboarding?.answers;
  return {
    today: today(),
    firstName: (S.user.displayName || '').split(' ')[0] || '',
    onboarding: ans ? Object.fromEntries(QUESTIONS.map((q) => [q.id, answerLabel(q, ans[q.id])])) : null,
    plan: { split: p.split, workouts: p.workouts.map((w) => ({ id: w.id, name: w.name, exercises: w.exercises })) },
    sessions: sorted().filter((s) => !isPartial(s)).slice(0, 10).map(compact),
    memory: c.memory || [],
    previousSummary: c.summary || null,
    nextWorkoutHint: nextWorkoutId(p, S.sessions),
    sessionsFull: S.sessions,
    ...extra,
  };
}
async function runCoach(mode, extra = {}) {
  if (S.coachBusy) return;
  S.coachBusy = mode; S.coachErr = ''; S.coachErrDetail = ''; render();
  try {
    const { result, usage } = await callCoach(store, mode, coachPayload(extra));
    const c = { ...coach() };
    if (mode === 'ask') {
      c.qa = [{ q: extra.question, a: String(result.answer).slice(0, 1200), at: new Date().toISOString() }, ...(c.qa || [])].slice(0, 10);
    } else {
      const p = plan();
      const allowed = new Set(p.workouts.flatMap((w) => w.exercises).map(canon));
      const recs = {};
      (result.recommendations || []).forEach((r) => {
        const k = canon(r && r.exercise); if (!k || !allowed.has(k)) return;
        const cr = clampRec(r.exercise, r, S.sessions, addDays(today(), 1)); if (cr) recs[k] = cr;
      });
      const str = (v, n) => String(v || '').slice(0, n);
      const sm = result.summary || {};
      c.summary = { headline: str(sm.headline, 120), recent: str(sm.recent, 600), comparison: str(sm.comparison, 400), next: str(sm.next, 400) };
      c.nudge = str(result.nudge, 200);
      c.nextWorkout = p.workouts.some((w) => w.id === result.nextWorkout) ? result.nextWorkout : nextWorkoutId(p, S.sessions);
      c.recs = recs;
      const mem = (result.memory || []).filter((x) => typeof x === 'string' && x.trim()).map((x) => x.slice(0, 200)).slice(0, 12);
      if (mem.length) c.memory = mem;
      c.lastRunAt = new Date().toISOString(); c.lastRunFor = extra.justFinished || null;
    }
    if (usage) c.usage = { day: today(), used: usage.used, limit: usage.limit };
    await store.saveProfile({ coach: c });
    S.profile = { ...S.profile, coach: c };
    if (extra.justFinished) {
      const s = S.sessions.find((x) => x.id === extra.justFinished);
      if (s && !s.coached) store.save({ ...s, coached: true }).catch(() => {});
    }
    if (mode !== 'ask') toast('AI Coach updated your plan');
  } catch (e) {
    S.coachErr = COACH_ERRORS[e.code] || COACH_ERRORS['ai-error'];
    S.coachErrDetail = e.detail || e.code || '';
    if (e.usage) { const c = { ...coach(), usage: { day: today(), ...e.usage } }; S.profile = { ...S.profile, coach: c }; store.saveProfile({ coach: c }).catch(() => {}); }
  }
  S.coachBusy = null; render();
}

/* ---------- workout saving ---------- */
function fillSet(i, j) {
  const e = S.draft.exercises[i]; const r = recFor(e.name); if (!r) return;
  const t = r.sets[Math.min(j, r.sets.length - 1)];
  const kind = e.kind || r.kind;
  if (kind === 'time') e.sets[j] = { secs: t.secs };
  else if (kind === 'bodyweight') e.sets[j] = { kg: null, reps: t.reps };
  else e.sets[j] = { kg: t.kg, reps: t.reps };
}
function cleanSets(e) {
  const kind = e.kind || kindOf(e.name);
  return e.sets.filter((s) => (kind === 'time' ? s.secs > 0 : s.reps > 0))
    .map((s) => (kind === 'time' ? { secs: Math.round(s.secs) } : kind === 'bodyweight' ? { kg: null, reps: Math.round(s.reps) } : { kg: s.kg ?? null, reps: Math.round(s.reps) }));
}
const halfSet = (e) => (e.kind || 'weight') === 'weight' && e.sets.some((s) => s.kg != null && !(s.reps > 0));

async function persist(status) {
  const d = S.draft;
  const exercises = d.exercises.filter((e) => e.saved || status === 'complete')
    .map((e) => ({ name: findEx(e.name)?.name || e.name.trim(), kind: e.kind || kindOf(e.name), sets: cleanSets(e) })).filter((e) => e.sets.length);
  const cardio = d.cardio.filter((c) => c.km != null || c.min != null).map((c) => ({ type: (c.type || 'Cardio').trim() || 'Cardio', km: c.km ?? null, min: c.min ?? null }));
  const existing = S.sessions.find((s) => s.id === d.date);
  const session = {
    id: d.date, date: d.date, workoutId: d.workoutId, workoutName: d.workoutName,
    type: classify({ exercises }), status, exercises, cardio, notes: (d.notes || '').trim(),
    coached: status === 'complete' ? !!(existing && existing.coached && existing.status !== 'in-progress' && d.editingId) : false,
    updatedAt: new Date().toISOString(),
  };
  if (d.editingId && d.editingId !== session.id) await store.remove(d.editingId);
  await store.save(session);
  d.editingId = session.id;
  return session;
}

async function saveExercise(i) {
  const d = S.draft; const e = d.exercises[i];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date) || d.date > today()) { S.exErr[i] = 'Pick a valid date first.'; return render(); }
  if (halfSet(e)) { S.exErr[i] = 'Add reps for every set that has a weight, or clear the weight.'; return render(); }
  const sets = cleanSets(e);
  if (!sets.length) { S.exErr[i] = 'Fill in at least one set before saving.'; return render(); }
  delete S.exErr[i];
  e.sets = sets.map((x) => ({ ...x })); e.saved = true;
  try {
    await persist(d.status === 'complete' && d.editingId ? 'complete' : 'in-progress');
    toast(`${findEx(e.name)?.name || e.name} saved`);
  } catch { e.saved = false; S.exErr[i] = 'Couldn\'t save. Check your connection and try again.'; }
  saveDraft(); render();
}

async function finishWorkout() {
  const d = S.draft;
  S.formErr = '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) { S.formErr = 'Pick a date for this workout.'; return render(); }
  if (d.date > today()) { S.formErr = 'The date can\'t be in the future.'; return render(); }
  const half = d.exercises.find((e) => !e.saved && halfSet(e));
  if (half) { S.formErr = `${half.name}: add reps for every set that has a weight, or clear the weight.`; return render(); }
  const anyEx = d.exercises.some((e) => e.saved || cleanSets(e).length);
  const anyCardio = d.cardio.some((c) => c.km != null || c.min != null);
  if (!anyEx && !anyCardio) { S.formErr = 'Fill in at least one set, or add some cardio, before finishing.'; return render(); }
  const wasEditingComplete = d.status === 'complete' && d.editingId;
  S.saving = true; render();
  try {
    const session = await persist('complete');
    clearDraft();
    S.draft = newDraft();
    const latest = sorted().filter((s) => !isPartial(s) || s.id === session.id)[0];
    const review = coachOn() && (!latest || latest.date <= session.date);
    toast(wasEditingComplete ? 'Workout updated' : `Workout saved · ${session.exercises.length} exercises`);
    S.saving = false;
    window.scrollTo({ top: 0 });
    if (review) { location.hash = 'coach'; S.route = 'coach'; render(); runCoach('analyze', { justFinished: session.id }); return; }
  } catch {
    S.formErr = 'Couldn\'t save. Check your connection and try again. Your entries are kept on this phone.';
  }
  S.saving = false; render();
}

/* ---------- events ---------- */
app.addEventListener('click', async (ev) => {
  const b = ev.target.closest('[data-act]'); if (!b) return;
  const act = b.dataset.act, i = +b.dataset.i, j = +b.dataset.j, d = S.draft;
  switch (act) {
    case 'theme': toggleTheme(); return;
    case 'install': S.installOpen = !S.installOpen; render(); return;
    case 'installNow':
      if (installPrompt) { installPrompt.prompt(); try { await installPrompt.userChoice; } catch {} installPrompt = null; render(); }
      return;
    case 'signin':
      S.authErr = ''; S.authNote = ''; S.signingIn = true; render();
      try { await store.signIn(); } catch (e) { S.authErr = e?.code === 'auth/unauthorized-domain' ? 'This domain isn\'t allowed in Firebase yet. Add it under Authentication → Settings → Authorized domains.' : 'Sign-in didn\'t finish. Try again.'; }
      S.signingIn = false; render(); return;
    // onboarding
    case 'obPick': {
      const q = QUESTIONS.find((x) => x.id === b.dataset.q); const v = b.dataset.v;
      if (q.type === 'multi') { const a = new Set(S.ob.answers[q.id] || []); a.has(v) ? a.delete(v) : a.add(v); S.ob.answers[q.id] = [...a]; }
      else S.ob.answers[q.id] = v;
      render(); return;
    }
    case 'obNext': S.ob.step = Math.min(QUESTIONS.length, S.ob.step + 1); render(); window.scrollTo({ top: 0 }); return;
    case 'obBack': S.ob.step = Math.max(0, S.ob.step - 1); render(); return;
    case 'obGo': S.ob.step = +b.dataset.k; render(); return;
    case 'obClose': S.ob = null; location.hash = 'home'; return;
    case 'obFinish': await finishOnboarding(); return;
    // home
    case 'pickW': if (d.workoutId === b.dataset.id) return; pickWorkout(b.dataset.id); S.exErr = {}; break;
    case 'fillall': d.exercises.forEach((e, x) => { if (!e.saved && recFor(e.name)) e.sets.forEach((_, y) => fillSet(x, y)); }); toast('Targets filled. Change any set you did differently.'); break;
    case 'use': fillSet(i, j); break;
    case 'useAll': d.exercises[i].sets.forEach((_, y) => fillSet(i, y)); break;
    case 'addSet': { const s = d.exercises[i].sets; s.push({ ...(s[s.length - 1] || {}) }); break; }
    case 'rmSet': d.exercises[i].sets.splice(j, 1); if (!d.exercises[i].sets.length) d.exercises[i].sets.push({}); break;
    case 'rmEx': d.exercises.splice(i, 1); S.exErr = {}; break;
    case 'saveEx': await saveExercise(i); return;
    case 'editEx': d.exercises[i].saved = false; if (d.exercises[i].sets.length < 1) d.exercises[i].sets.push({}); break;
    case 'addEx': S.sheet = { q: '' }; saveDraft(); render(); setTimeout(() => document.getElementById('sheet-q')?.focus(), 50); return;
    case 'addCardio': d.cardio.push({ type: 'Brisk walk', km: null, min: null }); break;
    case 'rmCardio': d.cardio.splice(i, 1); break;
    case 'openSaved': { const s = S.sessions.find((x) => x.id === b.dataset.id); if (s) { S.draft = draftFromSession(s); S.formErr = ''; S.exErr = {}; location.hash = 'home'; S.route = 'home'; window.scrollTo({ top: 0 }); } break; }
    case 'otherDate': S.draft = { ...newDraft(addDays(today(), -1)), forceEdit: true }; break;
    case 'discard': clearDraft(); S.draft = newDraft(); S.formErr = ''; S.exErr = {}; window.scrollTo({ top: 0 }); render(); return;
    case 'finish': await finishWorkout(); return;
    case 'go': location.hash = b.dataset.r; return;
    case 'retry': S.unsub?.(); S.loaded = false; S.loadErr = null; render(); subscribe(); return;
    // coach
    case 'enableCoach': {
      const c = { ...coach(), enabled: true, consentAt: new Date().toISOString() };
      try { await store.saveProfile({ coach: c }); S.profile = { ...S.profile, coach: c }; } catch { toast('Couldn\'t turn on AI Coach. Try again.', 'bad'); return; }
      render();
      if (S.sessions.some((s) => !isPartial(s)) || S.profile.onboarding?.done) runCoach(S.sessions.some((s) => !isPartial(s)) ? 'analyze' : 'onboard');
      return;
    }
    case 'disableCoach': {
      if (!S.coachOffConfirm) { S.coachOffConfirm = true; render(); return; }
      S.coachOffConfirm = false;
      const c = { ...coach(), enabled: false };
      try { await store.saveProfile({ coach: c }); S.profile = { ...S.profile, coach: c }; toast('AI Coach turned off'); } catch { toast('Couldn\'t turn off. Try again.', 'bad'); }
      render(); return;
    }
    case 'runCoach': runCoach(S.sessions.some((s) => !isPartial(s)) ? 'analyze' : 'onboard'); return;
    case 'ask': runCoach('ask', { question: PRESET_QUESTIONS[+b.dataset.k] }); return;
    case 'partialToCoach': {
      const s = S.sessions.find((x) => x.id === b.dataset.id); if (!s) return;
      try { await store.save({ ...s, status: 'complete', updatedAt: new Date().toISOString() }); } catch { toast('Couldn\'t update. Try again.', 'bad'); return; }
      runCoach('analyze', { justFinished: s.id }); return;
    }
    // history & progress
    case 'hmode': S.hist.mode = b.dataset.m; S.hist.confirm = null; break;
    case 'hprev': S.hist.anchor = shift(S.hist.mode, S.hist.anchor, -1); break;
    case 'hnext': S.hist.anchor = shift(S.hist.mode, S.hist.anchor, 1); break;
    case 'toggle': { const id = b.dataset.id; S.hist.open.has(id) ? S.hist.open.delete(id) : S.hist.open.add(id); S.hist.confirm = null; break; }
    case 'del': {
      const id = b.dataset.id;
      if (S.hist.confirm !== id) { S.hist.confirm = id; break; }
      S.hist.confirm = null;
      try { await store.remove(id); toast('Session deleted'); } catch { toast('Couldn\'t delete. Try again.', 'bad'); }
      break;
    }
    case 'pview': S.prog.view = b.dataset.v; S.prog.sel = null; break;
    case 'msel': S.prog.sel = S.prog.sel === b.dataset.m ? null : b.dataset.m; break;
    case 'copy': {
      const text = exportText();
      try { await navigator.clipboard.writeText(text); toast('Copied. Paste it into any AI chat.'); } catch { toast('Couldn\'t copy. Use Download backup instead.', 'bad'); }
      return;
    }
    case 'export': {
      const blob = new Blob([JSON.stringify(exportObj(), null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `buildmybicep-${today()}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000); return;
    }
    case 'signout': S.unsub?.(); S.punsub?.(); clearDraft(); await store.signOut(); return;
    default: return;
  }
  saveDraft(); render();
});

app.addEventListener('click', (ev) => {
  const m = ev.target.closest('svg.body [data-m]');
  if (m) { S.prog.sel = S.prog.sel === m.dataset.m ? null : m.dataset.m; render(); }
});

sheetEl.addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-act]'); if (!b) return;
  const act = b.dataset.act;
  if (act === 'closeSheet') { S.sheet = null; render(); return; }
  if (act === 'pick' || act === 'custom') {
    const name = act === 'pick' ? b.dataset.n : S.sheet.q.trim();
    const kind = act === 'pick' ? findEx(name).kind : b.dataset.k;
    S.draft.exercises.push(blankEx(name, kind));
    if (!S.draft.workoutId) { S.draft.workoutId = 'freestyle'; S.draft.workoutName = 'Freestyle'; }
    S.sheet = null; saveDraft(); render();
    const cards = document.querySelectorAll('.ex'); cards[cards.length - 1]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    toast(`${name} added`);
  }
});
sheetEl.addEventListener('input', (ev) => {
  if (ev.target.dataset.f !== 'sheetq') return;
  S.sheet.q = ev.target.value;
  const pos = ev.target.selectionStart;
  renderSheet();
  const el = document.getElementById('sheet-q'); el.focus(); el.setSelectionRange(pos, pos);
});

app.addEventListener('input', (ev) => {
  const t = ev.target, f = t.dataset.f; if (!f) return;
  const d = S.draft, i = +t.dataset.i, j = +t.dataset.j;
  if (f === 'kg' || f === 'reps' || f === 'secs') { d.exercises[i].sets[j][f] = num(t.value); t.closest('.sets')?.querySelectorAll('.chip').forEach((c) => c.classList.remove('used')); }
  else if (f === 'ctype') d.cardio[i].type = t.value;
  else if (f === 'km' || f === 'min') {
    d.cardio[i][f] = num(t.value);
    const c = d.cardio[i]; const p = document.getElementById(`pace${i}`);
    if (p) p.textContent = c.km && c.min ? `${round1(c.km / (c.min / 60))} km/h${c.km / (c.min / 60) >= 5.5 ? ' · brisk' : ' · speed up to 5.5+'}` : 'Brisk is 5.5 to 6.5 km/h';
  } else if (f === 'notes') d.notes = t.value;
  else return;
  S.formErr = '';
  saveDraft();
});

app.addEventListener('change', async (ev) => {
  const t = ev.target, f = t.dataset.f; if (!f) return;
  if (f === 'date' && t.value) {
    const open = S.sessions.find((s) => s.date === t.value && s.id !== S.draft.editingId);
    if (open && isPartial(open)) S.draft = draftFromSession(open);
    else { S.draft.date = t.value; S.draft.forceEdit = true; }
    saveDraft(); render();
  }
  else if (f === 'obcoach') { S.ob.enable = t.checked; }
  else if (f === 'hpick' && t.value) { S.hist.anchor = S.hist.mode === 'month' ? `${t.value}-01` : t.value; render(); }
  else if (f === 'pfilter') { S.prog.filter = t.value; S.prog.sel = null; render(); }
  else if (f === 'import' && t.files?.[0]) {
    try {
      const data = JSON.parse(await t.files[0].text());
      const list = (Array.isArray(data) ? data : data.sessions || []).filter((s) => s && /^\d{4}-\d{2}-\d{2}$/.test(s.date) && Array.isArray(s.exercises))
        .map((s) => ({ ...s, id: s.date, cardio: s.cardio || [], notes: s.notes || '' }));
      if (!list.length) throw new Error('empty');
      await store.importMany(list);
      toast(`Imported ${list.length} sessions`);
    } catch { toast('That file isn\'t a Build My Bicep backup.', 'bad'); }
    t.value = '';
  }
});

function exportObj() { return { app: 'buildmybicep', version: 1, exportedAt: new Date().toISOString(), sessions: sorted().reverse() }; }
function exportText() {
  const lines = sorted().reverse().map((s) => {
    const ex = (s.exercises || []).map((e) => `- ${findEx(e.name)?.name || e.name}: ${(e.sets || []).map((x) => setText(x, kindOf(e.name, e.sets))).join(', ')}`).join('\n');
    const c = (s.cardio || []).map((x) => `- ${x.type}: ${x.km ?? '?'} km in ${x.min ?? '?'} min`).join('\n');
    return `${s.date} (${label(s)})\n${ex}${c ? `\n${c}` : ''}${s.notes ? `\nNotes: ${s.notes}` : ''}`;
  });
  return `My Build My Bicep workout log (${S.sessions.length} sessions):\n\n${lines.join('\n\n')}`;
}


/* ---------- boot ---------- */
applyTheme();
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') enforceExpiry(); });
setInterval(enforceExpiry, 60 * 60 * 1000);
// Tell Google Tag Manager about screen changes.
function trackScreen() {
  const r = S.user ? S.route : 'sign-in';
  (window.dataLayer = window.dataLayer || []).push({ event: 'virtual_page_view', page_path: `/${r}`, page_title: `Build My Bicep · ${r[0].toUpperCase()}${r.slice(1)}` });
}
window.addEventListener('hashchange', () => {
  S.route = routeFromHash(); S.sheet = null; S.coachOffConfirm = false;
  if (S.route === 'onboarding') startOnboarding(); else if (!forcedOnboarding()) S.ob = null;
  render(); window.scrollTo({ top: 0 }); trackScreen();
});

store.onAuth(async (u) => {
  if (u && sessionExpired(u)) { S.user = u; await enforceExpiry(); return; }
  S.authReady = true; S.user = u;
  trackScreen();
  S.unsub?.(); S.unsub = null; S.punsub?.(); S.punsub = null;
  S.sessions = []; S.loaded = false; S.profile = {}; S.profileLoaded = false; S.ob = null;
  if (u) {
    S.draft = null;
    subscribe();
  }
  render();
});

function subscribe() {
  S.loadErr = null;
  S.unsub = store.watchSessions((list) => {
    S.loadErr = null;
    S.sessions = list.filter((s) => s && s.date);
    const first = !S.loaded; S.loaded = true;
    if (first || !S.draft) S.draft = loadDraft();
    rerenderUnlessTyping(first);
  }, (err) => {
    S.loaded = true; S.loadErr = (err && err.code) || 'unknown';
    if (!S.draft) S.draft = newDraft();
    render();
  });
  S.punsub = store.watchProfile((p) => {
    const first = !S.profileLoaded;
    S.profile = p || {}; S.profileLoaded = true;
    rerenderUnlessTyping(first);
  }, () => { S.profileLoaded = true; render(); });
}
function rerenderUnlessTyping(force) {
  const typing = document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && app.contains(document.activeElement);
  if (!typing || force) render();
}
render();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
