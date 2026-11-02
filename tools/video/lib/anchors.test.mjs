// node --test tools/video/lib/anchors.test.mjs   (nécessite output/video/data/timing.json et voice.wav : `python3 tools/video/align.py`)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTiming, resolve } from './anchors.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const DATA = join(ROOT, 'output', 'video', 'data');
const timing = loadTiming(join(DATA, 'timing.json'));

function wavDuration(path) {
  const b = readFileSync(path);
  assert.equal(b.toString('ascii', 0, 4), 'RIFF');
  let o = 12, byteRate = 0;
  while (o + 8 <= b.length) {
    const id = b.toString('ascii', o, o + 4), size = b.readUInt32LE(o + 4);
    if (id === 'fmt ') byteRate = b.readUInt32LE(o + 16);
    if (id === 'data') return Math.min(size, b.length - o - 8) / byteRate;
    o += 8 + size + (size % 2);
  }
  throw new Error('chunk data introuvable');
}

test('les temps sont croissants à tous les niveaux', () => {
  let prev = 0;
  for (const s of timing.sections) {
    assert.ok(s.start >= prev, `section ${s.index} commence avant la précédente`);
    for (const p of s.paragraphs) {
      for (const se of p.sentences) {
        for (const w of se.words) {
          assert.ok(w.start <= w.end, `mot « ${w.w} » : start > end`);
          assert.ok(w.start >= prev - 1e-9, `mot « ${w.w} » (${w.start}) recule (précédent ${prev})`);
          prev = w.end;
        }
        assert.equal(se.start, se.words[0].start);
        assert.equal(se.end, se.words.at(-1).end);
      }
      assert.equal(p.start, p.sentences[0].start);
      assert.equal(p.end, p.sentences.at(-1).end);
    }
    assert.equal(s.start, s.paragraphs[0].start);
    assert.equal(s.end, s.paragraphs.at(-1).end);
    prev = s.end;
  }
  assert.ok(timing.total > prev, 'total doit dépasser la fin de la voix');
});

test('total ≈ durée du wav (± 0,05 s) et lead_in / tail respectés', () => {
  const d = wavDuration(join(DATA, 'voice.wav'));
  assert.ok(Math.abs(timing.total - d) <= 0.05, `total ${timing.total} vs wav ${d}`);
  assert.ok(Math.abs(timing.sections[0].start - timing.lead_in) <= 0.005);
  assert.ok(Math.abs(timing.total - resolve(timing, { at: 'voice-end' }) - timing.tail) <= 0.005);
});

test('ancres exemples', () => {
  const t1 = resolve(timing, { s: 0, phrase: 'Bienvenue dans Zéro Vert', edge: 'end' });
  const t2 = resolve(timing, { s: 1, phrase: 'Douze fois', edge: 'start' });
  const t3 = resolve(timing, { s: 2, phrase: 'trente-six divisé par trente-sept' });          // chiffres du script lus en lettres
  const t4 = resolve(timing, { s: 2, phrase: '97,3 centimes', edge: 'end', dt: 0.25 });
  const t5 = resolve(timing, { s: 1, p: 0, phrase: 'Saison un', edge: 'start' });
  assert.ok(t1 > timing.sections[0].start && t1 < timing.sections[0].end);
  assert.ok(t2 > timing.sections[1].start && t2 < timing.sections[1].end);
  assert.equal(t3, resolve(timing, { s: 2, phrase: '36 divisé par 37' }));
  assert.ok(t3 > timing.sections[2].start && t3 < timing.sections[2].end);
  assert.ok(t4 > t3 && t4 < timing.sections[2].end + 0.25);
  assert.ok(t5 < t2, '« Saison un » précède « Douze fois » dans le même paragraphe');
  assert.ok(t5 > timing.sections[1].start);
  // le mot « Douze » du script commence exactement à la valeur résolue
  const w = timing.sections[1].paragraphs[0].sentences.flatMap((s) => s.words).find((x) => x.w.startsWith('Douze'));
  assert.equal(t2, w.start);
});

test('ancres spéciales', () => {
  assert.equal(resolve(timing, { at: 'video-start' }), 0);
  assert.equal(resolve(timing, { at: 'voice-start' }), timing.lead_in);
  assert.equal(resolve(timing, { at: 'video-end' }), timing.total);
  assert.equal(resolve(timing, { s: 3, at: 'section-start' }), timing.sections[3].start);
  assert.equal(resolve(timing, { s: 3, at: 'section-end', dt: -1 }), timing.sections[3].end - 1);
});

test('erreurs claires : introuvable, ambiguë, nth', () => {
  assert.throws(() => resolve(timing, { s: 0, phrase: 'phrase qui nexiste pas' }), /introuvable/);
  assert.throws(() => resolve(timing, { s: 0, phrase: 'de la' }), /ambiguë.*nth/);
  const first = resolve(timing, { s: 0, phrase: 'de la', nth: 1 });
  const second = resolve(timing, { s: 0, phrase: 'de la', nth: 2 });
  assert.ok(second > first);
  assert.throws(() => resolve(timing, { s: 0, phrase: 'de la', nth: 99 }), /hors limites/);
  assert.throws(() => resolve(timing, { s: 9, phrase: 'tu' }), /invalide/);
  assert.throws(() => resolve(timing, { s: 0, phrase: 'tu', edge: 'milieu' }), /edge/);
});
