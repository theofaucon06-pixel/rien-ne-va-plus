#!/usr/bin/env python3
"""Zéro Vert — étape « Alignement » du pipeline vidéo (voir tools/video/SPEC.md).

À partir des six prises output/video/assets/vo/s1..s6.mp3 et du script de l'épisode
(js/podcast-data.js, slug « la-bille-n-a-pas-de-memoire ») :
  1. transcrit chaque prise en local (faster-whisper, mots horodatés) — résultat mis en cache ;
  2. aligne la transcription sur les mots connus du script (SequenceMatcher sur mots normalisés),
     interpole les mots non appariés, répartit les nombres écrits en chiffres sur leurs mots lus ;
  3. découpe chaque prise aux frontières de paragraphes (milieu du silence) et ré-assemble avec ffmpeg
     (LEAD_IN / gaps / TAIL), gain simple à ~ -3 dBFS de crête ;
  4. écrit output/video/data/voice.wav, output/video/data/timing.json et un rapport d'appariement.

Relance de bout en bout, une commande :
    python3 tools/video/align.py            (utilise le cache de transcription)
    python3 tools/video/align.py --force    (retranscrit tout)
Le script se relance tout seul dans le venv Python (faster-whisper, numpy) : ZV_VENV=<dossier> ou
~/.cache/zero-vert/venv (créé et installé automatiquement s'il manque).
"""
import os
import sys

# --------------------------------------------------------------------------------------------
# Constantes configurables
# --------------------------------------------------------------------------------------------
LEAD_IN = 2.2          # s avant le premier mot
GAP_PARAGRAPH = float(os.environ.get('ZV_PARA_GAP', '0.9'))  # s entre le dernier mot d'un paragraphe et le premier du suivant (ZV_PARA_GAP : épisodes débat plus nerveux, ex. 0.5)
GAP_SECTION = 3.2      # s entre le dernier mot d'une section et le premier de la suivante
TAIL = 14.0            # s après le dernier mot (carte de fin)
EDGE_PAD = 0.12        # s de silence naturel conservé en tête/queue de chaque morceau avant insertion
TARGET_PEAK_DB = -3.0  # crête cible de la voix (simple gain, pas de compression)
SAMPLE_RATE = 48000
WHISPER_MODEL = 'medium'   # 'small' (plus rapide) ou 'medium'
WHISPER_LANG = 'fr'
VOICED_REL_DB = 38.0   # un trame de 10 ms est « voisée » si son RMS > (percentile 95 des trames - cette valeur)
VOICED_FLOOR_DB = -62.0  # ... mais jamais sous ce plancher absolu (dBFS)
FUZZY_MIN_RATIO = 0.5  # similarité minimale pour apparier deux mots différents de même rang
MIN_WORD = 0.06        # s : durée minimale d'un mot (les horodatages Whisper en écrasent parfois)
DOUBT_RUN = 3          # une zone est douteuse si > DOUBT_RUN mots consécutifs sont interpolés
EPISODE_SLUG = os.environ.get('ZV_SLUG', 'la-bille-n-a-pas-de-memoire')
EP_DIR = os.environ.get('ZV_EP', '')  # ex. « ep2 » : tout va dans output/video/ep2/ (vide = épisode 1)

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
VO_DIR = os.path.join(ROOT, 'output', 'video', EP_DIR, 'assets', 'vo')
DATA_DIR = os.path.join(ROOT, 'output', 'video', EP_DIR, 'data')
WORK_DIR = os.path.join(ROOT, 'output', 'video', EP_DIR, 'work', 'align')
FFMPEG = os.environ.get('FFMPEG', os.path.expanduser('~/.local/ffmpeg-6.0/ffmpeg'))
NODE = os.environ.get('NODE', os.path.expanduser('~/.local/node-v26.13.0/bin/node'))
VENV_DIR = os.environ.get('ZV_VENV', os.path.expanduser('~/.cache/zero-vert/venv'))


def ensure_env():
    """Se relance dans le venv si numpy / faster-whisper manquent."""
    try:
        import numpy  # noqa: F401
        import faster_whisper  # noqa: F401
        return
    except ImportError:
        pass
    if os.environ.get('ZV_REEXEC'):
        sys.exit('Dépendances manquantes (numpy, faster-whisper) même dans le venv ' + VENV_DIR)
    import subprocess
    py = os.path.join(VENV_DIR, 'bin', 'python')
    if not os.path.exists(py):
        print('Création du venv', VENV_DIR, flush=True)
        subprocess.check_call([sys.executable, '-m', 'venv', VENV_DIR])
        subprocess.check_call([py, '-m', 'pip', 'install', '-q', 'faster-whisper', 'numpy'])
    os.environ['ZV_REEXEC'] = '1'
    os.execv(py, [py] + sys.argv)


ensure_env()

import json  # noqa: E402
import math  # noqa: E402
import re  # noqa: E402
import subprocess  # noqa: E402
import time  # noqa: E402
import unicodedata  # noqa: E402
from difflib import SequenceMatcher  # noqa: E402

import numpy as np  # noqa: E402

# --------------------------------------------------------------------------------------------
# Texte : normalisation, nombres en toutes lettres
# --------------------------------------------------------------------------------------------
UNITS = ['zero', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze',
         'treize', 'quatorze', 'quinze', 'seize', 'dix sept', 'dix huit', 'dix neuf']
TENS = {20: 'vingt', 30: 'trente', 40: 'quarante', 50: 'cinquante', 60: 'soixante'}


def _below_100(n):
    if n < 20:
        return UNITS[n]
    if n < 70:
        t, u = (n // 10) * 10, n % 10
        if u == 0:
            return TENS[t]
        return TENS[t] + (' et un' if u == 1 else ' ' + UNITS[u])
    if n < 80:
        return 'soixante' + (' et ' if n == 71 else ' ') + _below_100(n - 60)
    if n == 80:
        return 'quatre vingt'
    return 'quatre vingt ' + _below_100(n - 80)


def int_words(n):
    """Entier < 1 000 000 en français (sans traits d'union : les mots sont séparés par des espaces)."""
    if n < 100:
        return _below_100(n)
    if n < 1000:
        h, r = divmod(n, 100)
        s = 'cent' if h == 1 else UNITS[h] + ' cent'
        return s + (' ' + _below_100(r) if r else '')
    th, r = divmod(n, 1000)
    s = 'mille' if th == 1 else int_words(th) + ' mille'
    return s + (' ' + int_words(r) if r else '')


def number_words(txt):
    m = re.fullmatch(r'(\d{1,6})(?:[.,](\d{1,3}))?', txt)
    if not m:
        return None
    out = int_words(int(m.group(1)))
    if m.group(2):
        out += ' virgule ' + int_words(int(m.group(2)))
    return out.split()


def strip_accents(s):
    s = s.replace('œ', 'oe').replace('Œ', 'OE').replace('æ', 'ae')
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')


def norm_tokens(word):
    """Mot du script ou de Whisper -> liste de jetons normalisés (sans casse/accents/ponctuation ;
    tirets et apostrophes = séparateurs ; nombres en chiffres -> mots)."""
    w = word.strip()
    m = re.match(r'^(.*?)(%|€)[^\w]*$', w)
    if m:
        return (norm_tokens(m.group(1)) if m.group(1) else []) + (['pour', 'cent'] if m.group(2) == '%' else ['euros'])
    core = re.sub(r'^[^\w]+|[^\w]+$', '', w)
    num = number_words(core)
    if num:
        return num
    w = strip_accents(w).lower()
    w = re.sub(r"[’'`´\-‐‑–—_]", ' ', w)   # élisions et traits d'union = séparateurs
    w = re.sub(r'[^a-z0-9 ]', '', w)
    return w.split()


# --------------------------------------------------------------------------------------------
# Script
# --------------------------------------------------------------------------------------------
def load_script():
    os.makedirs(WORK_DIR, exist_ok=True)
    js = ("import('" + os.path.join(ROOT, 'js', 'podcast-data.js') + "').then(m=>{const e=m.EPISODES.find(e=>e.slug==='"
          + EPISODE_SLUG + "');console.log(JSON.stringify(e.sections.map(s=>({h:s.h,p:s.p}))));})")
    node = NODE if os.path.exists(NODE) else 'node'
    out = subprocess.check_output([node, '-e', js], cwd=ROOT)
    sections = json.loads(out)
    SENT_END = re.compile(r'[.!?…]+[»”"\')\]]*$')
    result = []
    for si, sec in enumerate(sections):
        paras = []
        for pi, text in enumerate(sec['p']):
            toks = []
            for t in text.split():
                if re.search(r'[\w]', t):
                    toks.append(t)
                elif toks:                       # ponctuation isolée (« ? », « : », « — ») : collée au mot précédent
                    toks[-1] += '\u00a0' + t
            words = []
            sentences = []
            cur = []
            for t in toks:
                wd = {'w': t, 'toks': norm_tokens(t)}
                if not wd['toks']:
                    continue
                words.append(wd)
                cur.append(wd)
                if SENT_END.search(t):
                    sentences.append(cur)
                    cur = []
            if cur:
                sentences.append(cur)
            paras.append({'index': pi, 'text': text, 'words': words, 'sentences': sentences})
        result.append({'index': si, 'h': sec['h'], 'paragraphs': paras})
    return result


# --------------------------------------------------------------------------------------------
# Audio : décodage, énergie, transcription
# --------------------------------------------------------------------------------------------
def decode_take(i):
    """mp3 -> wav 48 kHz mono float32 (fichier de travail) + tableau numpy."""
    os.makedirs(WORK_DIR, exist_ok=True)
    src = os.path.join(VO_DIR, 's%d.mp3' % (i + 1))
    dst = os.path.join(WORK_DIR, 'take%d.wav' % (i + 1))
    if not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src):
        subprocess.check_call([FFMPEG, '-v', 'error', '-y', '-i', src, '-ac', '1', '-ar', str(SAMPLE_RATE),
                               '-c:a', 'pcm_f32le', dst])
    raw = subprocess.check_output([FFMPEG, '-v', 'error', '-i', dst, '-f', 'f32le', '-ac', '1', '-'])
    return dst, np.frombuffer(raw, dtype='<f4').astype(np.float64)


def frame_db(x):
    hop = SAMPLE_RATE // 100
    n = len(x) // hop
    fr = x[:n * hop].reshape(n, hop)
    rms = np.sqrt((fr ** 2).mean(axis=1))
    return 20 * np.log10(np.maximum(rms, 1e-9)), hop


def transcribe_take(i, force):
    cache = os.path.join(WORK_DIR, 'whisper-%s-s%d.json' % (WHISPER_MODEL, i + 1))
    src = os.path.join(VO_DIR, 's%d.mp3' % (i + 1))
    if not force and os.path.exists(cache) and os.path.getmtime(cache) > os.path.getmtime(src):
        return json.load(open(cache))
    from faster_whisper import WhisperModel
    global _MODEL
    if '_MODEL' not in globals() or _MODEL is None:
        _MODEL = WhisperModel(WHISPER_MODEL, device='cpu', compute_type='int8', cpu_threads=os.cpu_count() or 4)
    segs, _info = _MODEL.transcribe(src, language=WHISPER_LANG, word_timestamps=True, beam_size=5,
                                    condition_on_previous_text=False, vad_filter=False,
                                    initial_prompt='Zéro Vert, Charles Wells, Monte-Carlo, roulette.')
    words = []
    for sg in segs:
        for w in sg.words or []:
            words.append({'w': w.word.strip(), 'start': float(w.start), 'end': float(w.end), 'p': float(w.probability)})
    json.dump(words, open(cache, 'w'), ensure_ascii=False)
    return words


_MODEL = None


# --------------------------------------------------------------------------------------------
# Alignement script <-> transcription (au niveau des jetons normalisés)
# --------------------------------------------------------------------------------------------
def natural_dur(tok):
    return 0.045 * len(tok) + 0.06


def spread(tokens, t0, t1):
    """Répartit les jetons non appariés dans [t0, t1] : proportionnel à la longueur, mais jamais plus de
    2x la durée « naturelle » (le surplus devient du silence réparti de part et d'autre)."""
    nat = [natural_dur(t) for t in tokens]
    span = max(t1 - t0, 0.0)
    total_nat = sum(nat)
    if span <= 0:
        return [(t0, t0)] * len(tokens)
    scale = min(span / total_nat, 2.0)
    used = total_nat * scale
    t = t0 + (span - used) / 2.0
    out = []
    for d in nat:
        out.append((t, t + d * scale))
        t += d * scale
    return out


def align_section(script_sec, whisper_words, audio_len):
    """Retourne (tokens_script, stats). Chaque jeton script : dict(word=(pi,wi), tok, start, end, how)."""
    # jetons script
    S = []
    for p in script_sec['paragraphs']:
        for wi, wd in enumerate(p['words']):
            for tk in wd['toks']:
                S.append({'pi': p['index'], 'wi': wi, 'tok': tk})
    # Whisper sépare parfois « 10 000 » ou « 2 ,7 » : on recolle les morceaux numériques
    merged = []
    for ww in whisper_words:
        ww = dict(ww)
        if merged:
            pv = merged[-1]
            pcore = re.sub(r'[^\w,.]+$', '', pv['w'])
            if (re.fullmatch(r'[.,]\d+%?', ww['w']) and re.search(r'\d$', pcore)) or (
                    re.fullmatch(r'\d{3}%?', ww['w']) and re.fullmatch(r'\d{1,3}', pcore)):
                pv['w'] = pcore + ww['w']
                pv['end'] = ww['end']
                continue
        merged.append(ww)
    whisper_words = merged
    # jetons whisper (un mot Whisper peut donner plusieurs jetons : durée répartie par nb de caractères)
    W = []
    for ww in whisper_words:
        tks = norm_tokens(ww['w'])
        if not tks:
            continue
        tot = sum(len(t) for t in tks)
        t = ww['start']
        for tk in tks:
            d = (ww['end'] - ww['start']) * len(tk) / tot
            W.append({'tok': tk, 'start': t, 'end': t + d})
            t += d
    sm = SequenceMatcher(None, [s['tok'] for s in S], [w['tok'] for w in W], autojunk=False)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'equal':
            for k in range(i2 - i1):
                S[i1 + k].update(start=W[j1 + k]['start'], end=W[j1 + k]['end'], how='exact')
        elif tag == 'replace' and (i2 - i1) == (j2 - j1) and all(
                SequenceMatcher(None, S[i1 + k]['tok'], W[j1 + k]['tok']).ratio() >= FUZZY_MIN_RATIO
                for k in range(i2 - i1)):
            for k in range(i2 - i1):
                S[i1 + k].update(start=W[j1 + k]['start'], end=W[j1 + k]['end'], how='fuzzy')
        elif tag in ('replace', 'delete') and i2 > i1:
            if tag == 'replace' and j2 > j1:
                t0, t1 = W[j1]['start'], W[j2 - 1]['end']
            else:
                t0 = W[j1 - 1]['end'] if j1 > 0 else 0.0
                t1 = W[j1]['start'] if j1 < len(W) else audio_len
            for s, (a, b) in zip(S[i1:i2], spread([s['tok'] for s in S[i1:i2]], t0, t1)):
                s.update(start=a, end=b, how='interp')
    return S, W


# --------------------------------------------------------------------------------------------
# Programme principal
# --------------------------------------------------------------------------------------------
def build_words(S, paragraph):
    """Jetons -> mots du script d'un paragraphe (start/end bruts + méthode)."""
    out = []
    for wi, wd in enumerate(paragraph['words']):
        toks = [s for s in S if s['pi'] == paragraph['index'] and s['wi'] == wi]
        out.append({'w': wd['w'], 'start': min(t['start'] for t in toks), 'end': max(t['end'] for t in toks),
                    'how': ('interp' if all(t['how'] == 'interp' for t in toks) else
                            'fuzzy' if any(t['how'] == 'fuzzy' for t in toks) else 'exact'),
                    'partial': any(t['how'] == 'interp' for t in toks) and not all(t['how'] == 'interp' for t in toks)})
    return out


def main():
    force = '--force' in sys.argv
    t_start = time.time()
    os.makedirs(WORK_DIR, exist_ok=True)
    os.makedirs(DATA_DIR, exist_ok=True)
    script = load_script()
    n_words = sum(len(p['words']) for s in script for p in s['paragraphs'])
    print('Script : %d sections, %d paragraphes, %d mots' % (
        len(script), sum(len(s['paragraphs']) for s in script), n_words), flush=True)

    takes = []   # par section : dict(path, audio, db, hop, thr, paragraphs=[{words, vs, ve, cut_prev, cut_next}])
    report = {'sections': [], 'doubtful': []}
    for si, sec in enumerate(script):
        path, audio = decode_take(si)
        dur = len(audio) / SAMPLE_RATE
        t0 = time.time()
        wwords = transcribe_take(si, force)
        S, W = align_section(sec, wwords, dur)
        db, hop = frame_db(audio)
        thr = max(VOICED_FLOOR_DB, float(np.percentile(db, 95)) - VOICED_REL_DB)
        voiced = db > thr
        fr_t = lambda f: f * hop / SAMPLE_RATE   # noqa: E731

        paras = []
        for p in sec['paragraphs']:
            words = build_words(S, p)
            paras.append({'src': p, 'words': words})

        # frontières : milieu du plus long silence situé entre deux paragraphes
        for k, pr in enumerate(paras):
            pr['first_start'] = pr['words'][0]['start']
            pr['last_end'] = pr['words'][-1]['end']
        cuts = [0.0]
        for k in range(len(paras) - 1):
            a, b = paras[k]['last_end'], paras[k + 1]['first_start']
            lo, hi = int(max(a - 0.25, 0) * 100), min(int((b + 0.25) * 100) + 1, len(voiced))
            best, run_s = (0, None), None
            for f in range(lo, hi + 1):
                sil = f < hi and not voiced[f]
                if sil and run_s is None:
                    run_s = f
                if not sil and run_s is not None:
                    if f - run_s > best[0]:
                        best = (f - run_s, run_s)
                    run_s = None
            if best[0] >= 8:
                cuts.append(fr_t(best[1] + best[0] / 2.0))
            else:
                cuts.append((a + b) / 2.0)
        cuts.append(dur)

        for k, pr in enumerate(paras):
            c0, c1 = cuts[k], cuts[k + 1]
            # début / fin voisés réels (les horodatages Whisper débordent souvent dans le silence)
            f0 = int(c0 * 100)
            f1 = min(int(c1 * 100), len(voiced))
            idx = np.nonzero(voiced[f0:f1])[0]
            vs = fr_t(f0 + idx[0]) if len(idx) else pr['first_start']
            ve = fr_t(f0 + idx[-1] + 1) if len(idx) else pr['last_end']
            # on borne l'écart par rapport à Whisper pour ne pas coller à un bruit isolé
            vs = max(vs, pr['first_start'] - 0.3) if vs < pr['first_start'] else min(vs, pr['first_start'] + 0.3)
            ve = min(ve, pr['last_end'] + 0.3) if ve > pr['last_end'] else max(ve, pr['last_end'] - 0.3)
            vs, ve = max(vs, c0), min(ve, c1)
            pr.update(vs=vs, ve=ve, c0=c0, c1=c1)
            w = pr['words']
            w[0]['start'] = vs
            w[-1]['end'] = ve
            # bornage + monotonie
            for x in w:
                x['start'] = min(max(x['start'], vs), ve)
                x['end'] = min(max(x['end'], x['start']), ve)
            for a, b in zip(w, w[1:]):
                if b['start'] < a['end']:
                    m = (b['start'] + a['end']) / 2.0
                    a['end'], b['start'] = m, m
                if b['end'] < b['start']:
                    b['end'] = b['start']
            for a, b in zip(w, w[1:]):    # durée minimale : on grignote d'abord le trou, puis le mot suivant
                need = MIN_WORD - (a['end'] - a['start'])
                if need > 0:
                    take_gap = min(need, b['start'] - a['end'])
                    a['end'] += take_gap
                    need -= take_gap
                    if need > 0 and (b['end'] - b['start']) - need >= MIN_WORD:
                        a['end'] += need
                        b['start'] += need

        # statistiques
        allw = [x for pr in paras for x in pr['words']]
        n = len(allw)
        ex = sum(1 for x in allw if x['how'] == 'exact')
        fz = sum(1 for x in allw if x['how'] == 'fuzzy')
        ip = sum(1 for x in allw if x['how'] == 'interp')
        toks_total = len(S)
        toks_ex = sum(1 for s in S if s['how'] == 'exact')
        toks_fz = sum(1 for s in S if s['how'] == 'fuzzy')
        # zones douteuses : suites de mots interpolés
        run = []
        for pr in paras:
            for x in pr['words']:
                if x['how'] == 'interp':
                    run.append((pr['src']['index'], x))
                else:
                    if len(run) > DOUBT_RUN:
                        report['doubtful'].append((si, run))
                    run = []
            if len(run) > DOUBT_RUN:
                report['doubtful'].append((si, run))
            run = []
        report['sections'].append({'section': si, 'words': n, 'exact': ex, 'fuzzy': fz, 'interpolated': ip,
                                   'exact_pct': round(100.0 * ex / n, 1), 'matched_pct': round(100.0 * (ex + fz) / n, 1),
                                   'tokens': toks_total, 'tokens_exact_pct': round(100.0 * toks_ex / toks_total, 1),
                                   'tokens_matched_pct': round(100.0 * (toks_ex + toks_fz) / toks_total, 1),
                                   'whisper_words': len(wwords), 'duration': round(dur, 2),
                                   'interpolated_words': [x['w'] for x in allw if x['how'] == 'interp']})
        print('S%d : %d mots, exacts %.1f %%, exacts+approchés %.1f %%, interpolés %d (%.1fs, whisper %d mots, %.0fs)' % (
            si + 1, n, 100.0 * ex / n, 100.0 * (ex + fz) / n, ip, dur, len(wwords), time.time() - t0), flush=True)
        takes.append({'path': path, 'audio': audio, 'paras': paras, 'sec': sec})

    # ---------------- assemblage : plan en échantillons ----------------
    sr = SAMPLE_RATE
    to_s = lambda t: int(round(t * sr))   # noqa: E731
    pieces = []        # ('take', take_idx, a, b) | ('sil', n)
    cursor = 0         # position de sortie (échantillons)
    out_sections = []
    prev_tail = None   # échantillons de queue conservés du morceau précédent
    prev_gap = None
    first = True
    for si, tk in enumerate(takes):
        sec_paras = []
        for k, pr in enumerate(tk['paras']):
            a = to_s(max(pr['c0'], pr['vs'] - EDGE_PAD))
            b = to_s(min(pr['c1'], pr['ve'] + EDGE_PAD))
            b = min(b, len(tk['audio']))
            head = to_s(pr['vs']) - a
            tail = b - to_s(pr['ve'])
            gap = LEAD_IN if first else (GAP_SECTION if k == 0 else GAP_PARAGRAPH)
            sil = to_s(gap) - head - (0 if first else prev_tail)
            if sil < 0:
                print('! silence négatif %d éch. (S%d P%d), clampé à 0' % (sil, si + 1, k))
                sil = 0
            if sil:
                pieces.append(('sil', sil))
                cursor += sil
            pieces.append(('take', si, a, b))
            out0 = cursor
            cursor += b - a
            prev_tail = tail
            first = False
            # mots -> temps de sortie
            conv = lambda t, a=a, out0=out0: (out0 + (to_s(t) - a)) / sr   # noqa: E731
            pr['conv'] = conv
        # (les temps de sortie sont calculés plus bas)
    pieces.append(('sil', to_s(TAIL) - prev_tail))
    cursor += to_s(TAIL) - prev_tail
    total_samples = cursor

    # filtre ffmpeg
    inputs = []
    for si, tk in enumerate(takes):
        inputs += ['-i', tk['path']]
    chains, labels = [], []
    for n_, pc in enumerate(pieces):
        if pc[0] == 'take':
            _, si, a, b = pc
            chains.append('[%d:a]atrim=start_sample=%d:end_sample=%d,asetpts=PTS-STARTPTS,afade=t=in:d=0.002,'
                          'afade=t=out:st=%.6f:d=0.002[p%d]' % (si, a, b, (b - a) / sr - 0.002, n_))
        else:
            chains.append('anullsrc=r=%d:cl=mono,atrim=end_sample=%d,asetpts=PTS-STARTPTS[p%d]' % (sr, pc[1], n_))
        labels.append('[p%d]' % n_)
    graph = ';'.join(chains) + ';' + ''.join(labels) + 'concat=n=%d:v=0:a=1[out]' % len(pieces)
    gfile = os.path.join(WORK_DIR, 'filter.txt')
    open(gfile, 'w').write(graph)
    raw_wav = os.path.join(WORK_DIR, 'voice-raw.wav')
    subprocess.check_call([FFMPEG, '-v', 'error', '-y'] + inputs + ['-filter_complex_script', gfile, '-map', '[out]',
                                                                  '-ar', str(sr), '-ac', '1', '-c:a', 'pcm_f32le', raw_wav])
    raw = np.frombuffer(subprocess.check_output([FFMPEG, '-v', 'error', '-i', raw_wav, '-f', 'f32le', '-ac', '1', '-']),
                        dtype='<f4')
    peak = float(np.max(np.abs(raw)))
    gain_db = TARGET_PEAK_DB - 20 * math.log10(peak)
    voice = os.path.join(DATA_DIR, 'voice.wav')
    subprocess.check_call([FFMPEG, '-v', 'error', '-y', '-i', raw_wav, '-af', 'volume=%.4fdB' % gain_db,
                           '-ar', str(sr), '-ac', '1', '-c:a', 'pcm_s16le', voice])

    # ---------------- timing.json ----------------
    r3 = lambda x: round(float(x), 3)   # noqa: E731
    sections_out = []
    for si, tk in enumerate(takes):
        paras_out = []
        for pr in tk['paras']:
            conv = pr['conv']
            wlist = [{'w': x['w'], 'start': r3(conv(x['start'])), 'end': r3(conv(x['end']))} for x in pr['words']]
            # phrases
            sents, idx = [], 0
            for st in pr['src']['sentences']:
                ws = wlist[idx:idx + len(st)]
                idx += len(st)
                sents.append({'text': ' '.join(x['w'] for x in ws), 'start': ws[0]['start'], 'end': ws[-1]['end'],
                              'words': ws})
            paras_out.append({'index': pr['src']['index'], 'text': pr['src']['text'], 'start': wlist[0]['start'],
                              'end': wlist[-1]['end'], 'sentences': sents})
        sections_out.append({'index': si, 'h': tk['sec']['h'], 'start': paras_out[0]['start'],
                             'end': paras_out[-1]['end'], 'paragraphs': paras_out})
    total = total_samples / sr
    timing = {'total': r3(total), 'lead_in': LEAD_IN, 'tail': TAIL, 'sections': sections_out}
    json.dump(timing, open(os.path.join(DATA_DIR, 'timing.json'), 'w'), ensure_ascii=False, indent=1)

    # ---------------- rapport ----------------
    voice_end = sections_out[-1]['end']
    sec_speech = [s['end'] - s['start'] for s in sections_out]
    rep = {'total': r3(total), 'voice_end': voice_end, 'gain_db': round(gain_db, 2), 'peak_before_db': round(20 * math.log10(peak), 2),
           'sections': report['sections'],
           'doubtful': [{'section': si + 1, 'words': [x['w'] for _, x in run],
                         'start_src': round(run[0][1]['start'], 2)} for si, run in report['doubtful']]}
    json.dump(rep, open(os.path.join(WORK_DIR, 'report.json'), 'w'), ensure_ascii=False, indent=1)
    print('\nvoice.wav : %.2f s (voix %.2f -> %.2f ; lead_in %.1f ; tail %.1f), gain %+.2f dB (crête avant %.2f dBFS)' % (
        total, sections_out[0]['start'], voice_end, LEAD_IN, TAIL, gain_db, 20 * math.log10(peak)))
    for i, s in enumerate(sections_out):
        print('  section %d : %.2f -> %.2f (%.1f s de parole)' % (i + 1, s['start'], s['end'], sec_speech[i]))
    tot_n = sum(s['words'] for s in report['sections'])
    print('Appariement global : %.1f %% exact, %.1f %% exact+approché' % (
        100.0 * sum(s['exact'] for s in report['sections']) / tot_n,
        100.0 * sum(s['exact'] + s['fuzzy'] for s in report['sections']) / tot_n))
    if report['doubtful']:
        print('Zones douteuses (> %d mots consécutifs interpolés) :' % DOUBT_RUN)
        for d in rep['doubtful']:
            print('  S%d @%.1fs (prise) : %s' % (d['section'], d['start_src'], ' '.join(d['words'])))
    else:
        print('Aucune zone douteuse (> %d mots consécutifs interpolés).' % DOUBT_RUN)
    print('Temps de calcul : %.0f s' % (time.time() - t_start))


if __name__ == '__main__':
    main()
