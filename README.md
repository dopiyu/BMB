# Build My Bicep: setup guide

An installable workout app (PWA) for buildmybicep.com. It runs on Netlify, signs in with Google, and keeps your data in Firebase. You don't need to build anything: the `site` folder is the finished app.

## What's in this folder

| Path | What it is |
|---|---|
| `site/` | The app. Netlify publishes this folder. |
| `site/js/firebase-config.js` | **The one file you edit**: paste your Firebase keys here. |
| `site/_redirects` | Sends Google sign-in through your domain. Edit one line (your Firebase project ID). |
| `netlify.toml` | Tells Netlify to publish `site` when you deploy from Git. |
| `firestore.rules` | Database security rules. Paste into Firebase. |

Until you add your Firebase keys, the app runs in **demo mode**: fake sign-in, data saved only in that browser. It's useful for trying things out.

## Why Firebase for the database

- **Google sign-in is built in.** One switch, no server code.
- **Works offline at the gym.** Sets you log without signal are saved on your phone and sync when you're back online.
- **Free at your scale.** The free plan allows 50,000 reads and 20,000 writes a day. You'll use a few hundred.
- **It never goes to sleep.** Supabase's free plan pauses a project after a week of no use. Firebase doesn't.
- Each person can only read and write their own workouts (see `firestore.rules`).

## Step 1: Create the Firebase project (about 10 minutes)

1. Go to https://console.firebase.google.com and click **Create a project**. Name it `buildmybicep`. You can turn Google Analytics off.
2. **Turn on Google sign-in:** Build → Authentication → Get started → Sign-in method → **Google** → Enable → choose your support email → Save.
3. **Create the database:** Build → Firestore Database → Create database → location **asia-south1 (Mumbai)** → start in **production mode**.
4. **Add the security rules:** Firestore → Rules tab → replace everything with the contents of `firestore.rules` → Publish.
5. **Register the web app:** Project settings (gear icon) → General → Your apps → the `</>` (Web) icon → name it `Build My Bicep` → Register. Don't tick Firebase Hosting.
6. Firebase shows a `firebaseConfig` block. Copy its values into `site/js/firebase-config.js`, but **keep `authDomain: 'buildmybicep.com'`**, not the `firebaseapp.com` one it shows.
7. **Allow your domain:** Authentication → Settings → Authorized domains → Add `buildmybicep.com`, then add your Netlify address too (for example `buildmybicep.netlify.app`).

## Step 2: Let Google sign-in work through your domain

The installed app signs in through `buildmybicep.com/__/auth/…`, which Netlify forwards to Firebase. This avoids sign-in failures inside installed apps.

1. In `site/_redirects`, replace `YOUR_PROJECT_ID` with your Firebase project ID (Project settings → General → Project ID).
2. Go to https://console.cloud.google.com, select the same project → APIs & Services → Credentials → open **Web client (auto created by Google Service)**.
3. Under **Authorized JavaScript origins**, add `https://buildmybicep.com`.
4. Under **Authorized redirect URIs**, add `https://buildmybicep.com/__/auth/handler`. Save.
5. APIs & Services → OAuth consent screen: set the app name to **Build My Bicep**, add your support email, and add `buildmybicep.com` under authorized domains. Publish it (Publishing status → In production) so anyone can sign in, not just test users.

## Step 3: Put it on Netlify

**Easiest (no Git):**
1. Log in at https://app.netlify.com → Add new site → **Deploy manually**.
2. Drag the **`site`** folder onto the page. Only drag `site`: the import file and this guide should stay off the web.

**Better long-term (auto-deploy):** put this folder in a GitHub repo, then Netlify → Add new site → Import from Git → pick the repo. Every push redeploys.

## Step 4: Connect buildmybicep.com

1. Netlify → your site → Domain management → **Add a domain** → `buildmybicep.com`.
2. Netlify shows DNS records. Either:
   - **Use Netlify DNS** (simplest): change the nameservers at the registrar where you bought the domain to the four Netlify gives you, or
   - **Keep your registrar's DNS**: add an `A` record for `@` pointing to `75.2.60.5` and a `CNAME` for `www` pointing to your `*.netlify.app` address.
3. Wait for DNS to update (minutes to a few hours). Netlify then issues the HTTPS certificate automatically. A PWA only installs over HTTPS.

## Step 5: Install it on your phone

1. Open https://buildmybicep.com in **Chrome** on Android.
2. Tap ⋮ → **Install app** (or **Add to Home screen**). It opens full-screen like a normal app.
3. Sign in with Google.
4. Go to **Profile → Import backup** and pick your backup file. Your sessions appear in History and Progress.

On iPhone, use Safari → Share → Add to Home Screen.

## How the app works

- **Home** shows your next session. Upper and lower days alternate based on your last workout. Each exercise shows what you did last time and today's target. Tap a target chip to fill that set, or type your own numbers. **Add set**, **Add exercise** and the ✕ buttons change the plan for the day.
- **Target rules:**
  - Hit 10 reps on every set → add one weight step and aim for 8 reps.
  - Otherwise → same weight, aim for 10 on every set.
  - Stuck at the same weight for 3 sessions → drop about 10% and build back up.
  - Plank → add 5 seconds once every set is held.
- **History** filters by day, week, month or all. Tap a session to expand it, then edit or delete.
- **Progress** shows the front and back of the body, shaded by sets per muscle. A muscle's main exercises count as full sets, helper muscles as half. Filter by all sessions, the last 7 or 30 days, or one session. Tap a muscle to see which exercises hit it.
- **Profile** shows your name, email and log out. **Copy log for Claude** copies your full history as text to paste into a chat with Claude for a review.

## Updating the app later

This repo is connected to Netlify:

1. Every change arrives as a **pull request**. Netlify posts a **Deploy Preview** link on it, so you can try the change before it goes live. Google sign-in only works on buildmybicep.com, so sign-in won't work on previews.
2. **Merge** the pull request to publish it to buildmybicep.com, usually within a minute.
3. To undo a change, open Netlify → Deploys, pick an earlier deploy, then **Publish deploy**.

There's no need to touch `VERSION` in `site/sw.js`: Netlify stamps it with the commit ID on every deploy, so installed phones update automatically.

`firestore.rules` is **not** deployed automatically. If it changes, paste it into Firebase → Firestore → Rules → Publish.

## Costs

- Netlify free plan: enough for this.
- Firebase Spark (free) plan: enough for this. You won't need to add a card.
- Domain: the yearly renewal at your registrar.

## AI Coach setup

AI Coach runs on our own AI key through a Netlify function at `/api/coach`. The key lives only in Netlify, never in this repo or on anyone's phone.

1. Get an API key from **one** provider:
   - Anthropic (Claude): console.anthropic.com → API keys
   - Google (Gemini): aistudio.google.com → Get API key
   - OpenAI: platform.openai.com → API keys
2. In Netlify, go to **Project configuration → Environment variables → Add a variable** and add one of `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` or `OPENAI_API_KEY`. Mark it **secret**.
3. Optional settings:
   | Variable | What it does | Default |
   |---|---|---|
   | `AI_PROVIDER` | `anthropic`, `gemini` or `openai`. Set it if more than one key exists (Netlify's AI Gateway can add Anthropic and OpenAI keys on its own) | Gemini, then Anthropic, then OpenAI |
   | `AI_MODEL` | Model name for that provider | `claude-haiku-5-5`, `gemini-3.8-flash`, `gpt-4.1-mini` |
   | `AI_FALLBACK_MODEL` | A second model to try when the main one is busy (503), for example a lighter Flash model | none |
   | `AI_TIMEOUT_MS` | How long to wait for the AI reply before giving up. Keep it under Netlify's function time limit | 9500 |
   | `AI_USER_DAILY_LIMIT` | Requests per person per day | 10 |
   | `AI_DAILY_LIMIT` | Requests for the whole app per day | 300 |
4. Redeploy: Deploys → Trigger deploy → Deploy project.

**What the function does:** checks the person is signed in (it verifies their Firebase sign-in token), counts requests against the daily limits, sends our coaching instructions plus the person's onboarding answers and last 10 workouts to the model, and returns JSON. The app then caps any weight or rep increase to a small, safe step before showing it.

**What's sent to the AI:** first name, onboarding answers, plan, last 10 finished workouts, coach notes. Email and full name are not sent.

**Editing the content:**
- Onboarding questions: `site/js/onboarding.js` (`QUESTIONS`)
- How answers become a plan: `buildPlan()` in `site/js/program.js`
- Preset questions: `PRESET_QUESTIONS` in `site/js/coach.js`
- Coaching instructions (the logic layer): `SYSTEM_PROMPT` in `netlify/functions/coach.mjs`
- Safety caps on AI targets: `clampRec()` in `site/js/program.js`
