// Mini-games with real odds: slot machines, roulette, baccarat, the phone casino,
// plus the cashier, ATM, VIP profile and back-office panels.
import { Blackjack, cardRank, handValue, natural } from './blackjack.js';
import { randomInt, randomUnit } from './random.js';
import { ui } from './ui.js';
import { audio } from './audio.js';
import { fmt, fmtSigned, fmtChips } from './content.js';
import { matchState, outcomeProbs, price, goalSoonP, MARGIN } from './match.js';

const TAU = Math.PI * 2;
const WHEEL_ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const SYMS = [
  { g: '🍒', k: 'cerise' }, { g: '🍋', k: 'citron' }, { g: '🔔', k: 'cloche' }, { g: '⭐', k: 'etoile' }, { g: '7', k: 'sept', seven: true }, { g: '💎', k: 'diamant' }
];
// Educational accounting estimates; never used to select cards or outcomes.
const EDGE = { slot: 0.10, mega: 0.13, roulette: 0.027, baccarat: 0.012, phone: 0.10, blackjack: 0.005, wheel: 0.16, insurance: 0.074, bets: 0.08, pass: 0.0141, field: 0.0556, any7: 0.1667, hard8: 0.0909 };
// Pay tables: [probability, multiplier] tiers, highest first. Remaining probability = loss.
export const SLOT_CFG = {
  lucky:   { name: 'Lucky 7',    kicker: 'Machine à sous · 1 ligne · jackpot 100×',            lines: 1,  near: 0.30, table: [[0.001, 100], [0.006, 30], [0.05, 6], [0.16, 2]] },
  fruits:  { name: "Fruits d'or", kicker: 'Machine à sous · 1 ligne · « ça paie souvent »',     lines: 1,  near: 0.25, table: [[0.0005, 50], [0.01, 10], [0.09, 4], [0.26, 1.5]] },
  presque: { name: 'Presque !',   kicker: 'Machine à sous · 1 ligne · « la chance est proche »', lines: 1,  near: 0.60, table: [[0.001, 100], [0.006, 30], [0.05, 6], [0.16, 2]] },
  pharaon: { name: 'Pharaon',     kicker: 'Machine à sous · 1 ligne · jackpot 500× · haute volatilité', lines: 1, near: 0.30, table: [[0.0006, 500], [0.004, 40], [0.025, 8], [0.07, 3]] },
  mega:    { name: 'Mégalignes',  kicker: 'Machine à sous · 20 lignes · jackpot 100×',          lines: 20, near: 0, table: [[0.001, 100], [0.01, 15], [0.045, 5], [0.10, 2]], ldw: 0.33 }
};

export class Games {
  constructor(state, api) { this.s = state; this.api = api; }

  // ---------------------------------------------------------------- helpers
  chipsHTML(extra = '') { return `<div class="credits"><span>Jetons</span><b id="g-credits">${this.creditsText()}</b>${extra}</div>`; }
  creditsText() { const c = Math.round(this.s.chips * 100) / 100; return Number.isInteger(c) ? c.toLocaleString('fr-FR') : c.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  refreshCredits(root) { const el = root.querySelector('#g-credits'); if (el) el.textContent = this.creditsText(); this.api.hud(); }
  insertHTML() {
    return `<div class="insert" id="g-insert" hidden><p>Plus de jetons.</p>${this.s.money >= 20 ? `<button class="btn" data-ins="20">Insérer 20 €</button><button class="btn" data-ins="50">Insérer 50 €</button>` : `<p class="muted">Ton portefeuille est vide. Il y a un distributeur dans le hall.</p>`}</div>`;
  }
  bindInsert(root, after) {
    root.querySelectorAll('[data-ins]').forEach(b => b.addEventListener('click', () => {
      const v = +b.dataset.ins; if (this.s.money < v) return;
      this.s.money -= v; this.s.chips += v; this.s.flags.chipsMode = true; audio.coin();
      root.querySelector('#g-insert').hidden = true; this.refreshCredits(root); after && after();
    }));
  }
  checkInsert(root, bet) {
    const ins = root.querySelector('#g-insert'); if (!ins) return;
    ins.hidden = !(this.s.chips < bet);
    if (this.s.chips < bet && this.s.money < 20) ins.innerHTML = `<p>Plus de jetons.</p><p class="muted">Ton portefeuille est vide. Il y a un distributeur dans le hall${this.s.flags.card ? ', et le salon VIP fait crédit' : ''}.</p>`;
  }
  wager(amount, edgeKey) {
    const st = this.s.stats; st.wagered += amount; st.theo += amount * EDGE[edgeKey]; st.net = st.returned - st.wagered;
    if (this.s.flags.card) this.s.points = (this.s.points || 0) + amount;
  }
  payout(amount) { this.s.stats.returned += amount; this.s.stats.net = this.s.stats.returned - this.s.stats.wagered; }

  // ---------------------------------------------------------------- SLOTS
  singleOutcome(nearMissP, table = SLOT_CFG.lucky.table) {
    const r = randomUnit();
    let acc = 0, tier = -1, mult = 0;
    for (let i = 0; i < table.length; i++) { acc += table[i][0]; if (r < acc) { tier = i; mult = table[i][1]; break; } }
    let reels;
    if (tier === 0) reels = [4, 4, 4];
    else if (tier === 1) reels = [5, 5, 5];
    else if (tier === 2) { const k = [0, 1, 2, 3][Math.floor(Math.random() * 4)]; reels = [k, k, k]; }
    else if (tier === 3) { let k; do { k = Math.floor(Math.random() * 6); } while (k === 0); reels = [0, 0, k]; }
    else {
      if (Math.random() < nearMissP) { let k; do { k = Math.floor(Math.random() * 6); } while (k === 4); reels = Math.random() < 0.5 ? [4, 4, k] : [4, k, 4]; return { mult: 0, reels, near: true }; }
      do { reels = [0, 0, 0].map(() => Math.floor(Math.random() * 6)); } while ((reels[0] === reels[1] && reels[1] === reels[2]) || (reels[0] === 0 && reels[1] === 0));
    }
    return { mult, reels, near: false };
  }

  openSlot(kind, label) {
    const s = this.s; const cfg = SLOT_CFG[kind] || SLOT_CFG.lucky; const mega = cfg.lines > 1;
    const names = { [kind]: label || cfg.name };
    const kick = { [kind]: cfg.kicker };
    const session = { spins: 0, wagered: 0, returned: 0, near: 0, celebrations: 0, trueWins: 0 };
    let bet = 1, busy = false;
    const reelsHTML = mega
      ? `<div class="grid5">${Array.from({ length: 15 }, (_, i) => `<div class="cell" data-i="${i}">${SYMS[i % 6].g}</div>`).join('')}</div>`
      : `<div class="reels">${[0, 1, 2].map(i => `<div class="reel" data-i="${i}"><span>${SYMS[(i * 2) % 6].g}</span></div>`).join('')}</div>`;
    const root = ui.panel.open(`
      <div class="slot ${kind}">
        <div class="slot-top"><div class="marquee" id="g-marq">${names[kind].toUpperCase()}</div></div>
        ${reelsHTML}
        <div class="slot-msg" id="g-msg">&nbsp;</div>
        <div class="slot-ctrl">
          ${this.chipsHTML()}
          <div class="bets">Mise <button class="bet on" data-b="1">1</button><button class="bet" data-b="2">2</button><button class="bet" data-b="5">5</button>${mega ? '<span class="muted">× 20 lignes</span>' : ''}</div>
          <button class="btn spin" id="g-spin">Tourner <kbd>Espace</kbd></button>
        </div>
        ${this.insertHTML()}
        <div class="session" id="g-session">Tours 0 · Misé 0 · Rendu 0</div>
      </div>`, { title: names[kind], kicker: kick[kind], cls: 'slot-panel', onClose: () => this.closeSlot(kind, session) });
    s.activeSlot = kind;
    this.bindInsert(root);
    root.querySelectorAll('.bet').forEach(b => b.addEventListener('click', () => { bet = +b.dataset.b; root.querySelectorAll('.bet').forEach(x => x.classList.toggle('on', x === b)); audio.click(); this.checkInsert(root, bet); }));
    const spinBtn = root.querySelector('#g-spin');
    const msg = root.querySelector('#g-msg');
    const sess = root.querySelector('#g-session');
    const updateSession = () => { sess.textContent = `Tours ${session.spins} · Misé ${session.wagered} · Rendu ${Math.round(session.returned * 100) / 100}`; };
    this.checkInsert(root, bet);

    const spin = async () => {
      if (busy) return;
      if (s.chips < bet) { this.checkInsert(root, bet); return; }
      busy = true; spinBtn.disabled = true;
      s.chips -= bet; this.wager(bet, mega ? 'mega' : 'slot');
      session.spins++; session.wagered += bet; s.stats.spins++;
      this.api.addTime(0.5);
      this.refreshCredits(root);
      msg.textContent = ' '; msg.className = 'slot-msg';
      root.querySelectorAll('.cell, .reel').forEach(c => c.classList.remove('hit', 'near'));
      // zone build-up
      if (session.spins >= 12) { document.body.classList.add('zone'); audio.setZone(true); spinBtn.classList.add('shrink'); root.closest('.panel-inner').querySelector('.p-close').classList.add('dim'); }

      let payout = 0, near = false, ldw = false, reelsOut = [];
      if (mega) {
        const r = randomUnit();
        let mult = 0, acc = 0;
        for (const [p, m] of cfg.table) { acc += p; if (r < acc) { mult = m; break; } }
        if (!mult && r < acc + cfg.ldw) { mult = [0.2, 0.3, 0.4, 0.5, 0.6, 0.8][randomInt(6)]; ldw = true; }
        payout = Math.round(mult * bet * 100) / 100;
        await this.animateGrid(root, mult > 0);
      } else {
        const o = this.singleOutcome(cfg.near, cfg.table);
        payout = o.mult * bet; near = o.near; reelsOut = o.reels;
        await this.animateReels(root, o.reels);
      }
      if (payout > 0) {
        s.chips += payout; this.payout(payout);
        session.returned += payout; session.celebrations++; s.stats.celebrations++;
        if (payout > bet) { session.trueWins++; s.stats.trueWins++; }
        const big = payout >= bet * 10;
        audio.fanfare(big);
        msg.innerHTML = `GAIN <b>+${(Math.round(payout * 100) / 100).toLocaleString('fr-FR')}</b>${big ? ' !!!' : ' !'}`;
        msg.className = 'slot-msg win' + (big ? ' big' : '');
        ui.flash(big ? 'rgba(255,220,120,0.5)' : 'rgba(255,255,255,0.25)');
        this.confetti(root, big ? 40 : 14);
      } else if (near) {
        session.near++; audio.lose();
        msg.textContent = 'PRESQUE !'; msg.className = 'slot-msg near';
        root.querySelectorAll('.reel').forEach((c, i) => { if (reelsOut[i] === 4) c.classList.add('near'); });
      } else { audio.lose(); }
      this.refreshCredits(root); updateSession(); this.checkInsert(root, bet);
      busy = false; spinBtn.disabled = false;
      this.slotChecks(kind, session, bet);
    };
    spinBtn.addEventListener('click', spin);
    root._spin = spin;
    updateSession();
  }
  slotChecks(kind, session, bet) {
    const s = this.s;
    if (!s.revealed.has('avantage') && session.spins >= 12 && kind !== 'mega') {
      const projected = 1000 * bet * EDGE.slot;
      this.api.reveal('avantage', { spins: session.spins, wagered: session.wagered, returned: session.returned, projected });
      return;
    }
    if (!s.revealed.has('ldw') && kind === 'mega' && session.spins >= 14) {
      this.api.reveal('ldw', { celebrations: session.celebrations, trueWins: session.trueWins, net: session.returned - session.wagered });
      return;
    }
    if (!s.revealed.has('zone') && (session.spins >= 24 || (SLOT_CFG[kind] && SLOT_CFG[kind].near >= 0.5 && session.spins >= 18))) {
      this.api.reveal('zone', { spins: session.spins, near: session.near });
    }
  }
  closeSlot(kind, session) {
    const s = this.s; s.activeSlot = null;
    document.querySelectorAll('.shrink').forEach(e => e.classList.remove('shrink'));
    if (!s.revealed.has('ldw') && kind === 'mega' && session.spins >= 8) this.api.reveal('ldw', { celebrations: session.celebrations, trueWins: session.trueWins, net: session.returned - session.wagered });
    else if (!s.revealed.has('avantage') && session.spins >= 10) this.api.reveal('avantage', { spins: session.spins, wagered: session.wagered, returned: session.returned, projected: 1000 * EDGE.slot });
  }
  animateReels(root, reels) {
    return new Promise(res => {
      const els = [...root.querySelectorAll('.reel')];
      els.forEach(e => e.classList.add('spinning'));
      let n = 0;
      const iv = setInterval(() => { n++; els.forEach((e, i) => { if (!e.classList.contains('spinning')) return; e.firstElementChild.textContent = SYMS[Math.floor(Math.random() * 6)].g; }); if (n % 2 === 0) audio.spinTick(n); }, 60);
      [700, 1150, 1600].forEach((t, i) => setTimeout(() => { const e = els[i]; e.classList.remove('spinning'); e.firstElementChild.textContent = SYMS[reels[i]].g; e.classList.add('stop'); setTimeout(() => e.classList.remove('stop'), 250); audio.reelStop(); if (i === 2) { clearInterval(iv); res(); } }, t));
    });
  }
  animateGrid(root, win) {
    return new Promise(res => {
      const cells = [...root.querySelectorAll('.cell')];
      cells.forEach(c => c.classList.add('spinning'));
      let n = 0;
      const iv = setInterval(() => { n++; cells.forEach(c => { if (c.classList.contains('spinning')) c.textContent = SYMS[Math.floor(Math.random() * 6)].g; }); if (n % 2 === 0) audio.spinTick(n); }, 60);
      const lines = [[5, 6, 7, 8, 9], [0, 1, 2, 3, 4], [10, 11, 12, 13, 14], [0, 6, 12, 8, 4], [10, 6, 2, 8, 14], [5, 1, 7, 13, 9]];
      const line = lines[Math.floor(Math.random() * lines.length)];
      const sym = SYMS[Math.floor(Math.random() * 6)].g;
      for (let col = 0; col < 5; col++) setTimeout(() => {
        for (let row = 0; row < 3; row++) { const i = row * 5 + col; const c = cells[i]; c.classList.remove('spinning'); c.textContent = win && line.includes(i) ? sym : SYMS[Math.floor(Math.random() * 6)].g; }
        audio.reelStop();
        if (col === 4) { clearInterval(iv); if (win) line.forEach(i => cells[i].classList.add('hit')); setTimeout(res, 150); }
      }, 500 + col * 220);
    });
  }
  confetti(root, n) {
    const box = root.querySelector('.slot') || root; const cols = ['#ffd54f', '#ff8a65', '#4fc3f7', '#f5f1e8', '#c6a14f'];
    for (let i = 0; i < n; i++) { const d = document.createElement('i'); d.className = 'conf'; d.style.left = (10 + Math.random() * 80) + '%'; d.style.background = cols[i % cols.length]; d.style.animationDelay = (Math.random() * 0.3) + 's'; d.style.setProperty('--dx', (Math.random() * 120 - 60) + 'px'); box.appendChild(d); setTimeout(() => d.remove(), 1600); }
  }

  // ---------------------------------------------------------------- ROULETTE
  openRoulette() {
    const s = this.s;
    if (!s.roulette) {
      const hist = []; // Only actual spins populate the history.
      s.roulette = { hist, wheelA: 0 };
    }
    const R = s.roulette;
    let betType = 'rouge', betNum = 17, amount = 10, spinning = false, marti = false, martiBase = 10, martiBet = 10;
    const TABLE_MAX = 500;
    const session = { rounds: 0, net: 0 };
    const root = ui.panel.open(`
      <div class="roul">
        <div class="roul-left">
          <canvas id="g-wheel" width="260" height="260"></canvas>
          <div class="roul-res" id="g-res">Faites vos jeux.</div>
        </div>
        <div class="roul-right">
          <div class="hist"><span class="label">Derniers numéros</span><div class="hist-strip" id="g-hist"></div><div class="trend" id="g-trend"></div></div>
          ${this.chipsHTML()}
          <div class="betgrid">
            <button class="bt rouge on" data-t="rouge">Rouge</button><button class="bt noir" data-t="noir">Noir</button>
            <button class="bt" data-t="pair">Pair</button><button class="bt" data-t="impair">Impair</button>
            <button class="bt" data-t="manque">1 – 18</button><button class="bt" data-t="passe">19 – 36</button>
            <button class="bt plein" data-t="plein">Numéro plein <input id="g-num" type="number" min="0" max="36" value="17"> <small>× 35</small></button>
          </div>
          <div class="bets">Mise <button class="bet" data-b="5">5</button><button class="bet on" data-b="10">10</button><button class="bet" data-b="25">25</button><button class="bet" data-b="50">50</button><button class="bet" data-b="100">100</button></div>
          <label class="marti"><input type="checkbox" id="g-marti"> <span>Système Dostoïevski : doubler après chaque perte</span><small id="g-marti-info">Prochaine mise : 10 · plafond de table 500</small></label>
          <div class="spin-row"><button class="btn spin" id="g-launch">Lancer la bille <kbd>Espace</kbd></button><button class="btn" id="g-auto" hidden>Laisser tourner le système</button></div>
          ${this.insertHTML()}
        </div>
      </div>`, { title: 'La roulette', kicker: 'Roulette européenne · 37 cases · un zéro', cls: 'roul-panel', onClose: () => { this.s.stats.rounds += 0; } });
    this.bindInsert(root);
    const cv = root.querySelector('#g-wheel'), g = cv.getContext('2d');
    const sprite = this.wheelSprite || (this.wheelSprite = makeWheelSprite(118));
    let ballA = -Math.PI / 2, ballR = 104;
    const drawWheel = () => {
      g.clearRect(0, 0, 260, 260);
      g.save(); g.translate(130, 130); g.rotate(R.wheelA); g.drawImage(sprite, -sprite.width / 2, -sprite.height / 2); g.restore();
      g.fillStyle = '#f5f1e8'; g.beginPath(); g.arc(130 + Math.cos(ballA) * ballR, 130 + Math.sin(ballA) * ballR, 6, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(130 + Math.cos(ballA) * ballR - 2, 130 + Math.sin(ballA) * ballR - 2, 2, 0, TAU); g.fill();
    };
    const idle = () => { if (root.isConnected && !spinning) { R.wheelA += 0.004; drawWheel(); requestAnimationFrame(idle); } };
    idle();
    const histEl = root.querySelector('#g-hist'), trend = root.querySelector('#g-trend'), res = root.querySelector('#g-res'), launch = root.querySelector('#g-launch');
    const martiCb = root.querySelector('#g-marti'), martiInfo = root.querySelector('#g-marti-info');
    const colorOf = (n) => n === 0 ? 'vert' : REDS.has(n) ? 'rouge' : 'noir';
    const streak = () => { const h = R.hist; if (!h.length) return { n: 0, c: null }; const c = colorOf(h[h.length - 1]); let n = 0; for (let i = h.length - 1; i >= 0 && colorOf(h[i]) === c; i--) n++; return { n, c }; };
    const renderHist = () => {
      histEl.innerHTML = R.hist.slice(-16).map(n => `<span class="h ${colorOf(n)}">${n}</span>`).join('');
      const st = streak();
      trend.innerHTML = st.n >= 3 ? `<b>${st.c.toUpperCase()} × ${st.n}</b> — série en cours` : (R.hist.length ? `Derniers tirages : ${R.hist.slice(-6).join(', ')} · chaque tour reste indépendant` : 'Aucun tirage : l’historique se remplit avec tes tours.');
      trend.classList.toggle('hot', st.n >= 3);
    };
    renderHist();
    root.querySelectorAll('.bt').forEach(b => b.addEventListener('click', (e) => { if (e.target.tagName === 'INPUT') return; betType = b.dataset.t; root.querySelectorAll('.bt').forEach(x => x.classList.toggle('on', x === b)); audio.click(); }));
    root.querySelector('#g-num').addEventListener('change', (e) => { betNum = Math.max(0, Math.min(36, +e.target.value || 0)); e.target.value = betNum; });
    root.querySelectorAll('.bet').forEach(b => b.addEventListener('click', () => { amount = +b.dataset.b; martiBase = amount; martiBet = amount; root.querySelectorAll('.bet').forEach(x => x.classList.toggle('on', x === b)); audio.click(); martiInfo.textContent = `Prochaine mise : ${martiBet} · plafond de table ${TABLE_MAX}`; }));
    const autoBtn = root.querySelector('#g-auto');
    let autoOn = false;
    martiCb.addEventListener('change', () => { marti = martiCb.checked; martiBet = martiBase; martiInfo.textContent = `Prochaine mise : ${martiBet} · plafond de table ${TABLE_MAX}`; autoBtn.hidden = !marti; if (!marti) { autoOn = false; autoBtn.classList.remove('on'); } if (marti && !['rouge', 'noir'].includes(betType)) { betType = 'rouge'; root.querySelectorAll('.bt').forEach(x => x.classList.toggle('on', x.dataset.t === 'rouge')); } });
    autoBtn.addEventListener('click', () => { autoOn = !autoOn; autoBtn.classList.toggle('on', autoOn); autoBtn.textContent = autoOn ? 'Arrêter le système' : 'Laisser tourner le système'; if (autoOn) play(true); });

    const wins = (n, type) => {
      if (n === 0) return type === 'plein' && betNum === 0;
      switch (type) {
        case 'rouge': return REDS.has(n); case 'noir': return !REDS.has(n);
        case 'pair': return n % 2 === 0; case 'impair': return n % 2 === 1;
        case 'manque': return n <= 18; case 'passe': return n >= 19;
        case 'plein': return n === betNum;
      }
    };
    const play = (fast = false) => {
      if (spinning) return;
      if (!marti) autoOn = false;
      const bet = marti ? martiBet : amount;
      if (marti && (bet > TABLE_MAX || bet > s.chips)) {
        autoOn = false; autoBtn.classList.remove('on'); autoBtn.textContent = 'Laisser tourner le système';
        const reason = bet > TABLE_MAX ? 'plafond de la table atteint' : 'plus assez de jetons pour doubler';
        res.innerHTML = `<b>Rien ne va plus.</b> ${reason[0].toUpperCase() + reason.slice(1)}.`;
        this.api.reveal('systeme', { maxBet: martiBet / 2, reason: bet > TABLE_MAX ? 'le plafond de la table interdit de doubler encore' : 'il ne te reste plus de quoi doubler' });
        martiCb.checked = false; marti = false; martiBet = martiBase; martiInfo.textContent = `Prochaine mise : ${martiBet} · plafond de table ${TABLE_MAX}`;
        return;
      }
      if (s.chips < bet) { this.checkInsert(root, bet); return; }
      const st = streak();
      const againstStreak = st.n >= 4 && ((betType === 'rouge' && st.c === 'noir') || (betType === 'noir' && st.c === 'rouge'));
      spinning = true; launch.disabled = true;
      s.chips -= bet; this.wager(bet, 'roulette'); this.refreshCredits(root); s.stats.rounds++; session.rounds++;
      this.api.addTime(2);
      res.textContent = 'Rien ne va plus.';
      const k = randomInt(37); const n = WHEEL_ORDER[k];
      const pocketA = (k + 0.5) / 37 * TAU - Math.PI / 2;
      const T = fast ? 1100 : 3200, t0 = performance.now(), w0 = R.wheelA, omega = 1.4;
      const wEnd = w0 + omega * (T / 1000); const ballEnd = wEnd + pocketA; const b0 = ballA;
      let D = TAU * (fast ? 2 : 5) + ((b0 - ballEnd) % TAU + TAU) % TAU;
      let lastPocket = -1;
      const anim = (now) => {
        const u = Math.min(1, (now - t0) / T); const e = 1 - Math.pow(1 - u, 2.2);
        R.wheelA = w0 + omega * (u * T / 1000); ballA = b0 - D * e; ballR = 104 - 14 * e;
        const rel = Math.floor(((ballA - R.wheelA) / TAU * 37) % 37); if (rel !== lastPocket && u < 0.9) { lastPocket = rel; if (u > 0.3 && Math.random() < 0.6) audio.ballTick(); }
        drawWheel();
        if (u < 1) requestAnimationFrame(anim); else finish();
      };
      const finish = () => {
        audio.ballDrop();
        R.hist.push(n); renderHist();
        const won = wins(n, betType);
        const mult = betType === 'plein' ? 35 : 1;
        let payout = won ? bet * (mult + 1) : 0;
        if (payout) { s.chips += payout; this.payout(payout); s.stats.trueWins++; s.stats.celebrations++; audio.fanfare(betType === 'plein'); }
        else audio.lose();
        session.net += payout - bet;
        res.innerHTML = `Le <b class="${colorOf(n)}">${n}</b>, ${colorOf(n)}. ${won ? `<span class="ok">Gagné +${payout - bet}</span>` : `<span class="ko">Perdu −${bet}</span>`}`;
        if (marti) { martiBet = won ? martiBase : martiBet * 2; martiInfo.textContent = `Prochaine mise : ${martiBet} · plafond de table ${TABLE_MAX}`; }
        this.refreshCredits(root); this.checkInsert(root, marti ? martiBet : amount);
        spinning = false; launch.disabled = false; idle();
        if (againstStreak && !s.revealed.has('memoire')) {
          autoOn = false; autoBtn.classList.remove('on');
          setTimeout(() => this.api.reveal('memoire', { betName: betType, streak: st.n, streakName: st.c + 's' }), 600);
        } else if (!s.revealed.has('avantage') && session.rounds >= 12) {
          autoOn = false; autoBtn.classList.remove('on');
          this.api.reveal('avantage', { spins: session.rounds, wagered: session.rounds * amount, returned: session.rounds * amount + session.net, projected: 1000 * amount * EDGE.roulette });
        } else if (autoOn && marti && root.isConnected) setTimeout(() => play(true), 500);
      };
      requestAnimationFrame(anim);
    };
    launch.addEventListener('click', play);
    root._spin = play;
  }

  // ---------------------------------------------------------------- BACCARAT
  openBaccarat() {
    const s = this.s;
    let side = 'joueur', amount = 25, busy = false, lastBet = 25;
    const session = { net: 0, refaire: 0, rounds: 0 };
    const root = ui.panel.open(`
      <div class="bacc">
        <div class="bacc-table">
          <div class="hand"><div class="label">Joueur</div><div class="cards" id="g-pc"></div><div class="tot" id="g-pt"></div></div>
          <div class="hand"><div class="label">Banque</div><div class="cards" id="g-bc"></div><div class="tot" id="g-bt"></div></div>
        </div>
        <div class="bacc-res" id="g-res">Choisis un camp. Mise minimum 25.</div>
        <div class="bacc-ctrl">
          ${this.chipsHTML()}
          <div class="betgrid three"><button class="bt on" data-t="joueur">Joueur <small>1 : 1</small></button><button class="bt" data-t="banque">Banque <small>0,95 : 1</small></button><button class="bt" data-t="egalite">Égalité <small>8 : 1</small></button></div>
          <div class="bets">Mise <button class="bet on" data-b="25">25</button><button class="bet" data-b="50">50</button><button class="bet" data-b="100">100</button><button class="bet" data-b="200">200</button><button class="bet" data-b="500">500</button></div>
          <button class="btn spin" id="g-deal">Distribuer <kbd>Espace</kbd></button>
          <button class="btn refaire" id="g-refaire" hidden>Se refaire — miser <b id="g-ref-amt"></b></button>
          ${this.insertHTML()}
        </div>
      </div>`, { title: 'La table haute', kicker: 'Baccara · punto banco · vraies règles de tirage', cls: 'bacc-panel' });
    this.bindInsert(root);
    root.querySelectorAll('.bt').forEach(b => b.addEventListener('click', () => { side = b.dataset.t; root.querySelectorAll('.bt').forEach(x => x.classList.toggle('on', x === b)); audio.click(); }));
    root.querySelectorAll('.bet').forEach(b => b.addEventListener('click', () => { amount = +b.dataset.b; root.querySelectorAll('.bet').forEach(x => x.classList.toggle('on', x === b)); audio.click(); }));
    const res = root.querySelector('#g-res'), deal = root.querySelector('#g-deal'), ref = root.querySelector('#g-refaire'), refAmt = root.querySelector('#g-ref-amt');
    const pc = root.querySelector('#g-pc'), bc = root.querySelector('#g-bc'), pt = root.querySelector('#g-pt'), bt = root.querySelector('#g-bt');
    const SUITS = ['♠', '♥', '♦', '♣'];
    const draw = () => { const v = 1 + randomInt(13); const su = SUITS[randomInt(4)]; return { v, su, val: v >= 10 ? 0 : v, label: v === 1 ? 'A' : v === 11 ? 'J' : v === 12 ? 'Q' : v === 13 ? 'K' : String(v) }; };
    const total = (h) => h.reduce((a, c) => a + c.val, 0) % 10;
    const cardHTML = (c) => `<div class="card ${c.su === '♥' || c.su === '♦' ? 'red' : ''}"><span>${c.label}</span><small>${c.su}</small></div>`;
    const showRefaire = () => {
      const want = Math.min(lastBet * 2, 500);
      if (session.net <= -40 && s.chips >= want) { ref.hidden = false; refAmt.textContent = want; } else ref.hidden = true;
    };
    const play = async (bet, viaRefaire = false) => {
      if (busy) return;
      if (s.chips < bet) { this.checkInsert(root, bet); return; }
      busy = true; deal.disabled = true; ref.hidden = true;
      s.chips -= bet; this.wager(bet, 'baccarat'); this.refreshCredits(root); s.stats.rounds++; session.rounds++; lastBet = bet;
      this.api.addTime(2);
      if (viaRefaire) { session.refaire++; }
      pc.innerHTML = ''; bc.innerHTML = ''; pt.textContent = ''; bt.textContent = ''; res.textContent = '…';
      const P = [], B = [];
      const put = async (hand, el) => { const c = draw(); hand.push(c); el.insertAdjacentHTML('beforeend', cardHTML(c)); audio.card(); await wait(380); };
      await put(P, pc); await put(B, bc); await put(P, pc); await put(B, bc);
      let ptot = total(P), btot = total(B);
      pt.textContent = ptot; bt.textContent = btot;
      if (ptot < 8 && btot < 8) {
        let third = null;
        if (ptot <= 5) { await put(P, pc); third = P[2].val; ptot = total(P); pt.textContent = ptot; }
        let bDraw = false;
        if (third === null) bDraw = btot <= 5;
        else if (btot <= 2) bDraw = true;
        else if (btot === 3) bDraw = third !== 8;
        else if (btot === 4) bDraw = third >= 2 && third <= 7;
        else if (btot === 5) bDraw = third >= 4 && third <= 7;
        else if (btot === 6) bDraw = third >= 6 && third <= 7;
        if (bDraw) { await put(B, bc); btot = total(B); bt.textContent = btot; }
      }
      const winner = ptot > btot ? 'joueur' : btot > ptot ? 'banque' : 'egalite';
      let payout = 0;
      if (winner === 'egalite') { payout = side === 'egalite' ? bet * 9 : bet; }
      else if (side === winner) payout = side === 'banque' ? bet * 1.95 : bet * 2;
      if (payout) { s.chips += payout; this.payout(payout); if (payout > bet) { s.stats.trueWins++; s.stats.celebrations++; audio.fanfare(payout >= bet * 5); } }
      else audio.lose();
      session.net += payout - bet;
      const name = { joueur: 'Joueur', banque: 'Banque', egalite: 'Égalité' }[winner];
      res.innerHTML = `${name} ${winner === 'egalite' ? '' : `${Math.max(ptot, btot)} contre ${Math.min(ptot, btot)}`}. ${payout > bet ? `<span class="ok">Gagné +${Math.round((payout - bet) * 100) / 100}</span>` : payout === bet ? '<span>Mise rendue</span>' : `<span class="ko">Perdu −${bet}</span>`} · <span class="muted">Table : ${fmtSignedPlain(session.net)}</span>`;
      this.refreshCredits(root); this.checkInsert(root, amount);
      busy = false; deal.disabled = false;
      showRefaire();
      if (!s.revealed.has('refaire') && (session.refaire >= 3 || (session.refaire >= 1 && s.chips < 25))) {
        this.api.reveal('refaire', { times: session.refaire, net: session.net });
      }
    };
    deal.addEventListener('click', () => play(amount));
    ref.addEventListener('click', () => play(Math.min(lastBet * 2, 500), true));
    root._spin = () => play(amount);
  }

  // ---------------------------------------------------------------- BLACKJACK
  openBlackjack() {
    const s = this.s;
    let amount = 25;
    const engine = new Blackjack(s, {
      onWager: (v,kind) => this.wager(v,kind),
      onPayout: v => this.payout(v),
      onRound: round => {
        const summary = engine.data.summary;
        summary.hands++; summary.net = Math.round((summary.net + round.net)*100)/100;
        if(round.insuranceBet)summary.insurance++;
        s.stats.rounds++;
        if(round.net>0){s.stats.trueWins++;s.stats.celebrations++;audio.fanfare(round.hands.some(h=>h.outcome.startsWith('Blackjack')));}
        else if(round.net<0)audio.lose();
        if(!s.revealed.has('competence')&&summary.hands>=10)queueMicrotask(()=>this.api.reveal('competence',{net:summary.net,insurance:summary.insurance}));
      },
      onChange: () => { render(); this.api.save?.(); }
    });
    engine.data.summary ||= {hands:0,net:0,insurance:0};
    const root = ui.panel.open(`
      <div class="bj">
        <div class="bj-table">
          <div class="hand"><div class="label">Croupier</div><div class="cards" id="g-dc"></div><div class="tot" id="g-dt"></div></div>
          <div class="bj-rule">6 paquets · Reste à 17, même souple · Blackjack 3:2</div>
          <div id="bj-hands" class="bj-hands"></div>
        </div>
        <div class="bacc-res" id="g-res" role="status" aria-live="polite">Choisis ta mise, puis distribue.</div>
        <div class="bacc-ctrl">
          ${this.chipsHTML()}
          <div class="bets" aria-label="Mise">${[10,25,50,100,250,500].map(v=>`<button class="bet ${v===25?'on':''}" data-b="${v}">${v}</button>`).join('')}</div>
          <div class="bj-actions">
            <button class="btn spin" id="g-deal">Distribuer <kbd>Espace</kbd></button>
            <button class="btn" id="g-hit" data-bj="hit">Tirer</button>
            <button class="btn" id="g-stand" data-bj="stand">Rester</button>
            <button class="btn" id="g-double" data-bj="double">Doubler</button>
            <button class="btn" id="g-split" data-bj="split">Partager</button>
            <button class="btn ghost" id="g-surrender" data-bj="surrender">Abandonner</button>
          </div>
          <div class="insure" id="g-insure" hidden><span>Le croupier montre un As. Assurance : demi-mise, gain 2:1.</span><button class="btn" id="g-ins-yes">Prendre l’assurance</button><button class="btn ghost" id="g-ins-no">Sans assurance</button><button class="btn" id="g-even-money" hidden>Paiement égal garanti (1:1)</button></div>
          <p class="muted" id="bj-action-hint"></p>
          <p class="muted" id="bj-shoe"></p>
          ${this.insertHTML()}
        </div>
        <details class="bj-rules"><summary>Règles de cette table et probabilités</summary>
          <ul><li>Blackjack classique américain : six paquets de 52 cartes, mélangés ensemble. Chaque carte est retirée du sabot après son tirage. Nouveau mélange entre deux manches lorsque les trois quarts du sabot ont été utilisés.</li>
          <li>As : 1 ou 11 ; figures : 10. Le croupier vérifie son blackjack devant un As ou une carte valant 10, avant tes actions. Il tire jusqu’à 16 et reste sur tous les 17, y compris As + 6.</li>
          <li>Victoire : gain 1:1 ; blackjack initial : gain 3:2 ; égalité : mise rendue. Un 21 obtenu après partage n’est pas un blackjack.</li>
          <li>Doubler sur les deux premières cartes, y compris après partage : une seule carte supplémentaire. Partager deux cartes de même valeur, jusqu’à quatre mains.</li>
          <li>As partagés : une carte par As ; pas de nouveau partage, de tirage ou de double. Les autres paires peuvent être repartagées dans la limite de quatre mains.</li>
          <li>Abandon tardif sur les deux cartes initiales, après vérification du croupier : la moitié de la mise est rendue. Pas d’abandon après partage.</li>
          <li>Assurance face à un As : mise supplémentaire égale à la moitié de ta mise, payée 2:1 si le croupier a blackjack. Avec ton propre blackjack, tu peux choisir un gain égal à ta mise.</li></ul>
          <p>Les résultats viennent uniquement des cartes et de tes décisions. Aucun pourcentage de défaites n’est imposé. Au début d’un sabot neuf de six paquets, un blackjack naturel a environ 4,75 % de chances de sortir. L’avantage de la maison dépend des règles et des décisions ; il ne garantit pas une perte sur ta soirée.</p>
          <p>Mises de table : 10 à 500 jetons. La main et le sabot sont conservés si tu quittes cette table.</p>
          <a href="https://massgaming.com/wp-content/uploads/RULES-Blackjack-4-9-26.pdf" target="_blank" rel="noopener noreferrer">Référence : règles de blackjack de la Massachusetts Gaming Commission</a>
        </details>
      </div>`, {title:'Blackjack',kicker:'Sabot de six paquets · cartes sans remise · mises fictives',cls:'bacc-panel',onClose:()=>this.api.save?.()});
    const el = id => root.querySelector(id);
    const cardHTML = (card,hidden=false) => {
      if(hidden)return '<div class="card back" aria-label="Carte cachée"></div>';
      const rank=cardRank(card),suit=['♠','♥','♦','♣'][Math.floor(card%52/13)],label=({1:'A',11:'J',12:'Q',13:'K'})[rank]||rank;
      return `<div class="card ${['♥','♦'].includes(suit)?'red':''}"><span>${label}</span><small>${suit}</small></div>`;
    };
    const render = () => {
      const r=engine.round,playing=r?.phase==='player',insuring=r?.phase==='insurance',settled=r?.phase==='settled';
      el('#g-dc').innerHTML=r?r.dealer.map((c,i)=>cardHTML(c,!settled&&i===1)).join(''):'';
      el('#g-dt').textContent=r?(settled?handValue(r.dealer).total:handValue([r.dealer[0]]).total):'';
      el('#bj-hands').innerHTML=r?r.hands.map((h,i)=>{
        const value=handValue(h.cards);
        return `<section class="hand bj-hand ${playing&&i===r.activeHand?'active':''}" aria-label="Main ${i+1}"><div class="label">${r.hands.length>1?'Main '+(i+1):'Toi'} · mise ${h.bet}${playing&&i===r.activeHand?' · à toi':''}</div><div class="cards" ${i===0?'id="g-pc"':''}>${h.cards.map(c=>cardHTML(c)).join('')}</div><div class="tot" ${i===0?'id="g-pt"':''}>${value.total}${value.soft?' · souple':''}</div><small>${settled?`${h.outcome} · ${fmtSignedPlain(h.payout-h.bet)}`:h.status==='bust'?'Dépassé':h.status==='surrendered'?'Abandon':h.status==='stood'?'Main terminée':''}</small></section>`;
      }).join(''):'<div class="hand"><div class="label">Toi</div><div class="cards" id="g-pc"></div></div>';
      const available=engine.actions();
      root.querySelectorAll('[data-bj]').forEach(b=>{b.hidden=!playing;b.disabled=!available[b.dataset.bj];});
      el('#g-deal').hidden=engine.active;el('#g-insure').hidden=!insuring;
      el('#g-ins-yes').disabled=!insuring||s.chips<(r?.baseBet||0)/2;
      el('#g-even-money').hidden=!(insuring&&natural(r.hands[0].cards));
      root.querySelectorAll('.bet').forEach(b=>b.disabled=engine.active);
      el('#bj-action-hint').textContent=playing?'La main en surbrillance attend ton choix. Les options grisées ne sont pas disponibles.':engine.active?'Choisis une option d’assurance.':'Tu peux quitter et retrouver le même sabot plus tard.';
      el('#bj-shoe').textContent=engine.data.shoeNumber?`Sabot n° ${engine.data.shoeNumber} · ${engine.data.shoe.length} cartes restantes · table : ${fmtSignedPlain(engine.data.summary.net)}`:'Sabot neuf de 312 cartes au prochain départ.';
      if(settled)el('#g-res').textContent=`Manche terminée : ${fmtSignedPlain(r.net)}${r.insuranceBet?` · Assurance : ${fmtSignedPlain(r.insurancePayout-r.insuranceBet)}`:''}`;
      else if(insuring)el('#g-res').textContent='As chez le croupier : assurance proposée avant vérification.';
      else if(playing)el('#g-res').textContent=`À toi de jouer${r.hands.length>1?' — main '+(r.activeHand+1)+' / '+r.hands.length:''}.`;
      this.refreshCredits(root);if(!engine.active)this.checkInsert(root,amount);else el('#g-insert').hidden=true;
    };
    const perform = fn => {try {fn();audio.card();}catch(e){el('#g-res').textContent=e.message;}};
    this.bindInsert(root,render);
    root.querySelectorAll('.bet').forEach(b=>b.addEventListener('click',()=>{if(engine.active)return;amount=+b.dataset.b;root.querySelectorAll('.bet').forEach(x=>x.classList.toggle('on',x===b));render();}));
    root.querySelectorAll('[data-bj]').forEach(b=>b.addEventListener('click',()=>perform(()=>{engine.act(b.dataset.bj);this.api.addTime(.5);})));
    el('#g-ins-yes').onclick=()=>perform(()=>engine.insurance(true));
    el('#g-ins-no').onclick=()=>perform(()=>engine.insurance(false));
    el('#g-even-money').onclick=()=>perform(()=>engine.evenMoney());
    const deal=()=>perform(()=>{if(engine.active)return;if(s.chips<amount){this.checkInsert(root,amount);return;}engine.start(amount);this.api.addTime(1.5);});
    el('#g-deal').onclick=deal;root._spin=deal;render();
  }

  // ---------------------------------------------------------------- BIG SIX WHEEL
  openWheel() {
    const s = this.s;
    const SEG = []; // 54 segments in casino order (approximate)
    const pattern = ['1', '2', '1', '5', '1', '2', '1', '10', '1', '2', '1', '5', '1', '2', '1', '20', '1', '2', '1', '5', '1', '2', '1', '10', '1', '2', '1', 'J', '1', '2', '1', '5', '1', '2', '1', '10', '1', '2', '1', '5', '1', '2', '1', '20', '1', '2', '1', '5', '1', '2', '1', '10', '1', 'L'];
    pattern.forEach(v => SEG.push(v));
    const PAY = { '1': 1, '2': 2, '5': 5, '10': 10, '20': 20, 'J': 40, 'L': 40 };
    const COL = { '1': '#f5f1e8', '2': '#c6a14f', '5': '#b3261e', '10': '#1e7a4c', '20': '#1565c0', 'J': '#7b1fa2', 'L': '#ff6f00' };
    const count = (v) => SEG.filter(x => x === v).length;
    const session = { spins: 0, wagered: 0, returned: 0 };
    let pick = '1', amount = 5, spinning = false, angle = 0;
    const root = ui.panel.open(`
      <div class="wheel">
        <div class="wheel-left"><canvas id="g-bigwheel" width="300" height="300"></canvas><div class="roul-res" id="g-res">Choisis un symbole.</div></div>
        <div class="wheel-right">
          ${this.chipsHTML()}
          <div class="wheel-picks">${['1', '2', '5', '10', '20', 'J', 'L'].map(v => `<button class="wp ${v === '1' ? 'on' : ''}" data-v="${v}" style="--c:${COL[v]}"><b>${v === 'J' ? 'Joker' : v === 'L' ? 'Logo' : v}</b><small>paie ${PAY[v]} pour 1 · ${count(v)} case${count(v) > 1 ? 's' : ''} sur 54</small></button>`).join('')}</div>
          <div class="bets">Mise <button class="bet on" data-b="5">5</button><button class="bet" data-b="10">10</button><button class="bet" data-b="25">25</button><button class="bet" data-b="50">50</button></div>
          <button class="btn spin" id="g-turn">Tourner la roue <kbd>Espace</kbd></button>
          ${this.insertHTML()}
        </div>
      </div>`, { title: 'La roue de la fortune', kicker: 'Big Six · 54 cases · un geste', cls: 'roul-panel' });
    this.bindInsert(root);
    root.querySelectorAll('.wp').forEach(b => b.addEventListener('click', () => { pick = b.dataset.v; root.querySelectorAll('.wp').forEach(x => x.classList.toggle('on', x === b)); audio.click(); }));
    root.querySelectorAll('.bet').forEach(b => b.addEventListener('click', () => { amount = +b.dataset.b; root.querySelectorAll('.bet').forEach(x => x.classList.toggle('on', x === b)); audio.click(); }));
    const cv = root.querySelector('#g-bigwheel'), g = cv.getContext('2d'), res = root.querySelector('#g-res'), turn = root.querySelector('#g-turn');
    const drawWheel = () => {
      g.clearRect(0, 0, 300, 300); g.save(); g.translate(150, 150); g.rotate(angle);
      const n = SEG.length, R = 138;
      for (let i = 0; i < n; i++) { const a0 = i / n * TAU - Math.PI / 2, a1 = (i + 1) / n * TAU - Math.PI / 2; g.fillStyle = COL[SEG[i]]; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R, a0, a1); g.closePath(); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; g.stroke();
        const am = (a0 + a1) / 2; g.save(); g.translate(Math.cos(am) * (R - 18), Math.sin(am) * (R - 18)); g.rotate(am + Math.PI / 2); g.fillStyle = SEG[i] === '1' || SEG[i] === '2' ? '#141210' : '#fff'; g.font = 'bold 11px Inter, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(SEG[i], 0, 0); g.restore(); }
      g.fillStyle = '#3b2412'; g.beginPath(); g.arc(0, 0, 40, 0, TAU); g.fill(); g.strokeStyle = '#c6a14f'; g.lineWidth = 3; g.stroke(); g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke();
      g.restore();
      g.fillStyle = '#f5f1e8'; g.beginPath(); g.moveTo(150, 4); g.lineTo(140, 24); g.lineTo(160, 24); g.closePath(); g.fill();
    };
    drawWheel();
    const play = () => {
      if (spinning) return;
      if (s.chips < amount) { this.checkInsert(root, amount); return; }
      spinning = true; turn.disabled = true;
      s.chips -= amount; this.wager(amount, 'wheel'); this.refreshCredits(root); session.spins++; session.wagered += amount; s.stats.rounds++; this.api.addTime(1);
      const k = randomInt(SEG.length);
      const target = -((k + 0.5) / SEG.length) * TAU; // segment k under the pointer at top
      const a0 = angle; const D = TAU * 4 + (((target - a0) % TAU) + TAU) % TAU;
      const T = 3600, t0 = performance.now(); let lastSeg = -1;
      const anim = (now) => {
        const u = Math.min(1, (now - t0) / T); const e = 1 - Math.pow(1 - u, 3);
        angle = a0 + D * e; drawWheel();
        const seg = Math.floor(((-angle / TAU * SEG.length) % SEG.length + SEG.length) % SEG.length); if (seg !== lastSeg) { lastSeg = seg; if (u < 0.95) audio.ballTick(); }
        if (u < 1) requestAnimationFrame(anim); else {
          const v = SEG[k]; const won = v === pick; const payout = won ? amount * (PAY[v] + 1) : 0;
          if (payout) { s.chips += payout; this.payout(payout); s.stats.trueWins++; s.stats.celebrations++; audio.fanfare(PAY[v] >= 10); } else audio.lose();
          session.returned += payout;
          res.innerHTML = `La roue s'arrête sur <b>${v === 'J' ? 'Joker' : v === 'L' ? 'Logo' : v}</b>. ${won ? `<span class="ok">Gagné +${payout - amount}</span>` : `<span class="ko">Perdu −${amount}</span>`}`;
          this.refreshCredits(root); this.checkInsert(root, amount); spinning = false; turn.disabled = false;
          if (!s.revealed.has('simplicite') && session.spins >= 6) this.api.reveal('simplicite', { spins: session.spins, wagered: session.wagered, returned: session.returned });
        }
      };
      requestAnimationFrame(anim);
    };
    turn.addEventListener('click', play);
    root._spin = play;
  }

  // ---------------------------------------------------------------- PHONE
  openPhone() {
    const s = this.s;
    if (!s.phone) s.phone = { balance: 0, bonus: 0, toWager: 0, spins: 0, auto: 0, deposited: 0 };
    const P = s.phone;
    let bet = 1, auto = false, busy = false, timer = null;
    const root = ui.panel.open(`
      <div class="phone">
        <div class="ph-status"><span>--:--</span><span>Wi-Fi CASINO_GUEST</span></div>
        <div class="ph-screen" id="ph">
          <div class="ph-home">
            <div class="ph-notif" id="ph-open"><div class="ph-app-ic">LC</div><div><b>LuckyCrypto Casino</b><span>🎁 Ton bonus de 200 % expire dans 09:59 !</span></div></div>
            <div class="ph-notif" id="ph-bets"><div class="ph-app-ic bet">BN</div><div><b>BetNow</b><span>⚽ ${(() => { const m = matchState(s); return m.phase === 'avant' ? `${m.home} – ${m.away} à 21 h 05` : `${m.home} ${m.score[0]} – ${m.score[1]} ${m.away}, ${m.minute}′`; })()} · Pari gratuit 10 € offert</span></div></div>
            <div class="ph-notif quiet"><div class="ph-app-ic grey">✉</div><div><b>Maman</b><span>Tu rentres à quelle heure ?</span></div></div>
            ${s.night === 2 ? `<div class="ph-notif quiet"><div class="ph-app-ic grey">✉</div><div><b>CASINO</b><span>Votre suite vous attend vendredi. Bonne soirée, ${s.flags.card ? 'membre Or' : 'cher client'}.</span></div></div>
            <div class="ph-notif quiet"><div class="ph-app-ic grey">✉</div><div><b>Karim</b><span>${s.flags.karimMet ? 'J\'ai déposé la demande. Interdiction, 3 ans. Viens pas ce soir.' : 'T\'es où ? Moi je bouge plus de chez moi ce soir'}</span></div></div>` :
            `<div class="ph-notif quiet"><div class="ph-app-ic grey">✉</div><div><b>Karim</b><span>Désolé je suis à la bourre, j'arrive vers minuit</span></div></div>`}
          </div>
        </div>
      </div>`, { title: 'Ton téléphone', kicker: 'Les toilettes · le seul endroit avec du réseau', cls: 'phone-panel', onClose: () => { clearInterval(timer); } });
    const screen = root.querySelector('#ph');
    const openApp = () => {
      audio.click();
      screen.innerHTML = `<div class="ph-app">
        <div class="ph-head"><div class="ph-app-ic">LC</div><div><b>LuckyCrypto</b><span>Licence Curaçao · « 100 % anonyme »</span></div><div class="ph-bal">Solde <b id="ph-bal">${P.balance.toFixed(2)} €</b></div></div>
        <div class="ph-bonus">🎁 BONUS 200 % SUR TON DÉPÔT — <span>dépôt instantané, crypto ou carte</span></div>
        <div class="ph-dep"><button data-d="20">Déposer 20 €</button><button data-d="50">Déposer 50 €</button><button data-d="100">Déposer 100 €</button></div>
        <div class="ph-slot">
          <div class="reels small">${[0, 1, 2].map(i => `<div class="reel" data-i="${i}"><span>${SYMS[(i * 2) % 6].g}</span></div>`).join('')}</div>
          <div class="slot-msg" id="ph-msg">&nbsp;</div>
          <div class="ph-ctrl"><span>Mise 1 €</span><button class="btn spin" id="ph-spin">Tourner</button><button class="btn auto" id="ph-auto">AUTO ⟳</button></div>
        </div>
        <div class="ph-foot"><button id="ph-withdraw">Retirer mes gains</button><span id="ph-wager">Conditions : ${P.toWager > 0 ? `${P.toWager.toFixed(0)} € restant à miser` : 'aucun bonus actif'}</span></div>
      </div>`;
      const bal = screen.querySelector('#ph-bal'), msg = screen.querySelector('#ph-msg'), wag = screen.querySelector('#ph-wager');
      const refresh = () => { bal.textContent = P.balance.toFixed(2) + ' €'; wag.textContent = `Conditions : ${P.toWager > 0 ? `${P.toWager.toFixed(0)} € restant à miser` : 'aucun bonus actif'}`; this.api.hud(); };
      screen.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', () => {
        const v = +b.dataset.d;
        if (s.money >= v) s.money -= v;
        else { s.bank = Math.round((s.bank - v)*100)/100; ui.toast('Paiement par carte accepté (découvert fictif).'); }
        P.balance += v * 3; P.bonus += v * 2; P.toWager += v * 2 * 40; P.deposited += v; audio.coin();
        msg.textContent = `+${v * 3} € crédités instantanément !`; msg.className = 'slot-msg win';
        refresh();
      }));
      const spin = async () => {
        if (busy) return;
        if (P.balance < bet) { msg.textContent = 'Solde insuffisant — dépose pour continuer'; msg.className = 'slot-msg near'; auto = false; clearInterval(timer); screen.querySelector('#ph-auto').classList.remove('on'); return; }
        busy = true;
        P.balance -= bet; this.wager(bet, 'phone'); P.spins++; s.stats.spins++; if (auto) P.auto++;
        P.toWager = Math.max(0, P.toWager - bet);
        this.api.addTime(0.3);
        const o = this.singleOutcome(0.3);
        const els = [...screen.querySelectorAll('.reel')];
        els.forEach(e => e.classList.add('spinning'));
        for (let k = 0; k < 6; k++) { await wait(auto ? 25 : 55); els.forEach(e => e.firstElementChild.textContent = SYMS[Math.floor(Math.random() * 6)].g); }
        els.forEach((e, i) => { e.classList.remove('spinning'); e.firstElementChild.textContent = SYMS[o.reels[i]].g; });
        const payout = o.mult * bet;
        if (payout) { P.balance += payout; this.payout(payout); s.stats.celebrations++; if (payout > bet) s.stats.trueWins++; audio.fanfare(payout >= 10); msg.innerHTML = `GAIN <b>+${payout} €</b>`; msg.className = 'slot-msg win'; }
        else { msg.textContent = o.near ? 'PRESQUE !' : ' '; msg.className = 'slot-msg ' + (o.near ? 'near' : ''); audio.lose(); }
        refresh(); busy = false;
        if (!s.revealed.has('poche') && P.spins >= 25) { auto = false; clearInterval(timer); this.api.reveal('poche', { autoSpins: P.auto }); }
      };
      screen.querySelector('#ph-spin').addEventListener('click', spin);
      screen.querySelector('#ph-auto').addEventListener('click', (e) => { auto = !auto; e.currentTarget.classList.toggle('on', auto); clearInterval(timer); if (auto) timer = setInterval(() => { if (!busy) spin(); }, 420); });
      screen.querySelector('#ph-withdraw').addEventListener('click', () => {
        auto = false; clearInterval(timer);
        screen.insertAdjacentHTML('beforeend', `<div class="ph-modal"><div><b>Retrait de ${P.balance.toFixed(2)} €</b><p>Vérification d'identité requise (passeport, justificatif de domicile, selfie).</p><p>Conditions de mise du bonus : <b>×40</b>. Il te reste <b>${P.toWager.toFixed(0)} €</b> à miser avant tout retrait.</p><p>Délai de traitement : <b>3 à 5 jours ouvrés</b>. Le dépôt, lui, avait pris deux secondes.</p><button id="ph-ok">Continuer à jouer</button></div></div>`);
        screen.querySelector('#ph-ok').addEventListener('click', () => { screen.querySelector('.ph-modal').remove(); this.api.reveal('poche', { autoSpins: P.auto }); });
      });
      root._spin = spin;
    };
    root.querySelector('#ph-open').addEventListener('click', openApp);
    root.querySelector('#ph-bets').addEventListener('click', () => this.openBets(root, screen));
  }

  // ---------------------------------------------------------------- SPORTS BETTING (phone)
  // The match is the one on the bar TV. Odds are fair probabilities plus the bookmaker's margin;
  // outcomes come from the same goal timeline, so nothing here is rigged beyond the margin itself.
  openBets(root, screen) {
    const s = this.s; audio.click();
    if (!s.bets) s.bets = { balance: 0, free: 10, open: [], settled: 0, placed: 0, net: 0, cashouts: 0, deposited: 0 };
    const B = s.bets;
    let stake = 10, pick = '1', timer = null;
    const M = () => matchState(s);
    const odds = () => { const m = M(); const [ph, pd, pa] = outcomeProbs(m.score, m.minute); return { '1': price(ph), 'X': price(pd), '2': price(pa), 'G': price(goalSoonP(m.minute)), p: [ph, pd, pa] }; };
    const label = (t) => { const m = M(); return { '1': m.home, 'X': 'Nul', '2': m.away, 'G': 'But dans les 10 min' }[t]; };
    screen.innerHTML = `<div class="ph-app bets">
      <div class="ph-head"><div class="ph-app-ic bet">BN</div><div><b>BetNow</b><span>Opérateur agréé · « Pariez responsable »</span></div><div class="ph-bal">Solde <b id="bn-bal"></b></div></div>
      <div class="bn-live" id="bn-live"></div>
      <div class="bn-picks" id="bn-picks"></div>
      <div class="bn-stake">Mise ${[5, 10, 20, 50].map(v => `<button class="bet ${v === 10 ? 'on' : ''}" data-b="${v}">${v} €</button>`).join('')}</div>
      <button class="btn spin" id="bn-place">Placer le pari</button>
      <div class="ph-dep"><button data-d="20">Déposer 20 €</button><button data-d="50">Déposer 50 €</button></div>
      <div class="bn-open" id="bn-open"></div>
      <div class="slot-msg" id="bn-msg">&nbsp;</div>
    </div>`;
    const el = (q) => screen.querySelector(q);
    const msg = el('#bn-msg');
    const render = () => {
      const m = M(), o = odds();
      el('#bn-bal').textContent = B.balance.toFixed(2) + ' €' + (B.free ? ` + ${B.free} € offerts` : '');
      el('#bn-live').innerHTML = m.phase === 'avant' ? `<b>${m.home} – ${m.away}</b><span>coup d'envoi à 21 h 05</span>` : m.phase === 'fini' ? `<b>${m.home} ${m.score[0]} – ${m.score[1]} ${m.away}</b><span>terminé · prochain : ${m.next[0]} – ${m.next[1]}</span>` : `<b>${m.home} ${m.score[0]} – ${m.score[1]} ${m.away}</b><span class="live">● EN DIRECT ${m.minute}′${m.phase === 'mi-temps' ? ' · mi-temps' : ''}</span>`;
      const dis = m.phase !== 'live' && m.phase !== 'avant';
      el('#bn-picks').innerHTML = ['1', 'X', '2', 'G'].map(t => `<button class="bp ${pick === t ? 'on' : ''} ${t === 'G' ? 'goal' : ''}" data-t="${t}" ${dis ? 'disabled' : ''}><span>${label(t)}</span><b>${o[t].toFixed(2)}</b></button>`).join('');
      el('#bn-picks').querySelectorAll('.bp').forEach(b => b.addEventListener('click', () => { pick = b.dataset.t; render(); audio.click(); }));
      el('#bn-open').innerHTML = B.open.length ? `<div class="bn-title">Paris en cours</div>` + B.open.map((b, i) => { const v = cashValue(b); return `<div class="bn-bet"><span>${b.label} <b>@ ${b.odds.toFixed(2)}</b> · ${b.stake} €${b.free ? ' (offert)' : ''}</span><button data-co="${i}" ${v === null ? 'disabled' : ''}>${v === null ? 'perdu' : `Cash-out ${v.toFixed(2)} €`}</button></div>`; }).join('') : '';
      el('#bn-open').querySelectorAll('[data-co]').forEach(b => b.addEventListener('click', () => cashOut(+b.dataset.co)));
    };
    // what the operator offers to buy the bet back for: 85 % of its fair value right now
    const cashValue = (b) => {
      const m = M(); if (m.idx !== b.idx) return null;
      let p;
      if (b.type === 'G') { if (m.minute >= b.until) return null; p = goalSoonP(m.minute, b.until - m.minute); }
      else { const [ph, pd, pa] = outcomeProbs(m.score, m.minute); p = { '1': ph, 'X': pd, '2': pa }[b.type]; }
      return Math.round(b.stake * b.odds * p * 0.85 * 100) / 100;
    };
    const settle = () => {
      const m = M();
      for (const b of B.open.slice()) {
        let done = false, won = false;
        if (b.idx !== m.idx) { done = true; const g = s.matchGoals[b.idx] || []; const sc = [0, 0]; g.forEach(x => sc[x.side]++); won = b.type === 'G' ? g.some(x => x.min > b.placed && x.min <= b.until) : b.type === '1' ? sc[0] > sc[1] : b.type === 'X' ? sc[0] === sc[1] : sc[1] > sc[0]; }
        else if (b.type === 'G') { const hit = m.goals.some(x => x.min > b.placed && x.min <= Math.min(b.until, m.minute)); if (hit) { done = true; won = true; } else if (m.minute >= b.until) done = true; }
        else if (m.phase === 'fini') { done = true; won = b.type === '1' ? m.score[0] > m.score[1] : b.type === 'X' ? m.score[0] === m.score[1] : m.score[1] > m.score[0]; }
        if (!done) continue;
        B.open.splice(B.open.indexOf(b), 1); B.settled++;
        if (won) { const gain = b.stake * b.odds - (b.free ? b.stake : 0); B.balance += gain; this.payout(b.stake * b.odds); B.net += gain - (b.free ? 0 : b.stake); s.stats.trueWins++; s.stats.celebrations++; audio.fanfare(b.odds >= 3); msg.innerHTML = `${b.label} : <b>gagné +${gain.toFixed(2)} €</b>`; msg.className = 'slot-msg win'; }
        else { B.net -= b.free ? 0 : b.stake; audio.lose(); msg.textContent = `${b.label} : perdu`; msg.className = 'slot-msg near'; }
        this.api.hud();
      }
    };
    const cashOut = (i) => {
      const b = B.open[i]; const v = cashValue(b); if (v === null) return;
      B.open.splice(i, 1); B.balance += v; B.cashouts++; B.settled++; B.net += v - (b.free ? 0 : b.stake); this.payout(v); audio.coin();
      msg.innerHTML = `Cash-out : <b>${v.toFixed(2)} €</b> récupérés sur ${b.stake} € misés.`; msg.className = 'slot-msg';
      render(); this.api.hud(); check();
    };
    const place = () => {
      const m = M(); if (m.phase !== 'live' && m.phase !== 'avant') { msg.textContent = 'Match terminé. Le suivant commence dans quelques minutes.'; return; }
      let useFree = false;
      if (B.free > 0 && stake <= B.free) useFree = true;
      else if (B.balance < stake) { msg.textContent = 'Solde insuffisant — dépose pour parier.'; msg.className = 'slot-msg near'; return; }
      const o = odds();
      const b = { type: pick, label: label(pick), odds: o[pick], stake, idx: m.idx, placed: m.minute, until: m.minute + 10, free: useFree };
      if (useFree) B.free = 0; else B.balance -= stake;
      B.open.push(b); B.placed++; this.wager(stake, 'bets'); s.stats.rounds++; this.api.addTime(1);
      audio.click(); msg.textContent = `Pari placé : ${b.label} @ ${b.odds.toFixed(2)}.`; msg.className = 'slot-msg';
      render(); this.api.hud(); check();
    };
    const check = () => {
      if (!s.revealed.has('pari') && (B.placed >= 4 || B.cashouts >= 2)) {
        clearInterval(timer);
        const o = odds(); const imp = (1 / o['1'] + 1 / o['X'] + 1 / o['2']) * 100;
        this.api.reveal('pari', { bets: B.placed, net: B.net, odds: `${o['1'].toFixed(2)} · ${o['X'].toFixed(2)} · ${o['2'].toFixed(2)}`, overround: imp.toFixed(1).replace('.', ','), margin: (imp - 100).toFixed(1).replace('.', ',') });
      }
    };
    screen.querySelectorAll('.bn-stake .bet').forEach(b => b.addEventListener('click', () => { stake = +b.dataset.b; screen.querySelectorAll('.bn-stake .bet').forEach(x => x.classList.toggle('on', x === b)); audio.click(); }));
    screen.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', () => {
      const v = +b.dataset.d;
      if (s.money >= v) s.money -= v; else { s.bank = Math.round((s.bank - v)*100)/100; ui.toast('Paiement par carte accepté (découvert fictif).'); }
      B.balance += v; B.deposited += v; audio.coin(); msg.textContent = `+${v} € crédités. Le retrait prendra 3 à 5 jours.`; msg.className = 'slot-msg win'; render(); this.api.hud();
    }));
    el('#bn-place').addEventListener('click', place);
    // the match runs while you watch it on the phone: one match minute per second
    timer = setInterval(() => { if (!screen.isConnected) { clearInterval(timer); return; } this.api.addTime(1); settle(); render(); }, 1000);
    const prev = ui.panel.onClose; ui.panel.onClose = () => { clearInterval(timer); prev && prev(); };
    root._spin = place;
    settle(); render();
  }

  // ---------------------------------------------------------------- CRAPS
  openCraps() {
    const s = this.s;
    const T = { pass: { name: 'Ligne de passe', pay: '1 pour 1', edge: 1.41 }, field: { name: 'Field', pay: '1 pour 1 · 2 et 12 payés double', edge: 5.56 }, any7: { name: 'N\'importe quel 7', pay: '4 pour 1', edge: 16.67 }, hard8: { name: 'Hard 8 (4 + 4)', pay: '9 pour 1', edge: 9.09 } };
    let type = 'pass', amount = 10, busy = false, point = null;
    const on = { pass: 0, field: 0, any7: 0, hard8: 0 };
    const session = { rolls: 0, used: new Set(), net: 0 };
    const SHOUTS = ['« Yo, onze ! »', '« Sept, on dégage. »', '« Hard eight, hard eight ! »', '« Le point est six ! »', '« Allez les dés ! »', '« Field ! »'];
    const root = ui.panel.open(`
      <div class="craps">
        <div class="craps-top"><div class="dice"><div class="die" id="d1">⚄</div><div class="die" id="d2">⚂</div></div><div class="point" id="c-point">PAS DE POINT · sortie</div><div class="roul-res" id="c-res">Pose une mise, lance les dés.</div></div>
        <div class="craps-bets">${Object.entries(T).map(([k, v]) => `<button class="cb ${k === 'pass' ? 'on' : ''}" data-t="${k}"><span>${v.name}</span><small>${v.pay}</small><em id="cb-${k}"></em></button>`).join('')}</div>
        <div class="bacc-ctrl">
          ${this.chipsHTML()}
          <div class="bets">Mise <button class="bet" data-b="5">5</button><button class="bet on" data-b="10">10</button><button class="bet" data-b="25">25</button><button class="bet" data-b="50">50</button></div>
          <button class="btn" id="c-put">Poser la mise</button>
          <button class="btn spin" id="c-roll">Lancer les dés <kbd>Espace</kbd></button>
          ${this.insertHTML()}
        </div>
      </div>`, { title: 'Craps', kicker: 'La table la plus bruyante · quatre mises, quatre prix', cls: 'roul-panel' });
    this.bindInsert(root);
    const el = (q) => root.querySelector(q);
    const res = el('#c-res'), pt = el('#c-point');
    const renderBets = () => { for (const k of Object.keys(T)) el('#cb-' + k).textContent = on[k] ? on[k] + ' posés' : ''; };
    root.querySelectorAll('.cb').forEach(b => b.addEventListener('click', () => { type = b.dataset.t; root.querySelectorAll('.cb').forEach(x => x.classList.toggle('on', x === b)); audio.click(); }));
    root.querySelectorAll('.bet').forEach(b => b.addEventListener('click', () => { amount = +b.dataset.b; root.querySelectorAll('.bet').forEach(x => x.classList.toggle('on', x === b)); audio.click(); }));
    el('#c-put').addEventListener('click', () => {
      if (busy) return;
      if (type === 'pass' && point !== null) { res.textContent = 'La ligne de passe se pose avant le point.'; return; }
      if (s.chips < amount) { this.checkInsert(root, amount); return; }
      s.chips -= amount; on[type] += amount; this.wager(amount, type); session.used.add(type); this.refreshCredits(root); renderBets(); audio.coin();
      res.textContent = `${amount} sur ${T[type].name.toLowerCase()}.`;
    });
    const FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    const roll = async () => {
      if (busy) return;
      const total = on.pass + on.field + on.any7 + on.hard8;
      if (!total) { res.textContent = 'Pose au moins une mise.'; return; }
      busy = true; session.rolls++; s.stats.rounds++; this.api.addTime(1);
      const d1 = el('#d1'), d2 = el('#d2');
      for (let i = 0; i < 9; i++) { d1.textContent = FACES[Math.floor(Math.random() * 6)]; d2.textContent = FACES[Math.floor(Math.random() * 6)]; audio.spinTick(i); await wait(70); }
      const a = 1 + randomInt(6), b = 1 + randomInt(6), sum = a + b;
      d1.textContent = FACES[a - 1]; d2.textContent = FACES[b - 1]; audio.reelStop();
      const lines = [];
      let won = 0, lost = 0;
      // one-roll bets
      if (on.field) { const w = [2, 3, 4, 9, 10, 11, 12].includes(sum); const mult = sum === 2 || sum === 12 ? 2 : 1; if (w) { const g = on.field * (mult + 1); s.chips += g; this.payout(g); won += on.field * mult; lines.push(`Field gagne ${on.field * mult}`); } else { lost += on.field; lines.push(`Field perd ${on.field}`); } on.field = 0; }
      if (on.any7) { if (sum === 7) { const g = on.any7 * 5; s.chips += g; this.payout(g); won += on.any7 * 4; lines.push(`N'importe quel 7 gagne ${on.any7 * 4}`); } else { lost += on.any7; lines.push(`N'importe quel 7 perd ${on.any7}`); } on.any7 = 0; }
      if (on.hard8) { if (a === 4 && b === 4) { const g = on.hard8 * 10; s.chips += g; this.payout(g); won += on.hard8 * 9; lines.push(`Hard 8 gagne ${on.hard8 * 9}`); on.hard8 = 0; } else if (sum === 7 || sum === 8) { lost += on.hard8; lines.push(`Hard 8 perd ${on.hard8}`); on.hard8 = 0; } }
      // pass line
      if (on.pass) {
        if (point === null) {
          if (sum === 7 || sum === 11) { const g = on.pass * 2; s.chips += g; this.payout(g); won += on.pass; lines.push(`Passe gagne ${on.pass}`); on.pass = 0; }
          else if (sum === 2 || sum === 3 || sum === 12) { lost += on.pass; lines.push(`Passe perd ${on.pass}`); on.pass = 0; }
          else { point = sum; lines.push(`Le point est ${sum}`); }
        } else if (sum === point) { const g = on.pass * 2; s.chips += g; this.payout(g); won += on.pass; lines.push(`Point fait : passe gagne ${on.pass}`); on.pass = 0; point = null; }
        else if (sum === 7) { lost += on.pass; lines.push(`Sept : passe perd ${on.pass}`); on.pass = 0; point = null; }
      } else if (point !== null && (sum === 7 || sum === point)) point = null;
      pt.textContent = point === null ? 'PAS DE POINT · sortie' : `POINT : ${point}`;
      session.net += won - lost;
      if (won > lost) { s.stats.trueWins++; s.stats.celebrations++; audio.fanfare(won >= 40); } else if (lost) audio.lose();
      res.innerHTML = `<b>${sum}</b> (${a} + ${b}). ${lines.join(' · ') || 'Rien ne bouge.'}`;
      if (Math.random() < 0.5) ui.toast(SHOUTS[Math.floor(Math.random() * SHOUTS.length)], 1800);
      this.refreshCredits(root); this.checkInsert(root, amount); renderBets(); busy = false;
      if (!s.revealed.has('bruit') && session.rolls >= 10) {
        const used = [...session.used].map(k => T[k].edge); const best = Math.min(...used, 1.41), worst = Math.max(...used, 1.41);
        this.api.reveal('bruit', { rolls: session.rolls, best: best.toFixed(1).replace('.', ','), worst: worst.toFixed(1).replace('.', ',') });
      }
    };
    el('#c-roll').addEventListener('click', roll);
    root._spin = roll;
    renderBets();
  }

  // ---------------------------------------------------------------- LOYALTY SHOP
  openShop() {
    const s = this.s;
    const ITEMS = [
      { id: 'verre', name: 'Un verre au bar', pts: 100, value: 8 },
      { id: 'casquette', name: 'La casquette du casino', pts: 300, value: 12 },
      { id: 'montre', name: 'Une montre gravée', pts: 2000, value: 120 },
      { id: 'weekend', name: 'Un week-end pour deux', pts: 6000, value: 400 }
    ];
    s.bought = s.bought || [];
    const root = ui.panel.open(`
      <div class="shop">
        <p class="lead">Vos points : <b id="sh-pts">${Math.floor(s.points || 0)}</b>. Un point par jeton misé, sur toutes les tables.</p>
        <div class="shop-grid">${ITEMS.map(it => `<div class="sh-item"><b>${it.name}</b><span>${it.pts} points</span><button class="btn" data-id="${it.id}" ${s.bought.includes(it.id) ? 'disabled' : ''}>${s.bought.includes(it.id) ? 'Déjà pris' : 'Échanger'}</button></div>`).join('')}</div>
        <p class="muted" id="sh-msg"></p>
      </div>`, { title: 'La boutique fidélité', kicker: 'Le hall · vos points, nos cadeaux', cls: 'small-panel', onClose: () => { if (s.bought.length && !s.revealed.has('tapis')) this.api.reveal('tapis', { theo: s.stats.theo, credit: s.debt > 0 }); } });
    const msg = root.querySelector('#sh-msg');
    root.querySelectorAll('[data-id]').forEach(b => b.addEventListener('click', () => {
      const it = ITEMS.find(x => x.id === b.dataset.id); const pts = Math.floor(s.points || 0);
      if (pts < it.pts) { msg.textContent = `Il vous manque ${it.pts - pts} points. Continuez à jouer, ça vient vite.`; audio.lose(); return; }
      s.points -= it.pts; s.bought.push(it.id); b.disabled = true; b.textContent = 'Déjà pris'; audio.coin();
      root.querySelector('#sh-pts').textContent = Math.floor(s.points);
      const cost = Math.round(it.pts * 0.06);
      msg.innerHTML = `${it.name} : à vous. <span class="ko">${it.pts} points, c'est ${it.pts} jetons misés. À 6 % de marge moyenne, vous les avez payés ${fmt(cost)} de pertes attendues — ${cost > it.value ? `${Math.round(cost / it.value * 10) / 10} fois` : 'à peu près'} le prix en magasin.</span>`;
      this.api.hud();
    }));
  }

  // ---------------------------------------------------------------- POKER (watching the rake)
  openPokerWatch() {
    const s = this.s;
    const NAMES = ['Marco', 'Léa', 'Sofiane', 'Le régulier'];
    let hand = 0, rake = 0; const nets = [0, 0, 0, 0]; let busy = false;
    const root = ui.panel.open(`
      <div class="poker">
        <p class="lead">Tournoi à minuit, inscription 200 jetons. En attendant, une partie de cash game : regarde qui gagne.</p>
        <div class="pk-players">${NAMES.map((n, i) => `<div class="pk-p"><b>${n}</b><span id="pk-${i}">0</span></div>`).join('')}</div>
        <div class="pk-pot" id="pk-pot">Pot : —</div>
        <div class="pk-rake">Commission prélevée par la maison : <b id="pk-rake">0</b> jetons</div>
        <button class="btn spin" id="pk-next">Regarder une main <kbd>Espace</kbd></button>
        <p class="muted" id="pk-msg">Le poker est le seul jeu où tu ne joues pas contre le casino. Tu joues contre les autres — et le casino prend sa part sur chaque pot.</p>
      </div>`, { title: 'La table de poker', kicker: 'Cash game · 5 % du pot, plafonné à 15 · quel que soit le gagnant', cls: 'small-panel' });
    const el = (q) => root.querySelector(q);
    const next = async () => {
      if (busy) return; busy = true; hand++;
      const pot = 60 + Math.floor(Math.random() * 340); const r = Math.min(15, Math.round(pot * 0.05)); const w = Math.floor(Math.random() * 4);
      el('#pk-pot').textContent = `Main ${hand} · pot ${pot}`; audio.card(); await wait(700);
      for (let i = 0; i < 4; i++) nets[i] -= Math.round(pot / 4);
      nets[w] += pot - r; rake += r;
      for (let i = 0; i < 4; i++) { const e = el('#pk-' + i); e.textContent = (nets[i] > 0 ? '+' : '') + nets[i]; e.className = nets[i] > 0 ? 'ok' : nets[i] < 0 ? 'ko' : ''; }
      el('#pk-rake').textContent = rake; audio.coin();
      el('#pk-msg').textContent = `${NAMES[w]} remporte ${pot - r}. La maison prend ${r}.`;
      if (hand >= 6) { el('#pk-msg').innerHTML = `Six mains : la maison a pris <b>${rake}</b> jetons sans jouer une carte. ${nets.filter(n => n > 0).length ? `Le meilleur joueur en est à +${Math.max(...nets)}.` : 'Personne n\'est en positif.'} Sur une nuit, le rake dépasse ce que gagne le meilleur de la table.`; el('#pk-next').disabled = true; }
      busy = false;
    };
    el('#pk-next').addEventListener('click', next);
    root._spin = next;
  }

  // ---------------------------------------------------------------- CAISSE / ATM
  openCaisse() {
    const s = this.s;
    const root = ui.panel.open(`
      <div class="caisse">
        <p class="lead">« Ici, tout se joue en jetons. Un jeton, un euro. Vous les rendez quand vous voulez. »</p>
        <div class="row"><div class="tn"><b>${fmt(s.money)}</b><span>dans ton portefeuille</span></div><div class="tn"><b>${fmtChips(s.chips)}</b><span>en jetons</span></div></div>
        <div class="actions">
          <button class="btn" data-x="100">Changer 100 €</button><button class="btn" data-x="200">Changer 200 €</button><button class="btn" data-x="all">Tout changer</button>
          <button class="btn ghost" data-x="back">Rendre mes jetons</button>
        </div>
        <p class="muted" id="c-msg"></p>
      </div>`, { title: 'La caisse', kicker: 'Le hall · les euros entrent, les jetons sortent', cls: 'small-panel' });
    const msg = root.querySelector('#c-msg');
    const rerender = () => { root.querySelectorAll('.tn b')[0].textContent = fmt(s.money); root.querySelectorAll('.tn b')[1].textContent = fmtChips(s.chips); this.api.hud(); };
    root.querySelectorAll('[data-x]').forEach(b => b.addEventListener('click', () => {
      const x = b.dataset.x;
      if (x === 'back') { if (s.chips <= 0) { msg.textContent = 'Vous n\'avez pas de jetons.'; return; } s.money += s.chips; msg.textContent = `Voilà ${fmtChips(s.chips)} rendus. Bonne soirée.`; s.chips = 0; s.flags.chipsMode = false; audio.coin(); rerender(); return; }
      const v = x === 'all' ? s.money : Math.min(+x, s.money);
      if (v <= 0) { msg.textContent = 'Votre portefeuille est vide. Le distributeur est au fond du hall.'; return; }
      s.money -= v; s.chips += v; s.flags.chipsMode = true; audio.coin();
      msg.textContent = `${fmt(v)} changés. Les jetons ne pèsent rien, n'est-ce pas ?`;
      rerender();
    }));
  }
  openATM() {
    const s = this.s;
    const root = ui.panel.open(`
      <div class="caisse atm">
        <div class="atm-screen"><div class="atm-line">BANQUE — RETRAIT</div><div class="atm-line small">Frais d'opération hors réseau : 4,90 €</div><div class="atm-line" id="atm-bal">Découvert utilisé : ${fmt(Math.max(0, -s.bank))} — simulation sans plafond</div></div>
        <div class="actions"><button class="btn" data-w="50">50 €</button><button class="btn" data-w="100">100 €</button><button class="btn" data-w="200">200 €</button></div>
        <p class="muted" id="atm-msg">Découvert sans plafond dans cette simulation. Les montants restent fictifs.</p>
      </div>`, { title: 'Distributeur', kicker: 'Le hall · toujours à côté des jeux, jamais loin', cls: 'small-panel' });
    const msg = root.querySelector('#atm-msg');
    root.querySelectorAll('[data-w]').forEach(b => b.addEventListener('click', () => {
      const v = +b.dataset.w;
      s.bank = Math.round((s.bank - v - 4.9)*100)/100; s.money += v; audio.coin();
      msg.textContent = `${fmt(v)} retirés (+ 4,90 € de frais).`;
      root.querySelector('#atm-bal').textContent = `Découvert utilisé : ${fmt(Math.max(0, -s.bank))} — simulation sans plafond`;
      this.api.hud();
    }));
  }

  // ---------------------------------------------------------------- VIP profile & back office
  openTheo() {
    const s = this.s, st = s.stats;
    const theo = st.theo;
    const comps = st.drinks * 8 + (s.flags.suite ? 180 : 0) + (s.flags.card ? 5 : 0);
    const root = ui.panel.open(`
      <div class="theo">
        <p class="muted">Estimation pédagogique : les coefficients moyens ne pilotent jamais les tirages. Au blackjack, le repère de 0,5 % suppose une stratégie de base ; le résultat réel dépend du sabot et de tes décisions.</p>
        <div class="theo-head"><div class="tier">MEMBRE ${theo > 60 ? 'PLATINE' : theo > 20 ? 'OR' : 'ARGENT'}</div><div class="muted">Profil joueur · mis à jour en temps réel</div></div>
        <div class="row">
          <div class="tn"><b>${fmt(st.wagered)}</b><span>misés ce soir</span></div>
          <div class="tn"><b>${st.spins + st.rounds}</b><span>tours et coups</span></div>
          <div class="tn"><b>${(st.wagered ? (theo / st.wagered * 100) : 0).toFixed(1).replace('.', ',')} %</b><span>avantage indicatif sur tes jeux</span></div>
          <div class="tn hi"><b>${fmt(theo)}</b><span>perte théorique (« théo »)</span></div>
          <div class="tn"><b>${fmt(comps)}</b><span>valeur des attentions offertes</span></div>
          <div class="tn"><b>${theo > 0 ? Math.round(comps / theo * 100) : 0} %</b><span>du théo reversé en cadeaux</span></div>
        </div>
        <div class="theo-note">Prochaine offre déclenchée à ${fmt(Math.max(theo * 1.5, 40))} de théo : <b>suite offerte + ligne de crédit</b>. Statut : ${s.flags.card ? 'carte de fidélité active, suivi de chaque mise' : 'non identifié — suivi caméra'}.</div>
      </div>`, { title: 'Votre profil', kicker: 'Salon VIP · ce que le casino sait de toi', cls: 'small-panel', onClose: () => { if (!s.revealed.has('tapis')) this.api.reveal('tapis', { theo: st.theo, credit: s.debt > 0 }); } });
  }
  openBoard() {
    const s = this.s, st = s.stats;
    ui.panel.open(`
      <div class="board">
        <div class="row">
          <div class="tn"><b>14 Md€</b><span>produit brut des jeux en France, 2024</span></div>
          <div class="tn"><b>2,7 Md€</b><span>recettes des casinos français</span></div>
          <div class="tn"><b>81,8 %</b><span>de ces recettes viennent des machines à sous</span></div>
          <div class="tn"><b>60,6 %</b><span>du chiffre d'affaires en ligne vient de joueurs excessifs</span></div>
          <div class="tn"><b>1 170 000</b><span>joueurs problématiques en France</span></div>
          <div class="tn"><b>73 439</b><span>personnes en interdiction volontaire de jeux</span></div>
        </div>
        <div class="theo-note">Ce soir, sur cet établissement : <b>${fmt(st.theo)}</b> de perte théorique générée par le client n° 4417 (toi). Objectif : temps sur machine + 12 %.</div>
        <p class="muted">Sources : OFDT, <i>Les jeux d'argent et de hasard en France en 2024</i> ; ANJ, 2026.</p>
      </div>`, { title: 'Le tableau de bord', kicker: "Le bureau · l'envers du décor", cls: 'small-panel' });
    s.flags.board = true;
  }
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
function fmtSignedPlain(n) { return (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(Math.round(n * 100) / 100); }
function makeWheelSprite(R) {
  const c = document.createElement('canvas'); c.width = c.height = R * 2 + 4;
  const g = c.getContext('2d'); const cx = R + 2, cy = R + 2;
  g.fillStyle = '#3b2412'; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();
  const n = 37;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * TAU - Math.PI / 2, a1 = ((i + 1) / n) * TAU - Math.PI / 2;
    const num = WHEEL_ORDER[i];
    g.fillStyle = num === 0 ? '#1e7a4c' : REDS.has(num) ? '#b3261e' : '#161616';
    g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R - 6, a0, a1); g.closePath(); g.fill();
    const am = (a0 + a1) / 2; g.fillStyle = '#f5f1e8'; g.font = `bold ${Math.round(R * 0.09)}px Inter, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.save(); g.translate(cx + Math.cos(am) * (R - 18), cy + Math.sin(am) * (R - 18)); g.rotate(am + Math.PI / 2); g.fillText(String(num), 0, 0); g.restore();
  }
  g.strokeStyle = '#c6a14f'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, R - 6, 0, TAU); g.stroke();
  g.fillStyle = '#2b1a0e'; g.beginPath(); g.arc(cx, cy, R * 0.55, 0, TAU); g.fill();
  g.strokeStyle = '#c6a14f'; g.beginPath(); g.arc(cx, cy, R * 0.55, 0, TAU); g.stroke();
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; g.strokeStyle = '#c6a14f'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx + Math.cos(a) * 8, cy + Math.sin(a) * 8); g.lineTo(cx + Math.cos(a) * R * 0.5, cy + Math.sin(a) * R * 0.5); g.stroke(); }
  g.fillStyle = '#c6a14f'; g.beginPath(); g.arc(cx, cy, 8, 0, TAU); g.fill();
  return c;
}
