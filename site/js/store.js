// Data layer. Firebase (Google sign-in + Firestore) when configured, demo mode otherwise.
import { firebaseConfig } from './firebase-config.js';

const FB = '10.12.2';
export const isDemo =
  !firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith('YOUR_') ||
  new URLSearchParams(location.search).has('demo');

const clean = (s) => JSON.parse(JSON.stringify(s));

export function createStore() {
  return isDemo ? demoStore() : firebaseStore();
}

function demoStore() {
  const KEY = 'bmb-demo-sessions', AUTH = 'bmb-demo-auth';
  const user = { uid: 'demo', displayName: 'Demo athlete', email: 'demo@buildmybicep.com', photoURL: null };
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
  const write = (a) => { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch {} };
  let authCb = () => {}, listeners = new Set();
  const emit = () => listeners.forEach((cb) => cb(read()));
  const PKEY = 'bmb-demo-profile', profListeners = new Set();
  const readProf = () => { try { return JSON.parse(localStorage.getItem(PKEY) || '{}'); } catch { return {}; } };
  const writeProf = (p) => { try { localStorage.setItem(PKEY, JSON.stringify(p)); } catch {} };
  return {
    onAuth(cb) {
      authCb = cb;
      let signed = false, at = null;
      try { signed = localStorage.getItem(AUTH) === '1'; at = localStorage.getItem(AUTH + '-at'); } catch {}
      setTimeout(() => cb(signed ? { ...user, lastSignIn: at } : null), 0);
    },
    async signIn() {
      const at = new Date().toISOString();
      try { localStorage.setItem(AUTH, '1'); localStorage.setItem(AUTH + '-at', at); } catch {}
      authCb({ ...user, lastSignIn: at });
    },
    async signOut() { try { localStorage.removeItem(AUTH); } catch {} authCb(null); },
    watchSessions(cb) { listeners.add(cb); setTimeout(() => cb(read()), 0); return () => listeners.delete(cb); },
    async save(s) { const a = read().filter((x) => x.id !== s.id); a.push(clean(s)); write(a); emit(); },
    async remove(id) { write(read().filter((x) => x.id !== id)); emit(); },
    async importMany(list) { const m = new Map(read().map((x) => [x.id, x])); list.forEach((s) => m.set(s.id, clean(s))); write([...m.values()]); emit(); },
    // Profile: onboarding answers, plan and AI Coach state. Each top-level key is replaced as a whole.
    watchProfile(cb) { profListeners.add(cb); setTimeout(() => cb(readProf()), 0); return () => profListeners.delete(cb); },
    async saveProfile(patch) { writeProf({ ...readProf(), ...clean(patch) }); profListeners.forEach((cb) => cb(readProf())); },
    async idToken() { return 'demo'; },
  };
}

function firebaseStore() {
  let modsP = null, authCb = () => {}, current = null;
  const load = () => (modsP ||= (async () => {
    const [appM, authM, fsM] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-firestore.js`),
    ]);
    const app = appM.initializeApp(firebaseConfig);
    const auth = authM.getAuth(app);
    let db;
    try {
      db = fsM.initializeFirestore(app, {
        localCache: fsM.persistentLocalCache({ tabManager: fsM.persistentMultipleTabManager() }),
      });
    } catch { db = fsM.getFirestore(app); }
    return { authM, fsM, auth, db };
  })());

  const col = (m) => m.fsM.collection(m.db, 'users', current.uid, 'sessions');

  return {
    async onAuth(cb) {
      authCb = cb;
      const m = await load();
      m.authM.getRedirectResult(m.auth).catch(() => {});
      m.authM.onAuthStateChanged(m.auth, async (u) => {
        current = u;
        if (u) {
          m.fsM.setDoc(m.fsM.doc(m.db, 'users', u.uid), {
            name: u.displayName || '', email: u.email || '', lastSignIn: new Date().toISOString(),
          }, { merge: true }).catch(() => {});
        }
        cb(u ? { uid: u.uid, displayName: u.displayName, email: u.email, photoURL: u.photoURL, lastSignIn: u.metadata?.lastSignInTime || null } : null);
      });
    },
    async signIn() {
      const m = await load();
      const provider = new m.authM.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      try {
        await m.authM.signInWithPopup(m.auth, provider);
      } catch (e) {
        const code = e && e.code;
        if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment' || code === 'auth/cancelled-popup-request') {
          await m.authM.signInWithRedirect(m.auth, provider);
          return;
        }
        if (code === 'auth/popup-closed-by-user') return;
        throw e;
      }
    },
    async signOut() { const m = await load(); await m.authM.signOut(m.auth); },
    watchSessions(cb, onErr) {
      let unsub = () => {}, stopped = false;
      load().then((m) => {
        if (stopped || !current) return;
        unsub = m.fsM.onSnapshot(col(m), (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), onErr);
      });
      return () => { stopped = true; unsub(); };
    },
    async save(s) {
      const m = await load();
      await m.fsM.setDoc(m.fsM.doc(col(m), s.id), clean(s));
    },
    async remove(id) {
      const m = await load();
      await m.fsM.deleteDoc(m.fsM.doc(col(m), id));
    },
    watchProfile(cb, onErr) {
      let unsub = () => {}, stopped = false;
      load().then((m) => {
        if (stopped || !current) return;
        unsub = m.fsM.onSnapshot(m.fsM.doc(m.db, 'users', current.uid), (snap) => cb(snap.data() || {}), onErr);
      });
      return () => { stopped = true; unsub(); };
    },
    // Each top-level key in patch replaces that field as a whole (mergeFields).
    async saveProfile(patch) {
      const m = await load();
      await m.fsM.setDoc(m.fsM.doc(m.db, 'users', current.uid), clean(patch), { mergeFields: Object.keys(patch) });
    },
    async idToken() {
      const m = await load();
      return m.auth.currentUser ? m.auth.currentUser.getIdToken() : null;
    },
    async importMany(list) {
      const m = await load();
      for (let i = 0; i < list.length; i += 400) {
        const b = m.fsM.writeBatch(m.db);
        list.slice(i, i + 400).forEach((s) => b.set(m.fsM.doc(col(m), s.id), clean(s)));
        await b.commit();
      }
    },
  };
}
