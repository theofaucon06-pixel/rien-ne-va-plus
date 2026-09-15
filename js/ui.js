// DOM user interface: dialogues, panels, reveal modal, codex, HUD, intro, epilogue.
import { REVELATIONS, WITNESSES, SOURCES, STORY, fmt, fmtSigned, fmtChips } from './content.js';
import { audio } from './audio.js';

const $ = (s) => document.querySelector(s);

export const ui = {
  state: null,
  stack: [],        // open layers: 'dialog' | 'panel' | 'modal' | 'codex' | 'intro' | 'epilogue'
  init(state) {
    this.state = state;
    this.el = {
      hud: $('#hud'), money: $('#money-val'), moneyLabel: $('#money-label'), debt: $('#debt'),
      prompt: $('#prompt'), promptText: $('#prompt-text'), room: $('#room-name'), timeHud: $('#time-hud'),
      dialog: $('#dialog'), panel: $('#panel'), modal: $('#modal'), codex: $('#codex'), toast: $('#toast'),
      intro: $('#intro'), epilogue: $('#epilogue'), banner: $('#banner'), revCount: $('#rev-count'), flash: $('#flash'), card: $('#card')
    };
    $('#btn-codex').addEventListener('click', () => this.toggleCodex());
    $('#btn-sound').addEventListener('click', () => this.toggleSound());
    document.addEventListener('keydown', (e) => { if (e.key === 'm' || e.key === 'M') this.toggleSound(); });
  },
  isOpen() { return this.stack.length > 0; },
  onIdle: null,
  _pop(kind) { const i = this.stack.lastIndexOf(kind); if (i >= 0) this.stack.splice(i, 1); if (!this.stack.length && this.onIdle) this.onIdle(); },
  top() { return this.stack[this.stack.length - 1]; },
  toggleSound() {
    audio.ensure();
    audio.setMuted(!audio.muted);
    $('#btn-sound').textContent = audio.muted ? 'Son : off' : 'Son : on';
    $('#btn-sound').classList.toggle('off', audio.muted);
  },

  // ------------------------------------------------------------- HUD
  updateHUD(s) {
    const inside = s.flags.entered && !s.flags.exited;
    if (s.flags.chipsMode && inside) {
      this.el.moneyLabel.textContent = 'Jetons';
      this.el.money.textContent = fmtChips(s.chips).replace(/ jetons?$/, '');
      this.el.money.classList.toggle('blur', s.drunkUntil > s.timeMin);
    } else {
      this.el.moneyLabel.textContent = 'Portefeuille';
      this.el.money.textContent = fmt(s.money + (s.flags.chipsMode ? 0 : 0));
      this.el.money.classList.remove('blur');
    }
    const card = this.el.card; if (card) { card.hidden = !s.flags.card; if (s.flags.card) card.textContent = `Carte Or · ${Math.floor(s.points || 0)} pts`; }
    const debtTotal = s.debt + Math.max(0, -s.bank);
    this.el.debt.hidden = debtTotal <= 0;
    this.el.debt.textContent = 'Dette ' + fmt(debtTotal);
    this.el.revCount.textContent = `${s.revealed.size}/${REVELATIONS.length}`;
    const showTime = !inside;
    this.el.timeHud.hidden = !showTime;
    if (showTime) this.el.timeHud.textContent = this.fmtTime(s.timeMin);
  },
  fmtTime(min) { const h = Math.floor(min / 60) % 24, m = Math.floor(min % 60); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; },
  setPrompt(text) {
    if (!text) { this.el.prompt.hidden = true; return; }
    this.el.prompt.hidden = false; this.el.promptText.textContent = text;
  },
  setRoom(name) { this.el.room.textContent = name || ''; },
  banner(text, sub) {
    const b = this.el.banner; b.innerHTML = `<div class="b-title">${text}</div>${sub ? `<div class="b-sub">${sub}</div>` : ''}`;
    b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
  },
  toast(text, ms = 3200) {
    const t = document.createElement('div'); t.className = 'toast-item'; t.innerHTML = text;
    this.el.toast.appendChild(t);
    requestAnimationFrame(() => t.classList.add('in'));
    setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 400); }, ms);
  },
  flash(color = 'rgba(255,255,255,0.35)') { const f = this.el.flash; f.style.background = color; f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); },

  // ------------------------------------------------------------- dialog
  dialog: {
    lines: [], i: 0, typing: false, timer: null, resolve: null,
    run(lines, opts = {}) {
      return new Promise((resolve) => {
        this.lines = lines; this.i = 0; this.opts = opts; this.resolve = resolve;
        ui.stack.push('dialog');
        const d = ui.el.dialog; d.hidden = false;
        d.querySelector('.who').textContent = opts.speaker || '';
        d.querySelector('.who').style.color = opts.color || '#f5f1e8';
        d.querySelector('.portrait').style.setProperty('--c', opts.color || '#607d8b');
        d.querySelector('.portrait').textContent = opts.initial || (opts.speaker || '?')[0];
        d.classList.toggle('ghost', !!opts.ghost);
        this.show();
      });
    },
    show() {
      const d = ui.el.dialog, line = this.lines[this.i];
      const textEl = d.querySelector('.text'), ch = d.querySelector('.choices'), next = d.querySelector('.next');
      ch.innerHTML = ''; next.hidden = true;
      const text = typeof line === 'string' ? line : line.text;
      textEl.textContent = '';
      this.typing = true; let k = 0;
      clearInterval(this.timer);
      this.timer = setInterval(() => {
        k += 2; textEl.textContent = text.slice(0, k);
        if (k % 6 === 0) audio.talk();
        if (k >= text.length) { this.finishLine(); }
      }, 18);
    },
    finishLine() {
      clearInterval(this.timer); this.typing = false;
      const d = ui.el.dialog, line = this.lines[this.i];
      const text = typeof line === 'string' ? line : line.text;
      d.querySelector('.text').textContent = text;
      const ch = d.querySelector('.choices'), next = d.querySelector('.next');
      if (line.choices) {
        line.choices.forEach((c, idx) => {
          const b = document.createElement('button'); b.className = 'choice'; b.innerHTML = `<span class="k">${idx + 1}</span>${c.label}`;
          b.addEventListener('click', () => this.choose(c));
          ch.appendChild(b);
        });
        ch.firstChild && ch.firstChild.focus();
      } else next.hidden = false;
    },
    choose(c) {
      audio.click();
      this.close();
      if (c.run) c.run();
    },
    advance() {
      if (this.typing) { this.finishLine(); return; }
      const line = this.lines[this.i];
      if (line.choices) return;
      this.i++;
      if (this.i >= this.lines.length) this.close(); else this.show();
    },
    close() {
      clearInterval(this.timer);
      ui.el.dialog.hidden = true;
      const r = this.resolve; this.resolve = null;
      const onEnd = this.opts && this.opts.onEnd; this.opts = null;
      if (onEnd) onEnd();
      { const i = ui.stack.lastIndexOf('dialog'); if (i >= 0) ui.stack.splice(i, 1); }
      if (r) r();
      queueMicrotask(() => { if (!ui.stack.length && ui.onIdle) ui.onIdle(); });
    },
    key(e) {
      if (['Enter', ' ', 'e', 'E'].includes(e.key)) { this.advance(); return true; }
      if (e.key === 'Escape') { if (!this.lines[this.i].choices) this.close(); return true; }
      const line = this.lines[this.i];
      if (line && line.choices && /^[1-9]$/.test(e.key) && !this.typing) { const c = line.choices[+e.key - 1]; if (c) this.choose(c); return true; }
      return true;
    }
  },

  // ------------------------------------------------------------- panel (mini-games)
  panel: {
    onClose: null,
    open(html, opts = {}) {
      const p = ui.el.panel; p.hidden = false;
      p.innerHTML = `<div class="panel-inner ${opts.cls || ''}">
        <header><div><div class="p-kicker">${opts.kicker || ''}</div><h2>${opts.title || ''}</h2></div><button class="p-close" title="Quitter (Échap)">Quitter</button></header>
        <div class="p-body">${html}</div></div>`;
      p.querySelector('.p-close').addEventListener('click', () => this.close());
      this.onClose = opts.onClose || null;
      ui.stack.push('panel');
      return p.querySelector('.p-body');
    },
    close() {
      if (ui.el.panel.hidden) return;
      ui.el.panel.hidden = true; ui.el.panel.innerHTML = '';
      { const i = ui.stack.lastIndexOf('panel'); if (i >= 0) ui.stack.splice(i, 1); }
      document.body.classList.remove('zone');
      audio.setZone(false);
      const f = this.onClose; this.onClose = null; if (f) f();
      queueMicrotask(() => { if (!ui.stack.length && ui.onIdle) ui.onIdle(); });
    },
    key(e) { if (e.key === 'Escape') { this.close(); return true; } return false; }
  },

  // ------------------------------------------------------------- reveal modal
  reveal(rev, stats) {
    return new Promise((resolve) => {
      const m = ui.el.modal; m.hidden = false;
      audio.reveal();
      const text = rev.text(stats || {}).split('\n\n').map(p => `<p>${p}</p>`).join('');
      m.innerHTML = `<div class="modal-inner">
        <div class="m-kicker">Révélation ${rev.n} / ${REVELATIONS.length}</div>
        <h2>${rev.title}<span>.</span></h2>
        <div class="m-sub">${rev.sub}</div>
        <div class="m-text">${text}</div>
        <div class="m-keep"><span>À retenir</span>${rev.keep}</div>
        <button class="m-btn">Continuer</button>
      </div>`;
      ui.stack.push('modal');
      const close = () => { m.hidden = true; m.innerHTML = ''; const i = ui.stack.lastIndexOf('modal'); if (i >= 0) ui.stack.splice(i, 1); const b = $('#btn-codex'); b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse'); resolve(); queueMicrotask(() => { if (!ui.stack.length && ui.onIdle) ui.onIdle(); }); };
      m.querySelector('.m-btn').addEventListener('click', close);
      this._modalClose = close;
      setTimeout(() => { const b = m.querySelector('.m-btn'); if (b) b.focus(); }, 50); // the card may already be closed (Enter mashed)
    });
  },
  witnessCard(w) {
    return new Promise((resolve) => {
      const m = ui.el.modal; m.hidden = false;
      m.innerHTML = `<div class="modal-inner witness">
        <div class="m-kicker">Témoin recueilli</div>
        <h2>${w.name}</h2>
        <div class="m-sub">${w.sub}</div>
        <p class="m-text">Son histoire est maintenant dans ton carnet (touche C).</p>
        <button class="m-btn">Continuer</button></div>`;
      ui.stack.push('modal');
      const close = () => { m.hidden = true; m.innerHTML = ''; const i = ui.stack.lastIndexOf('modal'); if (i >= 0) ui.stack.splice(i, 1); resolve(); queueMicrotask(() => { if (!ui.stack.length && ui.onIdle) ui.onIdle(); }); };
      m.querySelector('.m-btn').addEventListener('click', close);
      this._modalClose = close;
      setTimeout(() => { const b = m.querySelector('.m-btn'); if (b) b.focus(); }, 50); // the card may already be closed (Enter mashed)
    });
  },
  modalKey(e) { if (['Escape', 'Enter', ' ', 'e', 'E'].includes(e.key)) { this._modalClose && this._modalClose(); return true; } return true; },

  // ------------------------------------------------------------- codex
  toggleCodex() { if (this.top() === 'codex') this.closeCodex(); else if (!this.isOpen()) this.openCodex(); },
  openCodex(tab = 'mecaniques') {
    const s = this.state; const c = this.el.codex; c.hidden = false; this.stack.push('codex');
    audio.click();
    const revs = REVELATIONS.map(r => {
      const on = s.revealed.has(r.id);
      return `<div class="cx-card ${on ? 'on' : ''}"><div class="cx-n">${String(r.n).padStart(2, '0')}</div><div><div class="cx-t">${on ? r.title : '???'}</div><div class="cx-s">${on ? r.sub : r.hint}</div>${on ? `<div class="cx-k">${r.keep}</div>` : ''}</div></div>`;
    }).join('');
    const wits = WITNESSES.map(w => {
      const on = s.witnesses.has(w.id);
      return `<div class="cx-card ${on ? 'on' : ''}"><div class="cx-p" style="--c:${w.color}">${on ? w.name[0] : '?'}</div><div><div class="cx-t">${on ? w.name : 'Inconnu·e'}</div><div class="cx-s">${on ? w.sub : w.where}</div>${on ? `<div class="cx-k">${w.lines[w.lines.length - 1]}</div>` : ''}</div></div>`;
    }).join('');
    c.innerHTML = `<div class="codex-inner">
      <header><h2>Le carnet</h2><div class="tabs"><button data-t="mecaniques" class="${tab === 'mecaniques' ? 'on' : ''}">Mécaniques ${s.revealed.size}/${REVELATIONS.length}</button><button data-t="temoins" class="${tab === 'temoins' ? 'on' : ''}">Témoins ${s.witnesses.size}/${WITNESSES.length}</button><button data-t="soir" class="${tab === 'soir' ? 'on' : ''}">Ce soir</button><button data-t="sources" class="${tab === 'sources' ? 'on' : ''}">Sources</button></div><button class="p-close">Fermer</button></header>
      <div class="cx-body">
        <div class="cx-tab" data-t="mecaniques" ${tab !== 'mecaniques' ? 'hidden' : ''}>${revs}</div>
        <div class="cx-tab" data-t="temoins" ${tab !== 'temoins' ? 'hidden' : ''}>${wits}</div>
        <div class="cx-tab" data-t="soir" ${tab !== 'soir' ? 'hidden' : ''}>${this.tonightHTML(s)}</div>
        <div class="cx-tab" data-t="sources" ${tab !== 'sources' ? 'hidden' : ''}>${this.sourcesHTML(s)}</div>
      </div></div>`;
    c.querySelector('.p-close').addEventListener('click', () => this.closeCodex());
    c.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => { c.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b)); c.querySelectorAll('.cx-tab').forEach(t => t.hidden = t.dataset.t !== b.dataset.t); }));
  },
  tonightHTML(s) {
    const st = s.stats;
    return `<div class="tonight">
      <div class="tn"><b>${st.spins}</b><span>tours de machine</span></div>
      <div class="tn"><b>${st.rounds}</b><span>coups aux tables</span></div>
      <div class="tn"><b>${fmt(st.wagered)}</b><span>misés au total</span></div>
      <div class="tn ${st.net < 0 ? 'neg' : ''}"><b>${fmtSigned(st.net)}</b><span>résultat</span></div>
      <div class="tn"><b>${st.celebrations}</b><span>fanfares de la machine</span></div>
      <div class="tn"><b>${st.trueWins}</b><span>vrais gains</span></div>
      <div class="tn"><b>${s.flags.entered && !s.flags.exited ? '—' : this.fmtTime(s.timeMin)}</b><span>${s.flags.entered && !s.flags.exited ? 'aucune horloge ici' : 'heure'}</span></div>
      <div class="tn"><b>${st.drinks}</b><span>verres offerts</span></div>
      ${s.flags.card ? `<div class="tn"><b>${Math.floor(s.points || 0)} pts</b><span>carte de fidélité — chaque jeton misé est enregistré</span></div>` : ''}
    </div>
    <p class="cx-note">Toutes les probabilités de ce monde sont réelles : roulette européenne à 37 cases, machines réglées entre 85 et 90 % de redistribution, baccara avec ses vraies règles. Le seul mensonge, c'est l'argent : il est faux.</p>
    <p class="cx-note"><b>Joueurs Info Service — 09 74 75 13 13</b>, tous les jours de 8 h à 2 h, appel anonyme et non surtaxé. joueurs-info-service.fr</p>`;
  },
  // every story and figure in the game, with what is real, what is composite, and where it comes from.
  // Witnesses not yet met stay anonymous so the list does not spoil the night.
  sourcesHTML(s) {
    const wits = SOURCES.witnesses.map(src => {
      const w = WITNESSES.find(x => x.id === src.id); const met = s.witnesses.has(src.id);
      return `<div class="src"><div class="src-h"><b>${met ? w.name : 'Inconnu·e — ' + w.where}</b><span class="src-st">${src.status}</span></div>${met ? `<ul>${src.refs.map(r => `<li>${r}</li>`).join('')}</ul>` : '<p class="muted">Rencontre cette personne pour voir ses sources.</p>'}</div>`;
    }).join('');
    const mecs = SOURCES.mechanics.map(src => {
      const r = REVELATIONS.find(x => x.id === src.id); const on = s.revealed.has(src.id);
      return `<div class="src"><div class="src-h"><b>${String(r.n).padStart(2, '0')} · ${on ? r.title : '???'}</b></div>${on ? `<ul>${src.refs.map(x => `<li>${x}</li>`).join('')}</ul>` : '<p class="muted">Découvre cette mécanique pour voir ses sources.</p>'}</div>`;
    }).join('');
    return `<p class="cx-note">Tout ce que racontent les témoins est documenté. Trois d'entre eux sont des personnages composites, construits à partir de sources publiques ; les autres ont existé et ont dit, à peu de chose près, ce qu'ils disent ici.</p>
      <h3 class="src-t">Témoins</h3>${wits}
      <h3 class="src-t">Mécaniques</h3>${mecs}
      <h3 class="src-t">Chiffres</h3><div class="src"><ul>${SOURCES.figures.map(x => `<li>${x}</li>`).join('')}</ul></div>
      <p class="cx-note">Une erreur, une source manquante ? Le jeu est un projet de prévention indépendant : signale-la, elle sera corrigée.</p>`;
  },
  closeCodex() { this.el.codex.hidden = true; this.el.codex.innerHTML = ''; this._pop('codex'); },
  codexKey(e) { if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') { this.closeCodex(); return true; } return true; },

  // ------------------------------------------------------------- intro / epilogue
  intro(onStart) {
    const el = this.el.intro; el.hidden = false; this.stack.push('intro');
    const list = document.body.dataset.mode === '3d' ? STORY.controls3d : STORY.controls;
    el.querySelector('#intro-controls').innerHTML = list.map(([k, v]) => `<div><kbd>${k}</kbd><span>${v}</span></div>`).join('');
    const btn = el.querySelector('#btn-start');
    let started = false;
    const go = () => {
      if (started) return; started = true; this._introGo = null;
      audio.ensure(); audio.resume();
      el.classList.add('leaving');
      setTimeout(() => { el.hidden = true; const i = this.stack.lastIndexOf('intro'); if (i >= 0) this.stack.splice(i, 1); onStart(); }, 700);
    };
    btn.addEventListener('click', go, { once: true });
    this._introGo = go;
  },
  introKey(e) { if (e.key === 'Enter') { const g = this._introGo; this._introGo = null; g && g(); return true; } return true; },
  storyCards(lines) {
    // full-screen sequential cards (opening)
    return new Promise((resolve) => {
      const el = document.createElement('div'); el.className = 'story'; document.body.appendChild(el);
      this.stack.push('modal');
      let i = 0;
      const show = () => {
        if (i >= lines.length) { el.classList.add('out'); setTimeout(() => el.remove(), 600); const k = this.stack.lastIndexOf('modal'); if (k >= 0) this.stack.splice(k, 1); this._modalClose = null; resolve(); queueMicrotask(() => { if (!this.stack.length && this.onIdle) this.onIdle(); }); return; }
        el.innerHTML = `<div class="story-line">${lines[i]}</div><div class="story-hint">Entrée pour continuer</div>`;
        el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
        i++;
      };
      this._modalClose = show;
      el.addEventListener('click', show);
      show();
    });
  },
  epilogue(s, onRestart) {
    const el = this.el.epilogue; el.hidden = false; this.stack.push('epilogue');
    const st = s.stats;
    const hours = (s.timeMin - 21 * 60) / 60;
    const debtTotal = s.debt + Math.max(0, -s.bank);
    const revs = REVELATIONS.map(r => `<li class="${s.revealed.has(r.id) ? 'on' : ''}">${String(r.n).padStart(2, '0')} · ${s.revealed.has(r.id) ? r.title : '<i>non découverte</i>'}</li>`).join('');
    el.innerHTML = `<div class="epi-inner">
      <div class="m-kicker">Fin de soirée</div>
      <h1>Rien ne va plus<span>.</span></h1>
      <div class="epi-grid">
        <div class="tn"><b>${this.fmtTime(s.timeMin)}</b><span>tu es sorti — entré à 21:00, soit ${hours.toFixed(1).replace('.', ',')} h à l'intérieur</span></div>
        <div class="tn ${st.net < 0 ? 'neg' : ''}"><b>${fmtSigned(st.net)}</b><span>résultat de la nuit</span></div>
        <div class="tn"><b>${fmt(st.wagered)}</b><span>misés en tout${st.wagered > 0 ? `, pour ${fmt(st.wagered * 0.06)} de perte moyenne attendue` : ''}</span></div>
        <div class="tn ${debtTotal > 0 ? 'neg' : ''}"><b>${fmt(debtTotal)}</b><span>de dette</span></div>
        ${s.phone && s.phone.balance > 0 ? `<div class="tn neg"><b>${fmt(s.phone.balance)}</b><span>« en attente de retrait » sur un site à l'étranger</span></div>` : ''}
        <div class="tn"><b>${st.celebrations}</b><span>fois où une machine a fait la fête</span></div>
        <div class="tn"><b>${st.trueWins}</b><span>fois où tu as vraiment gagné</span></div>
      </div>
      <div class="epi-cols">
        <div><h3>Les mécaniques</h3><ul class="epi-list">${revs}</ul></div>
        <div><h3>Ce qui est vrai</h3>
          <p>Tout ce que tu as joué ce soir utilisait les vraies probabilités. Si tu es en avance, c'est du hasard, et le hasard ne dure pas : sur mille tours, la soustraction gagne toujours.</p>
          <p>Les personnes que tu as croisées ont existé. Leurs histoires sont documentées. Aucune ne finit bien au casino.</p>
          <h3>Si tu t'es reconnu</h3>
          <p class="epi-help"><b>Joueurs Info Service — 09 74 75 13 13</b><br>tous les jours de 8 h à 2 h, anonyme, non surtaxé.<br>joueurs-info-service.fr · interdiction volontaire de jeux sur anj.fr</p>
        </div>
      </div>
      <div class="epi-actions"><button id="epi-codex">Relire le carnet</button><button id="epi-restart" class="primary">Recommencer la soirée</button></div>
      <p class="epi-foot">Jouer comporte des risques : endettement, isolement, dépendance. Pour être aidé, appelez le 09 74 75 13 13.</p>
    </div>`;
    el.querySelector('#epi-restart').addEventListener('click', onRestart);
    el.querySelector('#epi-codex').addEventListener('click', () => this.openCodex('mecaniques'));
  },

  // ------------------------------------------------------------- key routing
  handleKey(e) {
    const t = this.top();
    if (!t) return false;
    if (t === 'dialog') return this.dialog.key(e);
    if (t === 'panel') return this.panel.key(e);
    if (t === 'modal') return this.modalKey(e);
    if (t === 'codex') return this.codexKey(e);
    if (t === 'intro') return this.introKey(e);
    if (t === 'epilogue') return true;
    return false;
  }
};
