// The football on the bar TV and in the betting app are the same match: a deterministic timeline
// (seeded per night) so that what you see on screen is exactly what your bets settle on.
export const FIXTURES = [['PSG', 'OM'], ['Lyon', 'Lille'], ['Lens', 'Nice'], ['Monaco', 'Rennes'], ['Nantes', 'Toulouse'], ['Brest', 'Reims'], ['Strasbourg', 'Metz'], ['Le Havre', 'Angers']];
export const KICKOFF = 21 * 60 + 5;   // first match starts at 21:05
export const SLOT = 105;               // 90 minutes of play + 15 minutes of ads between two matches
const LAMBDA = { home: 1.6, away: 1.1 }; // expected goals — a Poisson model, the one bookmakers start from

function rng(seed) { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return (x % 100000) / 100000; }; }
function poisson(lambda, r) { const L = Math.exp(-lambda); let k = 0, p = 1; do { k++; p *= r(); } while (p > L); return k - 1; }

/** Goals of fixture `idx`: [{ min, side }] sorted by minute. Cached on the state. */
export function goalsOf(s, idx) {
  if (!s.matchSeed) s.matchSeed = 1 + Math.floor(Math.random() * 1e9);
  s.matchGoals = s.matchGoals || {};
  if (!s.matchGoals[idx]) {
    const r = rng(s.matchSeed + idx * 7919);
    const list = [];
    for (let k = 0, n = poisson(LAMBDA.home, r); k < n; k++) list.push({ min: 1 + Math.floor(r() * 90), side: 0 });
    for (let k = 0, n = poisson(LAMBDA.away, r); k < n; k++) list.push({ min: 1 + Math.floor(r() * 90), side: 1 });
    list.sort((a, b) => a.min - b.min);
    s.matchGoals[idx] = list;
  }
  return s.matchGoals[idx];
}

/** What is on screen right now: fixture, minute (0..90), score, phase 'avant' | 'live' | 'mi-temps' | 'fini'. */
export function matchState(s) {
  const t = s.timeMin;
  const idx = Math.max(0, Math.floor((t - KICKOFF) / SLOT)) % FIXTURES.length;
  const start = KICKOFF + Math.max(0, Math.floor((t - KICKOFF) / SLOT)) * SLOT;
  const [home, away] = FIXTURES[idx];
  const raw = t - start;
  const minute = Math.max(0, Math.min(90, Math.floor(raw)));
  const phase = t < KICKOFF ? 'avant' : raw >= 90 ? 'fini' : raw >= 45 && raw < 47 ? 'mi-temps' : 'live';
  const goals = goalsOf(s, idx);
  const score = [0, 0]; for (const g of goals) if (g.min <= minute) score[g.side]++;
  return { idx, start, home, away, minute, phase, score, goals, next: FIXTURES[(idx + 1) % FIXTURES.length] };
}

// ---------------------------------------------------------------- probabilities and prices
function poissonP(l, k) { let p = Math.exp(-l); for (let i = 1; i <= k; i++) p *= l / i; return p; }
/** Fair probabilities of home / draw / away from the current score and the minutes left. */
export function outcomeProbs(score, minute) {
  const f = Math.max(0, 90 - minute) / 90; const lh = LAMBDA.home * f, la = LAMBDA.away * f;
  let ph = 0, pd = 0, pa = 0;
  for (let i = 0; i <= 8; i++) for (let j = 0; j <= 8; j++) {
    const p = poissonP(lh, i) * poissonP(la, j); const h = score[0] + i, a = score[1] + j;
    if (h > a) ph += p; else if (h === a) pd += p; else pa += p;
  }
  return [ph, pd, pa];
}
export const MARGIN = 0.08; // the bookmaker's overround: 8 % on top of the fair probabilities
export function price(p) { return Math.max(1.01, Math.round((1 / p) / (1 + MARGIN) * 100) / 100); }
/** Probability of at least one goal in the next `n` minutes. */
export function goalSoonP(minute, n = 10) { const left = Math.max(0, Math.min(n, 90 - minute)); return 1 - Math.exp(-(LAMBDA.home + LAMBDA.away) * left / 90); }
