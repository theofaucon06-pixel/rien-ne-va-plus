#!/usr/bin/env node
// Mixage « Zéro Vert » : voix + musique + effets -> output/video/audio-mix.wav (48 kHz, stéréo, 24 bits) et audio-mix.m4a.
//
//   node tools/video/sound/mix.mjs [--no-sfx] [--no-music] [--from 120] [--to 150] [--no-report] [--no-spec] [--keep]
//
// Étapes (un graphe de filtres ffmpeg par étape, écrits dans output/video/work/mix/*.txt, lus avec -filter_complex_script) :
//   1. voix      : passe-haut, EQ, compresseur, gain -16 LUFS, plafond de crête        -> voice-proc.wav
//   2. musique   : segments placés, bouclés/tronqués, fondus, silences (mutes)         -> music-bus.wav
//   3. effets    : un graphe par effet (gain, pan, réverbération des impacts), ambiances bouclées -> sfx-bus.wav / amb-bus.wav
//   4. mixage    : ducking sidechain (voix en clé) sur musique + ambiance, somme, glue, limiteur -> premaster.wav + stems
//   5. master    : loudnorm deux passes (-14 LUFS, TP <= -1), durée exacte                -> audio-mix.wav / .m4a
//   6. contrôle  : mesures ebur128, masquage de la voix, courbe d'énergie, clics aux coupes, spectrogrammes -> mix-report.md
// Les réglages (gains, filtres) sont dans tools/video/sound/mix-config.json ; direction.json n'est jamais modifié.
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve as presolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { loadTiming, resolve as anchor } from '../lib/anchors.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = presolve(HERE, '../../..');
const OUT = join(ROOT, 'output/video');
const DATA = join(OUT, 'data');
const WORK = join(OUT, 'work/mix');
const SFX_DIR = join(OUT, 'assets/sfx');
const MUSIC_DIR = join(OUT, 'assets/music');
const FFMPEG = process.env.FFMPEG || join(homedir(), '.local/ffmpeg-6.0/ffmpeg');
const SR = 48000;

// ---------------------------------------------------------------- options
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const val = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const parseT = (s) => { if (s === undefined) return undefined; if (/^\d+:\d+(\.\d+)?$/.test(s)) { const [m, x] = s.split(':'); return +m * 60 + +x; } return +s; };
const NO_SFX = flag('--no-sfx'), NO_MUSIC = flag('--no-music');
const NO_SPEC = flag('--no-spec'), NO_REPORT = flag('--no-report'), TUNE = flag('--tune'), SIMSHORT = flag('--simulate-short-music'); // --simulate-short-music : test de la boucle (fichiers musique réduits à 12 s) // --tune : sans master, rapport seul (réglage des gains)
const ARG_FROM = parseT(val('--from')), ARG_TO = parseT(val('--to'));
const T_START = Date.now();
const log = (...a) => console.log(`[${((Date.now() - T_START) / 1000).toFixed(1).padStart(5)}s]`, ...a);

mkdirSync(WORK, { recursive: true });

// ---------------------------------------------------------------- utilitaires
const clampN = (x, a, b) => Math.min(b, Math.max(a, x));
const num = (x) => (Math.round(x * 1e6) / 1e6).toString();
const db2lin = (d) => Math.pow(10, d / 20);
const lin2db = (x) => 20 * Math.log10(Math.max(x, 1e-12));
const sam = (t) => Math.round(t * SR);
const mmss = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
const AF = `aformat=sample_fmts=fltp:sample_rates=${SR}:channel_layouts=stereo`;

function deepMerge(a, b) {
  if (b === undefined) return a;
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
    const o = { ...a };
    for (const k of Object.keys(b)) o[k] = deepMerge(a[k], b[k]);
    return o;
  }
  return b;
}

function run(cmd, args, { allowFail = false, maxBuffer = 1 << 30, label = '' } = {}) {
  const r = spawnSync(cmd, args, { encoding: null, maxBuffer });
  if (r.status !== 0 && !allowFail) {
    const err = (r.stderr || Buffer.alloc(0)).toString().split('\n').slice(-25).join('\n');
    throw new Error(`${label || cmd} a échoué (code ${r.status})\n${err}`);
  }
  return { out: r.stdout, err: (r.stderr || Buffer.alloc(0)).toString(), status: r.status };
}

/** Lance ffmpeg avec un graphe écrit dans un fichier (-filter_complex_script). */
function ffGraph(name, graph, inputArgs, outputArgs) {
  const gp = join(WORK, `${name}.txt`);
  writeFileSync(gp, graph + '\n');
  const t0 = Date.now();
  run(FFMPEG, ['-hide_banner', '-nostdin', '-y', '-loglevel', 'error', ...inputArgs, '-filter_complex_script', gp, ...outputArgs], { label: `ffmpeg[${name}]` });
  log(`graphe ${name} : ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}

/** ebur128 sur un fichier (+ filtre optionnel) -> { I, LRA, peak, thresh } */
function ebur(file, pre = '') {
  const af = (pre ? pre + ',' : '') + 'ebur128=peak=true';
  const r = run(FFMPEG, ['-hide_banner', '-nostdin', '-nostats', '-i', file, '-af', af, '-f', 'null', '-'], { label: 'ebur128' });
  const s = r.err.slice(r.err.lastIndexOf('Summary:'));
  const g = (re) => { const m = re.exec(s); return m ? parseFloat(m[1]) : NaN; };
  return { I: g(/I:\s+(-?[\d.]+|-inf) LUFS/), LRA: g(/LRA:\s+(-?[\d.]+) LU/), thresh: g(/Threshold:\s+(-?[\d.]+) LUFS/), peak: g(/Peak:\s+(-?[\d.]+|-inf) dBFS/) };
}

/** Décode un fichier en f32 (mono ou stéréo, 48 kHz) -> Float32Array */
function decode(file, ch = 1) {
  const r = run(FFMPEG, ['-hide_banner', '-nostdin', '-loglevel', 'error', '-i', file, '-f', 'f32le', '-ac', String(ch), '-ar', String(SR), 'pipe:1'], { label: 'decode' });
  const b = r.out;
  return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength - (b.byteLength % 4)));
}

function readWavF32(path) {
  const b = readFileSync(path);
  let p = 12, ch = 1;
  while (p < b.length - 8) {
    const id = b.toString('ascii', p, p + 4), sz = b.readUInt32LE(p + 4);
    if (id === 'fmt ') ch = b.readUInt16LE(p + 10);
    if (id === 'data') {
      const n = Math.min(sz, b.length - p - 8);
      const ab = b.buffer.slice(b.byteOffset + p + 8, b.byteOffset + p + 8 + (n - (n % 4)));
      return { data: new Float32Array(ab), ch };
    }
    p += 8 + sz + (sz % 2);
  }
  throw new Error(`WAV sans bloc data : ${path}`);
}

// ---------------------------------------------------------------- données
const CFG = deepMerge(JSON.parse(readFileSync(join(HERE, 'mix-config.json'), 'utf8')), {});
const DIR = JSON.parse(readFileSync(join(DATA, 'direction.json'), 'utf8'));
const timing = loadTiming(join(DATA, 'timing.json'));
const SFXMAP = JSON.parse(readFileSync(join(SFX_DIR, 'map.json'), 'utf8'));
const MUSMAP = JSON.parse(readFileSync(join(MUSIC_DIR, 'map.json'), 'utf8'));
const TOTAL = timing.total;
const T0 = Math.max(0, ARG_FROM ?? 0);
const T1 = Math.min(TOTAL, ARG_TO ?? TOTAL);
const FULL = T0 === 0 && T1 === TOTAL;
const DUR = T1 - T0;
const NSAMP = sam(DUR);
const SUFFIX = (NO_SFX ? '.nosfx' : '') + (NO_MUSIC ? '.nomusic' : '') + (TUNE ? '.tune' : '') + (FULL ? '' : `.${Math.round(T0)}-${Math.round(T1)}`);
const res = (a) => anchor(timing, a);
const rel = (t) => t - T0; // temps de la ligne de temps complète -> temps de l'extrait

// cache d'analyse des fichiers sources
const CACHE_PATH = join(WORK, 'analysis-cache.json');
const CACHE = existsSync(CACHE_PATH) ? JSON.parse(readFileSync(CACHE_PATH, 'utf8')) : {};
function cached(file, kind, fn) {
  const st = statSync(file);
  const key = `${kind}|${file}|${st.size}|${Math.round(st.mtimeMs)}`;
  if (!CACHE[key]) CACHE[key] = fn();
  return CACHE[key];
}
function sfxInfo(file) {
  return cached(file, 'sfx2', () => {
    const x = decode(file, 2);
    let pk = 0, pi = 0;
    for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > pk) { pk = a; pi = i; } }
    return { peakDb: lin2db(pk), peakT: Math.floor(pi / 2) / SR, dur: x.length / 2 / SR, lufs: ebur(file).I };
  });
}
function musicInfo(file) {
  return cached(file, 'music', () => ({ ...ebur(file), dur: x2dur(file) }));
}
function x2dur(file) { return decode(file, 2).length / 2 / SR; }

// ---------------------------------------------------------------- 1. voix
function buildVoice() {
  const V = CFG.voice;
  const voiceIn = join(DATA, 'voice.wav');
  const chain = [
    'pan=stereo|c0=c0|c1=c0',
    `highpass=f=${V.highpass_hz}:poles=2`,
    ...V.eq.map((e) => `equalizer=f=${e.f}:t=q:w=${e.q}:g=${e.g}`),
    `highshelf=f=${V.high_shelf.f}:g=${V.high_shelf.g}`,
    `acompressor=threshold=${num(db2lin(V.compressor.threshold_db))}:ratio=${V.compressor.ratio}:attack=${V.compressor.attack_ms}:release=${V.compressor.release_ms}:makeup=1`,
  ].join(',');
  const eqPath = join(WORK, 'voice-eq.wav');
  const procPath = join(WORK, 'voice-proc.wav');
  const sigPath = join(WORK, 'voice-sig.json');
  const sig = JSON.stringify([V, statSync(voiceIn).mtimeMs]);
  if (existsSync(procPath) && existsSync(sigPath) && readFileSync(sigPath, 'utf8') === sig) { log('voix : cache'); return procPath; }
  ffGraph('voice-chain', `[0:a]${chain},${AF}[o]`, ['-i', voiceIn], ['-map', '[o]', '-c:a', 'pcm_f32le', eqPath]);
  const m = ebur(eqPath);
  let gain = V.target_lufs - m.I + V.trim_db;
  const lim = db2lin(V.peak_ceiling_db);
  for (let it = 0; it < 3; it++) {
    ffGraph('voice-gain', `[0:a]volume=${num(gain)}dB,alimiter=limit=${num(lim)}:attack=5:release=60:level=0[o]`, ['-i', eqPath], ['-map', '[o]', '-c:a', 'pcm_f32le', procPath]);
    const q = ebur(procPath);
    const err = V.target_lufs + V.trim_db - q.I;
    log(`voix : ${q.I.toFixed(2)} LUFS, crête ${q.peak.toFixed(2)} dBFS (gain ${gain.toFixed(2)} dB)`);
    if (Math.abs(err) < 0.05) break;
    gain += err;
  }
  writeFileSync(sigPath, sig);
  return procPath;
}

// ---------------------------------------------------------------- 2. musique
const EDGES = []; // coupes à contrôler : { t, what, stem }
const MUTES = []; // silences de musique à vérifier : { id, a, b }
const SEGS = []; // segments de musique placés : { id, from, to }
function buildMusic() {
  const M = CFG.music;
  const segs = DIR.music.map((m) => {
    const info = musicInfo(join(MUSIC_DIR, MUSMAP[m.id].file));
    const from = res(m.from), to = res(m.to);
    const mutes = (m.mutes || []).map((u) => [res(u.from), res(u.to)]).sort((a, b) => a[0] - b[0]);
    const gainDb = M.target_lufs - info.I + m.gain_db + M.trim_db + (M.per_id_db[m.id] || 0);
    return { id: m.id, file: join(MUSIC_DIR, MUSMAP[m.id].file), info, from, to, mutes, gainDb, fi: m.fade_in ?? 0, fo: m.fade_out ?? 0 };
  });
  const inputs = [], lines = [], pieceLabels = [];
  let ii = 0;
  const report = [];
  for (const s of segs) {
    if (s.to <= T0 || s.from >= T1) continue;
    const len = s.to - s.from;
    SEGS.push({ id: s.id, from: s.from, to: s.to });
    for (const [a, b] of s.mutes) MUTES.push({ id: s.id, a, b });
    const idx = ii++;
    const addIn = () => { inputs.push('-i', s.file); return inputs.length / 2 - 1; };
    // boucle si le fichier est trop court : n copies (une entrée par copie) enchaînées en fondu enchaîné, puis EQ + gain
    const Lf = SIMSHORT ? 12 : s.info.dur;
    const xf = Math.min(M.loop_xfade_s, Lf / 3);
    const prep = `${SIMSHORT ? `atrim=end=${Lf},` : ''}${AF}`;
    let head;
    if (len > Lf) {
      const n = Math.ceil((len - xf) / (Lf - xf));
      let prev = null;
      for (let k = 0; k < n; k++) {
        lines.push(`[${addIn()}:a]${prep}[m${idx}c${k}];`);
        if (k === 0) prev = `m${idx}c0`;
        else { lines.push(`[${prev}][m${idx}c${k}]acrossfade=d=${num(xf)}:c1=tri:c2=tri[m${idx}x${k}];`); prev = `m${idx}x${k}`; }
      }
      head = `[${prev}]anull`;
      report.push(`${s.id} bouclé x${n}`);
    } else head = `[${addIn()}:a]${prep}`;
    // parties audibles (hors silences), en temps de la ligne de temps complète
    let pieces = [], cur = s.from;
    for (const [a, b] of s.mutes) {
      const aa = Math.max(a, s.from), bb = Math.min(b, s.to);
      if (bb <= aa) continue;
      if (aa > cur) pieces.push([cur, aa, cur === s.from, false]);
      cur = Math.max(cur, bb);
    }
    if (cur < s.to) pieces.push([cur, s.to, false, true]);
    // marquage des bords réels (début/fin du segment)
    pieces = pieces.map(([a, b, atStart, atEnd]) => [a, b, a === s.from, b === s.to]);
    const eqs = [`highpass=f=${M.highpass_hz}`, ...M.eq.map((e) => `equalizer=f=${e.f}:t=q:w=${e.q}:g=${e.g}`), `volume=${num(s.gainDb)}dB`];
    const vis = pieces.map((p) => [Math.max(p[0], T0), Math.min(p[1], T1), p[2], p[3], p[0], p[1]]).filter((p) => p[1] - p[0] > 0.02);
    if (!vis.length) continue;
    lines.push(`${head},${eqs.join(',')},asplit=${vis.length}${vis.map((_, k) => `[m${idx}s${k}]`).join('')};`);
    vis.forEach(([a, b, atStart, atEnd, a0, b0], k) => {
      const off = a - s.from, plen = b - a;
      const fIn = atStart ? s.fi : M.mute_up_s;
      const fOut = atEnd ? s.fo : M.mute_down_s;
      const clipL = a > a0 + 1e-6, clipR = b < b0 - 1e-6; // coupes dues à --from/--to
      const fi = clipL ? 0.01 : Math.min(fIn, plen / 2), fo = clipR ? 0.01 : Math.min(fOut, plen / 2);
      const f = [`atrim=start=${num(off)}:end=${num(off + plen)}`, 'asetpts=PTS-STARTPTS'];
      if (fi > 0) f.push(`afade=t=in:st=0:d=${num(fi)}:curve=tri`);
      if (fo > 0) f.push(`afade=t=out:st=${num(plen - fo)}:d=${num(fo)}:curve=tri`);
      f.push(`adelay=${sam(rel(a))}S:all=1`);
      lines.push(`[m${idx}s${k}]${f.join(',')}[mp${idx}_${k}];`);
      pieceLabels.push(`[mp${idx}_${k}]`);
      if (!atStart || s.fi < 0.2) EDGES.push({ t: rel(a), what: `${s.id} début de partie`, stem: 'music' });
      if (!atEnd || s.fo < 0.2) EDGES.push({ t: rel(b), what: `${s.id} fin de partie`, stem: 'music' });
    });
    report.push(`${s.id} ${mmss(s.from)}→${mmss(s.to)} (${vis.length} partie(s), gain ${s.gainDb.toFixed(1)} dB)`);
  }
  const n = pieceLabels.length;
  lines.push(`anullsrc=r=${SR}:cl=stereo:d=${num(DUR)}[msil];`);
  lines.push(`[msil]${pieceLabels.join('')}amix=inputs=${n + 1}:normalize=0:duration=first:dropout_transition=0,atrim=end_sample=${NSAMP},${AF}[mbus]`);
  const out = join(WORK, 'music-bus.wav');
  ffGraph('music', lines.join('\n'), inputs, ['-map', '[mbus]', '-c:a', 'pcm_f32le', out]);
  log('musique : ' + report.join(' | '));
  return out;
}

// ---------------------------------------------------------------- 3. effets
function reverbTaps() {
  const R = CFG.reverb;
  const taps = [], decays = [];
  const jit = [0, 5, 11, 3, 14, 7, 2, 12, 6, 15, 1, 9, 13, 4, 10, 8];
  let t = R.predelay_ms;
  let k = 0;
  while (t - R.predelay_ms < R.decay_s * 1000) {
    taps.push(Math.round(t));
    decays.push(Math.pow(10, -3 * (t - R.predelay_ms) / (R.decay_s * 1000)));
    t += 18 + jit[k % jit.length];
    k++;
  }
  const e = decays.reduce((s, d) => s + d * d, 0);
  const c = 1 / Math.sqrt(e);
  return { delays: taps.join('|'), decays: decays.map((d) => num(clampN(d * c, 0.001, 1))).join('|') };
}

function sfxEvents() {
  const S = CFG.sfx;
  const evs = [];
  for (const e of DIR.sfx) {
    const f = SFXMAP[e.id];
    if (!f) throw new Error(`effet sans fichier dans map.json : ${e.id}`);
    const file = join(SFX_DIR, f);
    const info = sfxInfo(file);
    let t = res(e.at);
    const loopTo = e.loop_to ? res(e.loop_to) : null;
    let len;
    let truncated = false;
    if (loopTo !== null) len = loopTo - t;
    else {
      const cap = e.dur + S.tail_allow_s;
      len = Math.min(info.dur, cap);
      truncated = info.dur > cap + 1e-3;
    }
    const align = e.align || 'start';
    if (align === 'end') t -= len; else if (align === 'peak') t -= Math.min(info.peakT, len);
    // effets : crête à -1 dBFS ; ambiances (sons longs et soutenus) : loudness -16 LUFS
    const normDb = e.layer === 'ambience' ? S.ambience.target_lufs - info.lufs : S.peak_norm_db - info.peakDb;
    const gainDb = normDb + e.gain_db + (S.per_id_db[e.id] || 0) + (S.layer_trim_db[e.layer] || 0) + S.trim_db;
    evs.push({ ...e, file, info, t, len, loopTo, truncated, gainDb, rev: CFG.reverb.enabled && new RegExp(CFG.reverb.pattern).test(e.id), sub: new RegExp(S.sub.pattern).test(e.id) });
  }
  return evs.sort((a, b) => a.t - b.t);
}

function buildSfx(evs) {
  const S = CFG.sfx;
  const taps = reverbTaps();
  const inputs = [], lines = [];
  const labels = { amb: [], fx: [] };
  let ii = 0;
  const placed = [];
  for (const e of evs) {
    const revTail = e.rev ? 0.85 : 0;
    if (e.t + e.len + revTail <= T0 || e.t >= T1) continue;
    const isAmb = e.layer === 'ambience';
    // décalage dans l'extrait
    const skip = Math.max(0, T0 - e.t);
    const tStart = Math.max(e.t, T0);
    const len = e.len - skip;
    if (len <= 0.005) continue;
    const idx = ii++;
    const tag = `e${idx}`;
    const addIn = () => { inputs.push('-i', e.file); return inputs.length / 2 - 1; };
    let head;
    const Lf = e.info.dur;
    if (e.len > Lf + 1e-3) { // ambiances bouclées : fondu enchaîné (puissance constante) entre copies
      const xf = Math.min(S.loop_xfade_s, Lf / 3);
      const n = Math.ceil((e.len - xf) / (Lf - xf));
      let prev = null;
      for (let k = 0; k < n; k++) {
        lines.push(`[${addIn()}:a]${AF}[${tag}c${k}];`);
        if (k === 0) prev = `${tag}c0`;
        else { lines.push(`[${prev}][${tag}c${k}]acrossfade=d=${num(xf)}:c1=qsin:c2=qsin[${tag}x${k}];`); prev = `${tag}x${k}`; }
      }
      head = `[${prev}]anull`;
    } else head = `[${addIn()}:a]${AF}`;
    const f = [`atrim=start=${num(skip)}:end=${num(skip + len)}`, 'asetpts=PTS-STARTPTS'];
    if (isAmb) f.push(`highpass=f=${S.ambience.highpass_hz}`, `lowpass=f=${S.ambience.lowpass_hz}`);
    // pan : constante-puissance (loi -3 dB au centre), mono si pan != 0 ou sub
    const pan = e.pan || 0;
    if (e.sub) f.push(`lowpass=f=${S.sub.lowpass_hz}`, 'pan=stereo|c0=0.5*c0+0.5*c1|c1=0.5*c0+0.5*c1');
    if (Math.abs(pan) > 1e-6) {
      const th = (clampN(pan, -1, 1) + 1) * Math.PI / 4;
      // m = (L+R)/2 ; sortie = m * sqrt2 * cos/sin(th) (centre = gain unité, -3 dB de chaque côté du pan)
      const cl = Math.SQRT2 * Math.cos(th) * 0.5, cr = Math.SQRT2 * Math.sin(th) * 0.5;
      f.push(`pan=stereo|c0=${num(cl)}*c0+${num(cl)}*c1|c1=${num(cr)}*c0+${num(cr)}*c1`);
    }
    f.push(`volume=${num(e.gainDb)}dB`);
    const fi = skip > 0 ? 0.005 : Math.min(e.fade_in ?? S.default_fade_in_s, len / 2);
    const clipEnd = e.t + e.len > T1; // coupe due à --to
    const fo = Math.min(e.fade_out ?? (e.truncated || clipEnd ? S.trunc_fade_out_s : S.end_fade_out_s), len / 2);
    if (fi > 0) f.push(`afade=t=in:st=0:d=${num(fi)}`);
    if (fo > 0) f.push(`afade=t=out:st=${num(len - fo)}:d=${num(fo)}`);
    let tail = f.join(',');
    if (e.rev) {
      lines.push(`${head},${tail},apad=pad_dur=0.85,asplit=2[${tag}d][${tag}w];`);
      lines.push(`[${tag}w]highpass=f=${CFG.reverb.hpf_hz},aecho=in_gain=1:out_gain=1:delays=${taps.delays}:decays=${taps.decays},volume=${CFG.reverb.wet_db}dB[${tag}r];`);
      lines.push(`[${tag}d][${tag}r]amix=inputs=2:normalize=0:duration=longest,adelay=${sam(rel(tStart))}S:all=1[${tag}];`);
    } else {
      lines.push(`${head},${tail},adelay=${sam(rel(tStart))}S:all=1[${tag}];`);
    }
    labels[isAmb ? 'amb' : 'fx'].push(`[${tag}]`);
    EDGES.push({ t: rel(tStart), what: `${e.id} début`, stem: isAmb ? 'amb' : 'sfx' });
    if (!(e.rev)) EDGES.push({ t: rel(tStart + len), what: `${e.id} fin`, stem: isAmb ? 'amb' : 'sfx' });
    placed.push({ id: e.id, layer: e.layer, t: tStart, len, gainDb: e.gainDb, rev: e.rev, truncated: e.truncated });
  }
  const outs = [];
  for (const [k, name, file] of [['amb', 'abus', 'amb-bus.wav'], ['fx', 'sbus', 'sfx-bus.wav']]) {
    lines.push(`anullsrc=r=${SR}:cl=stereo:d=${num(DUR)}[${name}sil];`);
    lines.push(`[${name}sil]${labels[k].join('')}amix=inputs=${labels[k].length + 1}:normalize=0:duration=first:dropout_transition=0,atrim=end_sample=${NSAMP},${AF}[${name}]${k === 'fx' ? '' : ';'}`);
    outs.push('-map', `[${name}]`, '-c:a', 'pcm_f32le', join(WORK, file));
  }
  ffGraph('sfx', lines.join('\n'), inputs, outs);
  return { events: placed };
}

// ---------------------------------------------------------------- 4. mixage
function duck(c) {
  return `sidechaincompress=threshold=${num(db2lin(c.threshold_db))}:ratio=${c.ratio}:attack=${c.attack_ms}:release=${c.release_ms}:knee=${num(db2lin(c.knee_db))}:makeup=1:link=average:detection=rms`;
}

function buildMix(voicePath, files) {
  const Dk = CFG.ducking, Ma = CFG.master;
  const vwin = `atrim=start=${num(T0)}:end=${num(T1)},asetpts=PTS-STARTPTS,${AF}`;
  // ducking : un graphe par bus (voix en clé). Évite les blocages d'un graphe à sorties multiples.
  for (const [name, bus, cfg, out] of [['duck-music', files.music, Dk.music, 'music-duck.wav'], ['duck-amb', files.amb, Dk.ambience, 'amb-duck.wav']]) {
    // clé : voix égalisée par un compresseur rapide, pour que les mots faibles (fins de phrase) ducke aussi
    const K = Dk.key;
    const keyChain = K ? `,acompressor=threshold=${num(db2lin(K.threshold_db))}:ratio=${K.ratio}:attack=${K.attack_ms}:release=${K.release_ms}:makeup=1` : '';
    ffGraph(name, `[0:a]${vwin}${keyChain}[k];\n[1:a]${AF}[b];\n[b][k]${duck(cfg)}[o]`, ['-i', voicePath, '-i', bus], ['-map', '[o]', '-c:a', 'pcm_f32le', join(WORK, out)]);
  }
  const g = [
    `[0:a]${vwin}[v];`,
    `[1:a]${AF}[m];[2:a]${AF}[a];[3:a]${AF}[x];`,
    `[v][m][a][x]amix=inputs=4:normalize=0:duration=first:dropout_transition=0[sum];`,
    `[sum]acompressor=threshold=${num(db2lin(Ma.glue.threshold_db))}:ratio=${Ma.glue.ratio}:attack=${Ma.glue.attack_ms}:release=${Ma.glue.release_ms}:makeup=1[pre]`,
  ].join('\n');
  ffGraph('mix', g, ['-i', voicePath, '-i', join(WORK, 'music-duck.wav'), '-i', join(WORK, 'amb-duck.wav'), '-i', files.sfx], ['-map', '[pre]', '-c:a', 'pcm_f32le', join(WORK, 'premaster.wav')]);
}

// ---------------------------------------------------------------- 5. master
function master() {
  const Ma = CFG.master;
  const glued = join(WORK, 'premaster.wav');
  const pre = join(WORK, 'premaster-lim.wav');
  const wav = join(OUT, `audio-mix${SUFFIX}.wav`);
  const m4a = join(OUT, `audio-mix${SUFFIX}.m4a`);
  const ln = (tp, m) => `loudnorm=I=${Ma.lufs}:TP=${tp}:LRA=${Ma.lra}` + (m ? `:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true` : '') + ':print_format=json';
  const jsonOf = (t) => JSON.parse(t.slice(t.lastIndexOf('{'), t.lastIndexOf('}') + 1));
  // Limiteur doux avant loudnorm : son plafond est réglé pour que le gain linéaire final (vers -14 LUFS) amène la crête vraie à TP
  // (sinon loudnorm bascule en mode dynamique et déforme la dynamique).
  let ceil = Ma.limiter_db, m, q;
  for (let it = 0; it < 6; it++) {
    run(FFMPEG, ['-hide_banner', '-nostdin', '-y', '-loglevel', 'error', '-i', glued, '-af', `alimiter=limit=${num(db2lin(ceil))}:attack=5:release=60:level=0`, '-c:a', 'pcm_f32le', pre], { label: 'limiteur' });
    const r1 = run(FFMPEG, ['-hide_banner', '-nostdin', '-nostats', '-i', pre, '-af', ln(Ma.true_peak_db), '-f', 'null', '-'], { label: 'loudnorm passe 1' });
    m = jsonOf(r1.err);
    const G = Ma.lufs - parseFloat(m.input_i);
    const over = parseFloat(m.input_tp) + G - Ma.true_peak_db;
    log(`limiteur ${ceil.toFixed(2)} dBFS : I ${m.input_i} LUFS, crête ${m.input_tp} dBTP, gain linéaire requis ${G.toFixed(2)} dB, dépassement ${over.toFixed(2)} dB`);
    if (over <= -0.02 && over > -0.5) break;
    ceil -= over + 0.05;
  }
  q = { I: parseFloat(m.input_i) };
  let tp = Ma.true_peak_db, final, normType = '?';
  for (let it = 0; it < 3; it++) {
    const af = `${ln(tp, m)},aresample=${SR},aformat=sample_fmts=s32:channel_layouts=stereo,apad=whole_len=${NSAMP},atrim=end_sample=${NSAMP}`;
    const r = run(FFMPEG, ['-hide_banner', '-nostdin', '-y', '-nostats', '-i', pre, '-af', af, '-c:a', 'pcm_s24le', '-ar', String(SR), wav], { label: 'loudnorm passe 2' });
    normType = jsonOf(r.err).normalization_type;
    final = ebur(wav);
    log(`master passe 2 (${normType}) : I ${final.I.toFixed(2)} LUFS, vrai crête ${final.peak.toFixed(2)} dBTP, LRA ${final.LRA.toFixed(1)} (TP visé ${tp.toFixed(2)})`);
    if (final.peak <= Ma.true_peak_db + 0.001 && Math.abs(final.I - Ma.lufs) < 0.15) break;
    if (final.peak > Ma.true_peak_db) tp -= (final.peak - Ma.true_peak_db) + 0.05; else break;
  }
  // AAC : le codage peut dépasser de quelques dixièmes de dB ; on baisse le gain d'encodage si besoin
  let aacTrim = 0, aac;
  for (let it = 0; it < 4; it++) {
    run(FFMPEG, ['-hide_banner', '-nostdin', '-y', '-loglevel', 'error', '-i', wav, '-af', `volume=${aacTrim}dB`, '-c:a', 'aac', '-b:a', '256k', '-ar', String(SR), '-movflags', '+faststart', m4a], { label: 'aac' });
    aac = ebur(m4a);
    log(`m4a (trim ${aacTrim.toFixed(2)} dB) : I ${aac.I.toFixed(2)} LUFS, vrai crête ${aac.peak.toFixed(2)} dBTP`);
    if (aac.peak <= Ma.true_peak_db + 0.001) break;
    aacTrim -= (aac.peak - Ma.true_peak_db) + 0.05;
  }
  return { wav, m4a, final, pass1: m, normType, limiterDb: ceil, premasterI: q.I, aac, aacTrim };
}

// ---------------------------------------------------------------- 6. contrôles
const rmsDb = (a, i0, i1) => { let s = 0; for (let i = i0; i < i1; i++) s += a[i] * a[i]; return 10 * Math.log10(Math.max(s / Math.max(1, i1 - i0), 1e-14)); };
const pct = (arr, p) => { const s = [...arr].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };

function biquad(x, type, f0) {
  const w = 2 * Math.PI * f0 / SR, c = Math.cos(w), al = Math.sin(w) / (2 * Math.SQRT1_2);
  let b0, b1, b2;
  if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; } else { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
  const a0 = 1 + al, a1 = -2 * c, a2 = 1 - al;
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}
const bandpass = (x, lo, hi) => biquad(biquad(x, 'hp', lo), 'lp', hi);

function analyze(sfxPlaced, files) {
  const st = {};
  const loadMono = (path, off = 0) => {
    const { data, ch } = readWavF32(path);
    const len = Math.floor(data.length / ch);
    const m = new Float32Array(Math.max(0, Math.min(NSAMP, len - off)));
    for (let i = 0; i < m.length; i++) { let a = 0; for (let c = 0; c < ch; c++) a += data[(i + off) * ch + c]; m[i] = a / ch; }
    return m;
  };
  st.voice = loadMono(join(WORK, 'voice-proc.wav'), sam(T0));
  st.music = loadMono(join(WORK, 'music-duck.wav'));
  st.amb = loadMono(join(WORK, 'amb-duck.wav'));
  st.sfx = loadMono(join(WORK, 'sfx-bus.wav'));
  const n = Math.min(...Object.values(st).map((a) => a.length));
  const out = { words: null, curve: [], edges: [], sfxLoud: [] };
  // courbe d'énergie par tranche de 10 s
  const sl = 10 * SR;
  for (let i0 = 0; i0 < n; i0 += sl) {
    const i1 = Math.min(n, i0 + sl);
    const row = { t: T0 + i0 / SR };
    for (const k of Object.keys(st)) row[k] = rmsDb(st[k], i0, i1);
    let s = 0; for (let i = i0; i < i1; i++) { const x = st.voice[i] + st.music[i] + st.amb[i] + st.sfx[i]; s += x * x; }
    row.mix = 10 * Math.log10(Math.max(s / (i1 - i0), 1e-14));
    out.curve.push(row);
  }
  // silences de musique demandés : niveau du bus musique pendant le silence, et 0,6-1,2 s après la reprise
  out.mutes = MUTES.filter((u) => u.a >= T0 && u.b <= T1).map((u) => {
    const i0 = sam(u.a - T0), i1 = Math.min(n, sam(u.b - T0)), j0 = Math.min(n - 1, i1 + Math.round(0.6 * SR)), j1 = Math.min(n, i1 + Math.round(1.2 * SR));
    let peak = 0; for (let i = i0; i < i1; i++) peak = Math.max(peak, Math.abs(st.music[i]));
    return { ...u, peakDb: lin2db(peak), after: j1 > j0 ? rmsDb(st.music, j0, j1) : NaN };
  });
  const segs = [...SEGS].sort((x, y) => x.from - y.from);
  out.gaps = [];
  for (let k = 0; k + 1 < segs.length; k++) {
    const a = segs[k].to + 0.1, b = segs[k + 1].from - 0.05;
    if (b - a < 0.2 || a < T0 || b > T1) continue;
    let peak = 0; for (let i = sam(a - T0); i < Math.min(n, sam(b - T0)); i++) peak = Math.max(peak, Math.abs(st.music[i]));
    out.gaps.push({ from: segs[k].id, to: segs[k + 1].id, a: segs[k].to, b: segs[k + 1].from, peakDb: lin2db(peak) });
  }
  out.depth = duckingDepth(st, Math.min(...Object.values(st).map((a) => a.length)), files.music, files.amb);
  // masquage de la voix : analyse en bande de parole (150 Hz - 6 kHz) ; les sub drops ne masquent pas la voix
  for (const k of Object.keys(st)) st[k] = bandpass(st[k], 150, 6000);
  // masquage de la voix : pour chaque mot, niveau du mix (stems sommés) vs voix seule
  const words = [];
  for (const sec of timing.sections) for (const p of sec.paragraphs) for (const se of p.sentences) for (const w of se.words) {
    if (w.start < T0 || w.end > T1) continue;
    const i0 = sam(w.start - T0), i1 = Math.min(n, sam(w.end - T0));
    if (i1 - i0 < SR * 0.04) continue;
    let sv = 0, so = 0, sm = 0, smu = 0, sa = 0, sf = 0;
    for (let i = i0; i < i1; i++) {
      const v = st.voice[i], mu = st.music[i], a = st.amb[i], f = st.sfx[i];
      const o = mu + a + f;
      sv += v * v; so += o * o; sm += (v + o) * (v + o); smu += mu * mu; sa += a * a; sf += f * f;
    }
    const L = i1 - i0;
    const db = (x) => 10 * Math.log10(Math.max(x / L, 1e-14));
    const culprits = sfxPlaced.filter((e) => e.layer !== 'ambience' && e.t < w.end && e.t + e.len + (e.rev ? 0.3 : 0) > w.start).map((e) => e.id);
    words.push({ culprits, w: w.w, t: w.start, voice: db(sv), others: db(so), delta: db(sm) - db(sv), smr: db(sv) - db(so), music: db(smu), amb: db(sa), sfx: db(sf) });
  }
  out.words = words;
  // coupes : saut maximal autour de chaque bord / niveau local
  const stemOf = { music: st.music, amb: st.amb, sfx: st.sfx };
  for (const e of EDGES) {
    const x = stemOf[e.stem];
    const c = sam(e.t);
    if (c < 200 || c > n - 200) continue;
    let jump = 0;
    for (let i = c - 24; i <= c + 24; i++) jump = Math.max(jump, Math.abs(x[i] - x[i - 1]));
    let loc = 0, cnt = 0;
    for (let i = c - 1200; i < c + 1200; i += 1) { if (i < 1 || i >= n) continue; loc += Math.abs(x[i] - x[i - 1]); cnt++; }
    loc /= Math.max(cnt, 1);
    out.edges.push({ ...e, jump, ratio: loc > 1e-7 ? jump / loc : 0 });
  }
  // niveau des effets sous la voix (400 ms glissants)
  const vref = pct(words.map((w) => w.voice), 0.5); // niveau médian de la voix en parole (RMS mono dBFS)
  out.voiceRef = vref;
  for (const e of sfxPlaced) {
    if (e.layer === 'ambience') continue;
    const i0 = sam(e.t - T0), i1 = Math.min(n, sam(e.t - T0 + e.len + (e.rev ? 0.4 : 0)));
    let best = -200;
    const w = Math.round(0.4 * SR);
    for (let i = i0; i < i1; i += w / 4) best = Math.max(best, rmsDb(st.sfx, i, Math.min(n, i + w)));
    out.sfxLoud.push({ id: e.id, t: e.t, level: best, over: best - vref });
  }
  // profondeur réelle du ducking (musique et ambiance) : niveau avec ducking vs sans
  return { out, st, n };
}

function duckingDepth(st, n, musicFile, ambFile) {
  const pre = {};
  for (const [k, f] of [['music', musicFile], ['amb', ambFile]]) {
    const { data, ch } = readWavF32(f);
    const m = new Float32Array(Math.floor(data.length / ch));
    for (let i = 0; i < m.length; i++) { let a = 0; for (let c = 0; c < ch; c++) a += data[i * ch + c]; m[i] = a / ch; }
    pre[k] = m;
  }
  const res = {};
  for (const k of ['music', 'amb']) {
    const d = [];
    for (const sec of timing.sections) for (const p of sec.paragraphs) {
      const i0 = sam(p.start - T0), i1 = Math.min(n, sam(p.end - T0));
      if (i0 < 0 || i1 - i0 < SR) continue;
      let sp = 0, sd = 0;
      for (let i = i0; i < i1; i++) { sp += pre[k][i] * pre[k][i]; sd += st[k][i] * st[k][i]; }
      if (sp / (i1 - i0) > 1e-10) d.push(10 * Math.log10(Math.max(sd, 1e-14) / sp));
    }
    res[k] = d.length ? { median: pct(d, 0.5), p10: pct(d, 0.1), p90: pct(d, 0.9), n: d.length } : null;
  }
  return res;
}

// spectrogrammes et vues multi-pistes de 3 extraits
function spectrograms(wav) {
  const R = [];
  const spans = [
    { id: 'bienvenue', title: 'Bienvenue dans Zéro Vert', a: res({ s: 0, phrase: 'Ce podcast porte son nom', dt: -1 }) - 3, b: res({ s: 0, phrase: 'Zéro Vert', edge: 'end', dt: 1 }) + 7 },
    { id: 'division', title: 'Trente-six divisé par trente-sept', a: res({ s: 2, phrase: 'Bravo', dt: -3 }), b: res({ s: 2, phrase: 'centimes qui manquent', edge: 'end', dt: 3 }) },
    { id: 'revelation', title: 'La révélation des 26 noirs', a: res({ s: 4, phrase: 'L’histoire est racontée', dt: -4 }), b: res({ s: 4, phrase: 'pas de mémoire', edge: 'end', dt: 6 }) },
  ];
  for (const sp of spans) {
    const d = sp.b - sp.a;
    const png = join(WORK, `spec-${sp.id}.png`);
    run(FFMPEG, ['-hide_banner', '-nostdin', '-y', '-loglevel', 'error', '-ss', num(sp.a), '-t', num(d), '-i', wav, '-lavfi',
      `showspectrumpic=s=1600x560:mode=combined:color=intensity:scale=log:fscale=log:legend=1:stop=12000:start=40`, '-frames:v', '1', png], { label: 'spectrogramme' });
    // 4 pistes : voix / musique / ambiances / effets (stems post-ducking)
    const stems = [join(WORK, 'voice-proc.wav'), join(WORK, 'music-duck.wav'), join(WORK, 'amb-duck.wav'), join(WORK, 'sfx-bus.wav')];
    const png2 = join(WORK, `tracks-${sp.id}.png`);
    const ins = stems.flatMap((s, i) => ['-ss', num(sp.a + (i === 0 ? 0 : -T0)), '-t', num(d), '-i', s]);
    const fl = stems.map((_, i) => `[${i}:a]pan=mono|c0=0.5*c0+0.5*c1[a${i}]`).join(';') + `;[a0][a1][a2][a3]amerge=inputs=4,showwavespic=s=1600x640:split_channels=1:colors=0x44ff44|0x4488ff|0xffaa22|0xff4488:scale=log:draw=full[o]`;
    run(FFMPEG, ['-hide_banner', '-nostdin', '-y', '-loglevel', 'error', ...ins, '-filter_complex', fl, '-map', '[o]', '-frames:v', '1', png2], { label: 'pistes' });
    R.push({ ...sp, png, png2 });
  }
  return R;
}

// ---------------------------------------------------------------- rapport
function writeReport({ masterRes, an, depth, evs, specs, timingInfo, aacInfo }) {
  const { out } = an;
  const L = [];
  const f1 = (x) => (Number.isFinite(x) ? x.toFixed(1) : '—');
  L.push('# Rapport de mixage — Zéro Vert, épisode 1', '');
  L.push(`Généré par \`tools/video/sound/mix.mjs\` (${new Date().toISOString().slice(0, 16).replace('T', ' ')}), réglages dans \`tools/video/sound/mix-config.json\`.`, '');
  L.push('## Mesures finales (ffmpeg ebur128, vrai crête sur-échantillonnée)', '');
  const fn = masterRes ? masterRes.final : { I: NaN, peak: NaN, LRA: NaN };
  L.push('| mesure | valeur | cible |', '|---|---|---|');
  L.push(`| Loudness intégrée | ${fn.I.toFixed(2)} LUFS | −14 |`);
  L.push(`| Vrai crête | ${fn.peak.toFixed(2)} dBTP | ≤ −1 |`);
  L.push(`| Plage de loudness (LRA) | ${fn.LRA.toFixed(1)} LU | — |`);
  L.push(`| Rapport crête / loudness (PLR) | ${(fn.peak - fn.I).toFixed(1)} dB | — |`);
  if (aacInfo) L.push(`| m4a (AAC 256 kb/s) | ${aacInfo.I.toFixed(2)} LUFS, vrai crête ${aacInfo.peak.toFixed(2)} dBTP | — |`);
  if (timingInfo) { L.push(`| Durée | ${timingInfo.dur} s (${timingInfo.samples} échantillons) | ${TOTAL} s |`); L.push(`| Temps de calcul | ${timingInfo.elapsed} s | < 180 s |`); }
  L.push('');
  if (masterRes) L.push(`Chaîne master : bus sommé (${masterRes.premasterI.toFixed(2)} LUFS après limiteur à ${masterRes.limiterDb.toFixed(2)} dBFS) -> loudnorm deux passes en mode **${masterRes.normType}** (passe 1 : ${masterRes.pass1.input_i} LUFS, ${masterRes.pass1.input_tp} dBTP, LRA ${masterRes.pass1.input_lra}). Encodage AAC avec trim ${masterRes.aacTrim.toFixed(2)} dB pour tenir le vrai crête.`, '');

  L.push('## Voix non masquée (aux instants de parole)', '');
  const W = out.words;
  const deltas = W.map((w) => w.delta), smrs = W.map((w) => w.smr);
  L.push(`${W.length} mots analysés. Écart « mix − voix seule » pendant chaque mot (stems post-ducking, avant gain master) : médiane **${pct(deltas, 0.5).toFixed(2)} dB**, 95e centile ${pct(deltas, 0.95).toFixed(2)} dB, max ${Math.max(...deltas).toFixed(2)} dB. Rapport voix / reste (SMR) : médiane ${pct(smrs, 0.5).toFixed(1)} dB, 5e centile ${pct(smrs, 0.05).toFixed(1)} dB, min ${Math.min(...smrs).toFixed(1)} dB.`);
  const n1 = W.filter((w) => w.delta > 1).length, n2 = W.filter((w) => w.delta > 2).length, n3 = W.filter((w) => w.smr < 6).length;
  L.push(`Mots où le mix dépasse la voix de plus de 1 dB : ${n1} (${(100 * n1 / W.length).toFixed(1)} %), de plus de 2 dB : ${n2} ; mots avec SMR < 6 dB : ${n3}.`, '');
  L.push('Quatorze mots les moins bien dégagés (bande 150 Hz – 6 kHz) :', '', '| t | mot | voix (dBFS) | musique | ambiance | effets | SMR (dB) | effets présents |', '|---|---|---|---|---|---|---|---|');
  for (const w of [...W].sort((a, b) => a.smr - b.smr).slice(0, 14)) L.push(`| ${mmss(w.t)} | ${w.w} | ${f1(w.voice)} | ${f1(w.music)} | ${f1(w.amb)} | ${f1(w.sfx)} | ${f1(w.smr)} | ${w.culprits.join(', ')} |`);
  L.push('');
  L.push('Ducking réel (niveau des bus après / avant sidechain, paragraphes parlés) :');
  for (const [k, lab] of [['music', 'musique'], ['amb', 'ambiances']]) {
    const d = depth[k];
    L.push(`- ${lab} : ${d ? `médiane ${d.median.toFixed(1)} dB (10e–90e centile ${d.p10.toFixed(1)} / ${d.p90.toFixed(1)}), ${d.n} paragraphes` : 'aucune donnée'}`);
  }
  L.push('');

  if (out.mutes && out.mutes.length) {
    L.push('Silences de musique demandés par la direction (niveau crête du bus musique pendant le silence ; niveau 0,6–1,2 s après la reprise) :', '', '| segment | de | à | crête pendant (dBFS) | après reprise (dBFS RMS) |', '|---|---|---|---|---|');
    for (const u of out.mutes) L.push(`| ${u.id} | ${mmss(u.a)} | ${mmss(u.b)} | ${u.peakDb < -120 ? '−∞ (silence)' : f1(u.peakDb)} | ${f1(u.after)} |`);
    L.push('');
  }
  if (out.gaps && out.gaps.length) {
    L.push('Silences entre segments musicaux (arrêts nets, ex. avant « la bille n’a pas de mémoire ») :', '', '| fin de | début de | de | à | crête (dBFS) |', '|---|---|---|---|---|');
    for (const g of out.gaps) L.push(`| ${g.from} | ${g.to} | ${mmss(g.a)} | ${mmss(g.b)} | ${g.peakDb < -120 ? '−∞ (silence)' : f1(g.peakDb)} |`);
    L.push('');
  }
  L.push('## Courbe d’énergie par tranche de 10 s (RMS mono en dBFS, stems post-ducking)', '');
  L.push('| tranche | voix | musique | ambiances | effets | mix | musique − voix |', '|---|---|---|---|---|---|---|');
  const lv = (x) => (x < -100 ? 'silence' : f1(x));
  for (const r of out.curve) L.push(`| ${mmss(r.t)} | ${lv(r.voice)} | ${lv(r.music)} | ${lv(r.amb)} | ${lv(r.sfx)} | ${lv(r.mix)} | ${r.voice < -100 ? '—' : f1(r.music - r.voice)} |`);
  L.push('', '(« silence » : en dessous de −100 dBFS.)', '');

  L.push('## Effets', '');
  const ov = [...out.sfxLoud].sort((a, b) => b.over - a.over);
  L.push(`Niveau médian de la voix en parole : ${out.voiceRef.toFixed(1)} dBFS (RMS mono). Effets les plus forts par rapport à la voix (RMS 400 ms) :`, '', '| effet | t | niveau (dBFS) | vs voix (dB) |', '|---|---|---|---|');
  for (const e of ov.slice(0, 8)) L.push(`| ${e.id} | ${mmss(e.t)} | ${f1(e.level)} | ${e.over >= 0 ? '+' : ''}${f1(e.over)} |`);
  L.push('', `${evs.length} effets/ambiances placés ; réverbération sur ${evs.filter((e) => e.rev).length} impacts.`, '');

  L.push('## Coupes et clics', '');
  const bad = out.edges.filter((e) => e.ratio > 8 && e.jump > 0.002).sort((a, b) => b.ratio - a.ratio);
  L.push(`${out.edges.length} bords contrôlés (début/fin de parties de musique, d'effets, d'ambiances) : saut maximal sur ±0,5 ms comparé au saut moyen local. ${bad.length} bord(s) au-dessus d'un rapport de 8.`);
  if (bad.length) { L.push('', '| t | bord | rapport | saut |', '|---|---|---|---|'); for (const e of bad.slice(0, 12)) L.push(`| ${mmss(e.t + T0)} | ${e.what} | ${e.ratio.toFixed(1)} | ${e.jump.toFixed(4)} |`); }
  L.push('');
  if (specs && specs.length) {
    L.push('## Spectrogrammes et pistes (extraits clés)', '');
    for (const s of specs) L.push(`- **${s.title}** (${mmss(s.a)} → ${mmss(s.b)}) : \`${s.png.replace(ROOT + '/', '')}\` (spectrogramme du mix), \`${s.png2.replace(ROOT + '/', '')}\` (4 pistes : voix, musique, ambiances, effets)`);
    L.push('');
  }
  writeFileSync(join(DATA, `mix-report${SUFFIX}.md`), L.join('\n') + '\n');
  return L;
}

// ---------------------------------------------------------------- main
(function main() {
  log(`mixage ${FULL ? 'complet' : `extrait ${T0.toFixed(2)}→${T1.toFixed(2)} s`}${NO_SFX ? ' [sans effets]' : ''}${NO_MUSIC ? ' [sans musique]' : ''} — durée ${DUR.toFixed(2)} s`);
  const voicePath = buildVoice();
  let evs = sfxEvents();
  const silent = (name) => {
    const p = join(WORK, name);
    run(FFMPEG, ['-hide_banner', '-nostdin', '-y', '-loglevel', 'error', '-f', 'lavfi', '-i', `anullsrc=r=${SR}:cl=stereo`, '-af', `atrim=end_sample=${NSAMP}`, '-c:a', 'pcm_f32le', p]);
    return p;
  };
  const musicPath = NO_MUSIC ? silent('music-bus.wav') : buildMusic();
  let placed = [];
  if (NO_SFX) { silent('amb-bus.wav'); silent('sfx-bus.wav'); evs = []; }
  else placed = buildSfx(evs).events;
  buildMix(voicePath, { music: musicPath, amb: join(WORK, 'amb-bus.wav'), sfx: join(WORK, 'sfx-bus.wav') });
  const masterRes = TUNE ? null : master();
  const elapsed = ((Date.now() - T_START) / 1000);
  if (TUNE) {
    const an = analyze(placed, { music: join(WORK, 'music-bus.wav'), amb: join(WORK, 'amb-bus.wav') });
    const L = writeReport({ masterRes: null, an, depth: an.out.depth, evs: placed, specs: null, timingInfo: null, aacInfo: null });
    log(`rapport de réglage : output/video/data/mix-report${SUFFIX}.md`);
    console.log(L.filter((l) => /^\| \d:\d\d\.\d \| \S+ \| -?[\d.]+ \|/.test(l) || /^(Mots|1409|\d+ mots|- )/.test(l)).slice(0, 40).join('\n'));
    return;
  }
  // durée exacte
  const pr = run(join(dirname(FFMPEG), 'ffprobe'), ['-v', 'error', '-show_entries', 'stream=duration,duration_ts,sample_rate,channels,bits_per_raw_sample,codec_name:format=duration', '-of', 'default=nw=1', masterRes.wav]).out.toString();
  const pr2 = run(join(dirname(FFMPEG), 'ffprobe'), ['-v', 'error', '-show_entries', 'format=duration:stream=codec_name,sample_rate,channels,bit_rate', '-of', 'default=nw=1', masterRes.m4a]).out.toString();
  const dts = +/duration_ts=(\d+)/.exec(pr)[1];
  log(`WAV : ${pr.replace(/\n/g, ' ')}`);
  log(`M4A : ${pr2.replace(/\n/g, ' ')}`);
  writeFileSync(CACHE_PATH, JSON.stringify(CACHE));
  if (NO_REPORT) { log('terminé (sans rapport)'); return; }
  const an = analyze(placed, { music: join(WORK, 'music-bus.wav'), amb: join(WORK, 'amb-bus.wav') });
  const depth = an.out.depth;
  let specs = null;
  if (!NO_SPEC && FULL) specs = spectrograms(masterRes.wav);
  const aac = masterRes.aac;
  const L = writeReport({ masterRes, an, depth, evs: placed, specs, timingInfo: { dur: (dts / SR).toFixed(3), samples: dts, elapsed: elapsed.toFixed(0) }, aacInfo: aac });
  log(`rapport : output/video/data/mix-report${SUFFIX}.md (${L.length} lignes)`);
  console.log(L.slice(2, 30).join('\n'));
  log('terminé');
})();
