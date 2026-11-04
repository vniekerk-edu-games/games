'use strict';
/* =========================================================
   KAMP KOPKRAP – core helpers (rng, storage, sound, registry)
   ========================================================= */
const $ = id => document.getElementById(id);
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---- seeded random (so puzzles can be replayed / daily puzzle is the same for everyone) ---- */
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function makeRng(seed) {
  const f = mulberry32(seed >>> 0);
  const R = {
    f, seed,
    int: (a, b) => Math.floor(f() * (b - a + 1)) + a,
    pick: arr => arr[Math.floor(f() * arr.length)],
    chance: p => f() < p,
    shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(f() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
  };
  return R;
}
const newSeed = () => (Math.random() * 4294967296) >>> 0;
function todayKey() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }
function todaySeed() { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }

/* ---- storage: on-device profiles ---- */
const DB_KEY = 'kampKopkrap_v1';
let DB = { profiles: [], current: null };
function loadDB() { try { const s = JSON.parse(localStorage.getItem(DB_KEY)); if (s && Array.isArray(s.profiles)) DB = s; } catch (e) { } }
function saveDB() { try { localStorage.setItem(DB_KEY, JSON.stringify(DB)); } catch (e) { } }
function prof() { return DB.profiles.find(p => p.id === DB.current) || null; }
function newProfile(name, av) { return { id: 'p' + Date.now() + Math.floor(Math.random() * 999), name, av, sound: true, stars: 0, g: {}, diff: {}, daily: null, seenHelp: {} }; }
function gstat(p, gid, d) { p.g[gid] = p.g[gid] || {}; p.g[gid][d] = p.g[gid][d] || { n: 0, s: 0 }; return p.g[gid][d]; }

/* ---- sound (generated, no audio files) ---- */
const Snd = {
  ctx: null,
  init() { if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } } if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  on() { const p = prof(); return this.ctx && (!p || p.sound); },
  tone(f, d, type = 'sine', vol = .08, slide = 0, delay = 0) {
    if (!this.on()) return;
    const t = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), t + d);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t + d + .05);
  },
  tap() { this.tone(660, .06, 'triangle', .07); },
  place() { this.tone(420, .1, 'triangle', .1, 120); },
  lift() { this.tone(520, .08, 'triangle', .07, -120); },
  rotate() { this.tone(760, .06, 'square', .03, 200); },
  step() { this.tone(300 + Math.random() * 60, .06, 'triangle', .06); },
  bad() { this.tone(260, .2, 'triangle', .12, -60); this.tone(200, .25, 'triangle', .12, -40, .15); },
  good() { [523, 659, 784].forEach((f, i) => this.tone(f, .14, 'triangle', .09, 0, i * .07)); },
  hint() { [880, 1175].forEach((f, i) => this.tone(f, .12, 'sine', .08, 0, i * .09)); },
  splash() { this.tone(180, .5, 'sine', .08, 160); },
  win() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, .2, 'triangle', .1, 0, i * .11)); }
};

/* ---- toast ---- */
let toastT = null;
function toast(msg, ms = 2200) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms); }

/* ---- game registry ---- */
const GAMES = {}, GAME_ORDER = [];
function registerGame(def) { GAMES[def.id] = def; GAME_ORDER.push(def.id); }
const DIFFS = [null, { n: 'Kampkind', e: '🌱' }, { n: 'Verkenner', e: '🧭' }, { n: 'Kampleier', e: '🏔️' }];

/* ---- stars helper: fewer hints / closer to best = more stars ---- */
function starsFrom(base, hints) { return clamp(base - hints, 1, 3); }
