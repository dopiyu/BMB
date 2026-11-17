import { createStore, isDemo } from './store.js';
import {
  LIBRARY, TEMPLATES, TYPE_LABEL, MUSCLES, findEx, canon, musclesOf, kindOf, typeOf, nextType,
  suggestFor, coverage, volumeOf, setCount, setText, fmtKg, secsOf, historyOf,
} from './program.js';
import { bodySVG } from './bodymap.js';

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
const ROUTES = ['home', 'history', 'progress', 'profile'];
const routeFromHash = () => { const h = location.hash.replace('#', ''); return ROUTES.includes(h) ? h : 'home'; };

const S = {
  user: null, authReady: false, authErr: '', authNote: '', signingIn: false, installOpen: false,
  sessions: [], loaded: false, unsub: null,
  route: routeFromHash(),
  draft: null, saving: false, formErr: '',
  sheet: null,
  hist: { mode: 'week', anchor: today(), open: new Set(), confirm: null },
  prog: { filter: 'all', view: 'front', sel: null },
};

const draftKey = () => `bmb-draft:${S.user?.uid}`;
const saveDraft = () => { try { localStorage.setItem(draftKey(), JSON.stringify(S.draft)); } catch {} };
const clearDraft = () => { try { localStorage.removeItem(draftKey()); } catch {} };

function newDraft(type, date = today()) {
  return {
    date, type, editingId: null, forceEdit: false,
    exercises: TEMPLATES[type].map((n) => ({ name: n, kind: findEx(n).kind, sets: [{}, {}, {}] })),
    cardio: [{ type: 'Brisk walk', km: null, min: null }],
    notes: '',
  };
}
function draftFromSession(s) {
  return {
    date: s.date, type: typeOf(s), editingId: s.id, forceEdit: true,
    exercises: (s.exercises || []).map((e) => ({ name: e.name, kind: kindOf(e.name, e.sets), sets: (e.sets || []).map((x) => ({ ...x })) })),
    cardio: (s.cardio || []).map((c) => ({ ...c })),
    notes: s.notes || '',
  };
}
function loadDraft() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(draftKey()) || 'null'); } catch {}
  if (d && (d.editingId || d.date === today() || d.forceEdit) && Array.isArray(d.exercises)) return d;
  return newDraft(nextType(S.sessions));
}
const touched = (d) => d.forceEdit || d.exercises.some((e) => e.sets.some((s) => s.kg != null || s.reps != null || s.secs != null))
  || d.cardio.some((c) => c.km != null || c.min != null) || (d.notes || '').trim();

const sorted = () => [...S.sessions].sort((a, b) => b.date.localeCompare(a.date));

/* ---------- render ---------- */
function render() {
  if (!S.authReady) { app.innerHTML = `<div class="splash"><div class="mark">${markSVG()}</div></div>`; navEl.hidden = true; return; }
  if (!S.user) { app.innerHTML = loginView(); navEl.hidden = true; sheetEl.innerHTML = ''; return; }
  navEl.hidden = false;
  renderNav();
  const view = { home: homeView, history: historyView, progress: progressView, profile: profileView }[S.route];
  app.innerHTML = `<main class="page" id="page">${themeBtn()}${view()}</main>`;
  renderSheet();
}

function renderNav() {
  navEl.innerHTML = ROUTES.map((r) => `<a href="#${r}" class="nb${S.route === r ? ' on' : ''}" ${S.route === r ? 'aria-current="page"' : ''}>${ic(r)}<span>${r[0].toUpperCase() + r.slice(1)}</span></a>`).join('');
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

function homeView() {
  if (S.loadErr) return errorCard();
  if (!S.loaded) return `<div class="empty">Loading your sessions…</div>`;
  const d = S.draft;
  const first = (S.user.displayName || '').split(' ')[0] || 'there';
  const savedToday = S.sessions.find((s) => s.date === today());
  const head = `<header class="top"><p class="eyebrow">${fLong(today())}</p><h1 class="h1">Hi, ${esc(first)}</h1></header>`;

  if (savedToday && !d.editingId && !touched(d)) return head + doneView(savedToday);

  const sug = nextType(S.sessions.filter((s) => s.id !== d.editingId));
  const clash = S.sessions.find((s) => s.date === d.date && s.id !== d.editingId);
  const n = d.editingId ? sorted().reverse().findIndex((s) => s.id === d.editingId) + 1 : S.sessions.length + 1;

  return head + `
  <section class="hero">
    <div class="hero-row">
      <div><p class="eyebrow on-hero">${d.editingId ? 'Editing session' : `Session ${n}`}</p><h2 class="hero-title">${TYPE_LABEL[d.type] || 'Workout'}</h2></div>
      <label class="date-pill"><span class="sr">Session date</span><input type="date" id="d-date" data-f="date" value="${d.date}" max="${today()}"></label>
    </div>
    <div class="seg on-hero" role="group" aria-label="Session type">
      ${['upper', 'lower'].map((t) => `<button type="button" data-act="type" data-t="${t}" class="${d.type === t ? 'on' : ''}" aria-pressed="${d.type === t}">${TYPE_LABEL[t]}${t === sug && !d.editingId ? '<i class="dot" title="Suggested next"></i>' : ''}</button>`).join('')}
    </div>
    <button type="button" class="ghost-hero" data-act="fillall">${ic('spark')} Fill all targets</button>
  </section>
  ${clash ? `<div class="banner warn">You already logged ${fShort(d.date)}. Saving replaces that session. <button type="button" class="link" data-act="openSaved" data-id="${clash.id}">Open it</button></div>` : ''}
  <div class="stack">${d.exercises.map((e, i) => exCard(e, i)).join('')}</div>
  <button type="button" class="btn dashed block" data-act="addEx">${ic('plus')} Add exercise</button>
  ${cardioCard()}
  <section class="card"><label class="lbl" for="d-notes">Notes</label><textarea id="d-notes" data-f="notes" rows="2" placeholder="How it felt, machine used, any pain">${esc(d.notes)}</textarea></section>
  ${S.formErr ? `<p class="err" role="alert">${esc(S.formErr)}</p>` : ''}
  <div class="save-row">
    <button type="button" class="btn primary grow" data-act="save" ${S.saving ? 'disabled' : ''}>${S.saving ? 'Saving…' : d.editingId ? 'Update session' : 'Save session'}</button>
    ${d.editingId || touched(d) ? `<button type="button" class="btn" data-act="discard">${d.editingId ? 'Cancel' : 'Reset'}</button>` : ''}
  </div>`;
}

function exCard(e, i) {
  const sg = suggestFor(e.name, S.sessions.filter((s) => s.id !== S.draft.editingId), S.draft.date);
  const kind = e.kind || sg.kind;
  const mus = Object.entries(musclesOf(e.name)).filter(([, w]) => w === 2).map(([m]) => MUSCLES[m].name);
  const last = sg.last ? `<p class="last"><span>Last · ${fShort(sg.last.date)}</span> ${sg.last.ex.sets.map((s) => setText(s, kind)).join(' · ')}</p>` : '<p class="last"><span>No history yet</span></p>';
  const tgt = sg.sets[0];
  const tgtText = kind === 'time' ? `${tgt.secs}s × 3` : kind === 'bodyweight' ? `${tgt.reps} reps × 3` : `${fmtKg(tgt.kg)} kg × ${tgt.reps} × 3`;
  const hdr = kind === 'time' ? '<span>Set</span><span>Seconds</span><span></span><span>Target</span><span></span>'
    : kind === 'bodyweight' ? '<span>Set</span><span>Reps</span><span></span><span>Target</span><span></span>'
      : '<span>Set</span><span>Kg</span><span>Reps</span><span>Target</span><span></span>';
  const rows = e.sets.map((s, j) => {
    const t = sg.sets[Math.min(j, sg.sets.length - 1)];
    const tl = kind === 'time' ? `${t.secs}s` : kind === 'bodyweight' ? `${t.reps}` : `${fmtKg(t.kg)}×${t.reps}`;
    const used = kind === 'time' ? s.secs === t.secs : kind === 'bodyweight' ? s.reps === t.reps : s.kg === t.kg && s.reps === t.reps;
    const inA = kind === 'time'
      ? `<input id="e${i}s${j}secs" type="number" inputmode="numeric" min="0" step="5" aria-label="Set ${j + 1} seconds" data-f="secs" data-i="${i}" data-j="${j}" value="${s.secs ?? ''}">`
      : kind === 'bodyweight' ? `<input id="e${i}s${j}reps" type="number" inputmode="numeric" min="0" aria-label="Set ${j + 1} reps" data-f="reps" data-i="${i}" data-j="${j}" value="${s.reps ?? ''}">`
        : `<input id="e${i}s${j}kg" type="number" inputmode="decimal" min="0" step="0.5" aria-label="Set ${j + 1} weight in kg" data-f="kg" data-i="${i}" data-j="${j}" value="${s.kg ?? ''}">`;
    const inB = kind === 'weight' ? `<input id="e${i}s${j}reps" type="number" inputmode="numeric" min="0" aria-label="Set ${j + 1} reps" data-f="reps" data-i="${i}" data-j="${j}" value="${s.reps ?? ''}">` : '<span></span>';
    return `<span class="setno">${j + 1}</span>${inA}${inB}
      <button type="button" class="chip${used ? ' used' : ''}" data-act="use" data-i="${i}" data-j="${j}" aria-label="Use target ${tl} for set ${j + 1}">${used ? ic('check') : ''}${tl}</button>
      <button type="button" class="icon" data-act="rmSet" data-i="${i}" data-j="${j}" aria-label="Remove set ${j + 1}">${ic('x')}</button>`;
  }).join('');
  return `<article class="card ex${sg.reset ? ' reset' : sg.up ? ' up' : ''}">
    <div class="ex-head">
      <div class="ex-title"><h3>${esc(findEx(e.name)?.name || e.name)}</h3>${mus.length ? `<p class="mus-tags">${mus.join(' · ')}</p>` : ''}</div>
      <button type="button" class="icon" data-act="rmEx" data-i="${i}" aria-label="Remove ${esc(e.name)}">${ic('x')}</button>
    </div>
    ${last}
    <div class="target"><b>Today ${tgtText}</b><span>${esc(sg.note)}</span></div>
    <div class="sets ${kind}">${hdr}${rows}</div>
    <div class="ex-foot">
      <button type="button" class="btn small" data-act="addSet" data-i="${i}">${ic('plus')} Add set</button>
      <button type="button" class="btn small" data-act="useAll" data-i="${i}">${ic('check')} Use all targets</button>
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
  const nt = nextType(S.sessions);
  const next = TEMPLATES[nt].map((n) => {
    const sg = suggestFor(n, S.sessions, addDays(today(), 1));
    const t = sg.sets[0];
    const tl = sg.kind === 'time' ? `${t.secs}s × 3` : sg.kind === 'bodyweight' ? `${t.reps} reps × 3` : `${fmtKg(t.kg)} kg × ${t.reps} × 3`;
    return `<li><span>${esc(n)}</span><b>${tl}</b></li>`;
  }).join('');
  return `<section class="hero done">
    <p class="eyebrow on-hero">${ic('check')} Logged today</p>
    <h2 class="hero-title">${TYPE_LABEL[typeOf(s)]}</h2>
    <p class="on-hero-sub">${(s.exercises || []).length} exercises · ${setCount(s)} sets · ${kgFmt(volumeOf(s))} kg moved</p>
    <div class="row"><button type="button" class="ghost-hero" data-act="openSaved" data-id="${s.id}">Edit today's session</button><button type="button" class="ghost-hero" data-act="otherDate">Log another date</button></div>
  </section>
  <section class="card"><div class="card-head"><h3>Next up · ${TYPE_LABEL[nt]}</h3></div><ul class="next-list">${next}</ul></section>`;
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
      <span class="log-main"><span class="pill ${t}">${TYPE_LABEL[t]}</span><span class="log-meta">${(s.exercises || []).length} exercises · ${setCount(s)} sets · ${kgFmt(volumeOf(s))}&nbsp;kg${km ? ` · ${round1(km)}&nbsp;km` : ''}</span></span>
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
      <optgroup label="One session">${all.map((s) => `<option value="${s.id}" ${P.filter === s.id ? 'selected' : ''}>${fLong(s.date)} · ${TYPE_LABEL[typeOf(s)]}</option>`).join('')}</optgroup>
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
  return `<header class="top"><p class="eyebrow">Account</p><h1 class="h1">Profile</h1></header>
  <section class="card profile">
    ${u.photoURL ? `<img class="avatar" src="${esc(u.photoURL)}" alt="" referrerpolicy="no-referrer">` : `<span class="avatar">${esc(initials)}</span>`}
    <dl>
      <div><dt>Full name</dt><dd>${esc(u.displayName || 'Not set')}</dd></div>
      <div><dt>Email ID</dt><dd>${esc(u.email || 'Not set')}</dd></div>
    </dl>
  </section>
  <section class="card">
    <div class="card-head"><h3>Your data</h3><span class="muted small">${S.sessions.length} sessions${first ? ` since ${fShort(first.date)}` : ''}</span></div>
    <p class="muted">Copy your log and paste it into a chat with Claude for a full review.</p>
    <div class="row wrap">
      <button type="button" class="btn small" data-act="copy">Copy log for Claude</button>
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

/* ---------- actions ---------- */
function fillSet(i, j) {
  const e = S.draft.exercises[i];
  const sg = suggestFor(e.name, S.sessions.filter((s) => s.id !== S.draft.editingId), S.draft.date);
  const t = sg.sets[Math.min(j, sg.sets.length - 1)];
  const kind = e.kind || sg.kind;
  if (kind === 'time') e.sets[j] = { secs: t.secs };
  else if (kind === 'bodyweight') e.sets[j] = { kg: null, reps: t.reps };
  else e.sets[j] = { kg: t.kg, reps: t.reps };
}

async function save() {
  const d = S.draft;
  S.formErr = '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) { S.formErr = 'Pick a date for this session.'; return render(); }
  if (d.date > today()) { S.formErr = 'The date can\'t be in the future.'; return render(); }
  const exercises = d.exercises.map((e) => {
    const kind = e.kind || kindOf(e.name);
    const sets = e.sets.filter((s) => (kind === 'time' ? s.secs > 0 : s.reps > 0))
      .map((s) => (kind === 'time' ? { secs: Math.round(s.secs) } : kind === 'bodyweight' ? { kg: null, reps: Math.round(s.reps) } : { kg: s.kg ?? null, reps: Math.round(s.reps) }));
    return { name: findEx(e.name)?.name || e.name.trim(), kind, sets };
  }).filter((e) => e.sets.length);
  const half = d.exercises.find((e) => (e.kind || 'weight') === 'weight' && e.sets.some((s) => s.kg != null && !(s.reps > 0)));
  if (half) { S.formErr = `${half.name}: add reps for every set that has a weight, or clear the weight.`; return render(); }
  const cardio = d.cardio.filter((c) => c.km != null || c.min != null).map((c) => ({ type: (c.type || 'Cardio').trim() || 'Cardio', km: c.km ?? null, min: c.min ?? null }));
  if (!exercises.length && !cardio.length) { S.formErr = 'Fill in at least one set, or add some cardio, before saving.'; return render(); }
  const session = { id: d.date, date: d.date, type: d.type, exercises, cardio, notes: (d.notes || '').trim(), updatedAt: new Date().toISOString() };
  S.saving = true; render();
  try {
    if (d.editingId && d.editingId !== session.id) await store.remove(d.editingId);
    await store.save(session);
    clearDraft();
    S.draft = newDraft(nextType([...S.sessions.filter((s) => s.id !== session.id && s.id !== d.editingId), session]));
    toast(`Saved · ${exercises.length} exercises, ${exercises.reduce((t, e) => t + e.sets.length, 0)} sets`);
    window.scrollTo({ top: 0 });
  } catch (e) {
    S.formErr = 'Couldn\'t save. Check your connection and try again. Your entries are kept on this phone.';
  }
  S.saving = false; render();
}

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
    case 'type':
      if (d.type === b.dataset.t) return;
      S.draft = { ...newDraft(b.dataset.t, d.date), editingId: d.editingId, forceEdit: d.forceEdit, notes: d.notes, cardio: d.cardio };
      break;
    case 'fillall': d.exercises.forEach((e, x) => e.sets.forEach((_, y) => fillSet(x, y))); toast('Targets filled. Change any set you did differently.'); break;
    case 'use': fillSet(i, j); break;
    case 'useAll': d.exercises[i].sets.forEach((_, y) => fillSet(i, y)); break;
    case 'addSet': { const s = d.exercises[i].sets; s.push({ ...(s[s.length - 1] || {}) }); break; }
    case 'rmSet': d.exercises[i].sets.splice(j, 1); if (!d.exercises[i].sets.length) d.exercises.splice(i, 1); break;
    case 'rmEx': d.exercises.splice(i, 1); break;
    case 'addEx': S.sheet = { q: '' }; saveDraft(); render(); setTimeout(() => document.getElementById('sheet-q')?.focus(), 50); return;
    case 'addCardio': d.cardio.push({ type: 'Brisk walk', km: null, min: null }); break;
    case 'rmCardio': d.cardio.splice(i, 1); break;
    case 'openSaved': { const s = S.sessions.find((x) => x.id === b.dataset.id); if (s) { S.draft = draftFromSession(s); S.formErr = ''; location.hash = 'home'; S.route = 'home'; window.scrollTo({ top: 0 }); } break; }
    case 'otherDate': S.draft = { ...newDraft(nextType(S.sessions), addDays(today(), -1)), forceEdit: true }; break;
    case 'discard': clearDraft(); S.draft = newDraft(nextType(S.sessions)); S.formErr = ''; window.scrollTo({ top: 0 }); render(); return;
    case 'save': await save(); return;
    case 'go': location.hash = b.dataset.r; return;
    case 'retry': S.unsub?.(); S.loaded = false; S.loadErr = null; render(); subscribe(); return;
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
      try { await navigator.clipboard.writeText(text); toast('Copied. Paste it into Claude.'); } catch { toast('Couldn\'t copy. Use Download backup instead.', 'bad'); }
      return;
    }
    case 'export': {
      const blob = new Blob([JSON.stringify(exportObj(), null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `buildmybicep-${today()}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000); return;
    }
    case 'signout': S.unsub?.(); clearDraft(); await store.signOut(); return;
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
    S.draft.exercises.push({ name, kind, sets: [{}, {}, {}] });
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
  if (f === 'date' && t.value) { S.draft.date = t.value; S.draft.forceEdit = true; saveDraft(); render(); }
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
    return `${s.date} (${TYPE_LABEL[typeOf(s)]})\n${ex}${c ? `\n${c}` : ''}${s.notes ? `\nNotes: ${s.notes}` : ''}`;
  });
  return `My Build My Bicep workout log (${S.sessions.length} sessions):\n\n${lines.join('\n\n')}`;
}

/* ---------- boot ---------- */
applyTheme();
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') enforceExpiry(); });
setInterval(enforceExpiry, 60 * 60 * 1000);
// Tell Google Tag Manager about screen changes (Home, History, Progress, Profile).
function trackScreen() {
  const r = S.user ? S.route : 'sign-in';
  (window.dataLayer = window.dataLayer || []).push({ event: 'virtual_page_view', page_path: `/${r}`, page_title: `Build My Bicep · ${r[0].toUpperCase()}${r.slice(1)}` });
}
window.addEventListener('hashchange', () => { S.route = routeFromHash(); S.sheet = null; render(); window.scrollTo({ top: 0 }); trackScreen(); });

store.onAuth(async (u) => {
  if (u && sessionExpired(u)) { S.user = u; await enforceExpiry(); return; }
  S.authReady = true; S.user = u;
  trackScreen();
  S.unsub?.(); S.unsub = null; S.sessions = []; S.loaded = false;
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
      const typing = S.route === 'home' && document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && app.contains(document.activeElement);
      if (!typing || first) render();
    }, (err) => {
      S.loaded = true; S.loadErr = (err && err.code) || 'unknown';
      if (!S.draft) S.draft = loadDraft();
      render();
    });
}
render();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
