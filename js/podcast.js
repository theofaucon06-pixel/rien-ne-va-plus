// Podcast pages: theme filter, RSS copy button, and the player.
//  - Episode with a recording: a normal <audio> element plus skip buttons, speed and a remembered position.
//  - Episode without one: a spoken reading of the text by the browser's own voice (Web Speech API),
//    paragraph by paragraph, with the paragraph being read highlighted. It is a stand-in, not a recording.
// Everything degrades to plain readable HTML when scripts or speech are unavailable.
(() => {
  'use strict';

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } }
  };
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* ---------------------------------------------------------- theme filter (index) */
  const filters = $('.filters');
  if (filters) {
    filters.hidden = false;
    const rows = $$('.ep-row');
    filters.addEventListener('click', (e) => {
      const b = e.target.closest('.filter');
      if (!b) return;
      for (const f of $$('.filter', filters)) f.setAttribute('aria-pressed', String(f === b));
      const key = b.dataset.filter;
      for (const r of rows) r.hidden = key !== 'all' && !r.dataset.themes.split(' ').includes(key);
    });
  }

  /* ---------------------------------------------------------- copy the RSS address */
  for (const btn of $$('[data-copy]')) {
    btn.addEventListener('click', async () => {
      const input = $(btn.dataset.copy);
      if (!input) return;
      const done = (txt) => { const old = btn.textContent; btn.textContent = txt; setTimeout(() => { btn.textContent = old; }, 1800); };
      try { await navigator.clipboard.writeText(input.value); done('Copié ✓'); }
      catch { input.select(); done('Sélectionné'); }
    });
  }

  /* ---------------------------------------------------------- table of contents highlight */
  const tocLinks = $$('.toc a');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    const byId = new Map(tocLinks.map((a) => [a.hash.slice(1), a]));
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        for (const a of tocLinks) a.classList.toggle('on', a === byId.get(en.target.id));
      }
    }, { rootMargin: '-20% 0px -65% 0px' });
    for (const id of byId.keys()) { const el = document.getElementById(id); if (el) io.observe(el); }
  }

  /* ---------------------------------------------------------- recorded audio */
  const audioBox = $('[data-player="audio"]');
  if (audioBox) {
    const audio = $('audio', audioBox);
    const key = 'rnvp-pod-pos-' + audioBox.dataset.slug;
    const saved = parseFloat(store.get(key));
    audio.addEventListener('loadedmetadata', () => { if (saved > 5 && saved < audio.duration - 5) audio.currentTime = saved; }, { once: true });
    let last = 0;
    audio.addEventListener('timeupdate', () => { if (Math.abs(audio.currentTime - last) > 4) { last = audio.currentTime; store.set(key, String(last)); } });
    audio.addEventListener('ended', () => store.set(key, '0'));
    audioBox.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'back') audio.currentTime = Math.max(0, audio.currentTime - 15);
      if (act === 'fwd') audio.currentTime = Math.min(audio.duration || Infinity, audio.currentTime + 30);
    });
    $('[data-act="rate"]', audioBox)?.addEventListener('change', (e) => { audio.playbackRate = parseFloat(e.target.value); });
  }

  /* ---------------------------------------------------------- spoken reading */
  const box = $('[data-player="speech"]');
  if (!box) return;
  const synth = window.speechSynthesis;
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return; // keep the text; hide the player
  box.hidden = false;

  const blocks = $$('[data-tts]');
  const statusEl = $('[data-status]', box);
  const playBtn = $('[data-act="play"]', box);
  const bar = $('.progress i', box);
  const rateSel = $('[data-act="rate"]', box);
  const voiceSel = $('[data-act="voice"]', box);
  const voiceWrap = $('.voice-pick', box);
  const key = 'rnvp-pod-read-' + box.dataset.slug;
  const IDLE = statusEl.textContent;

  // Each block is read sentence by sentence: long utterances get cut off in some browsers.
  const units = blocks.map((el) => (el.textContent.match(/[^.!?…]+[.!?…]+["»”)]*\s*|[^.!?…]+$/g) || [el.textContent]).map((s) => s.trim()).filter(Boolean));

  let idx = Math.min(Math.max(parseInt(store.get(key), 10) || 0, 0), blocks.length - 1);
  let playing = false, paused = false, token = 0, voices = [], rate = 1;

  function loadVoices() {
    voices = synth.getVoices().filter((v) => /^fr/i.test(v.lang));
    voices.sort((a, b) => (/^fr[-_]FR/i.test(b.lang) - /^fr[-_]FR/i.test(a.lang)) || (b.localService - a.localService) || a.name.localeCompare(b.name));
    if (!voiceSel) return;
    const keep = store.get('rnvp-pod-voice');
    voiceSel.innerHTML = voices.map((v) => `<option value="${v.voiceURI}">${v.name}</option>`).join('');
    if (keep && voices.some((v) => v.voiceURI === keep)) voiceSel.value = keep;
    if (voiceWrap) voiceWrap.hidden = voices.length < 2;
  }
  loadVoices();
  synth.addEventListener?.('voiceschanged', loadVoices);

  const currentVoice = () => voices.find((v) => v.voiceURI === voiceSel?.value) || voices[0] || null;
  const setStatus = (t) => { statusEl.textContent = t; };
  const mark = () => {
    blocks.forEach((el, i) => el.classList.toggle('speaking', playing && i === idx));
    if (bar) bar.style.width = ((idx + (playing || idx ? 1 : 0)) / blocks.length) * 100 + '%';
  };
  const label = () => {
    const b = blocks[idx];
    const sec = b.closest('.script-sec')?.querySelector('h3')?.textContent || '';
    return `${idx + 1} / ${blocks.length}${sec ? ' · ' + sec : ''}`;
  };
  function setPlayUi(on) {
    playBtn.setAttribute('aria-pressed', String(on));
    playBtn.setAttribute('aria-label', on ? 'Mettre en pause' : (idx > 0 ? 'Reprendre la lecture' : 'Lire l’épisode à voix haute'));
    playBtn.firstElementChild.textContent = on ? '❚❚' : '▶';
  }

  function speakUnit(blockIdx, unitIdx, myToken) {
    if (myToken !== token) return;
    if (blockIdx >= blocks.length) { stop(true); setStatus('Épisode terminé.'); return; }
    if (unitIdx >= units[blockIdx].length) { speakUnit(blockIdx + 1, 0, myToken); return; }
    idx = blockIdx;
    if (unitIdx === 0) {
      store.set(key, String(idx));
      mark();
      setStatus('Lecture · ' + label());
      const r = blocks[idx].getBoundingClientRect();
      if (r.top < 160 || r.bottom > innerHeight - 40) blocks[idx].scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    }
    const u = new SpeechSynthesisUtterance(units[blockIdx][unitIdx]);
    u.lang = 'fr-FR';
    const v = currentVoice();
    if (v) { u.voice = v; u.lang = v.lang; }
    u.rate = rate;
    u.onend = () => speakUnit(blockIdx, unitIdx + 1, myToken);
    u.onerror = (ev) => { if (ev.error && !/canceled|interrupted/.test(ev.error)) { stop(false); setStatus('La lecture vocale a échoué sur ce navigateur. Le texte reste lisible ci-dessous.'); } };
    synth.speak(u);
  }

  function start(from) {
    synth.cancel();
    synth.resume(); // a cancel issued while paused can leave some engines paused
    token++;
    playing = true; paused = false;
    if (typeof from === 'number') idx = Math.min(Math.max(from, 0), blocks.length - 1);
    setPlayUi(true); mark();
    speakUnit(idx, 0, token);
  }
  function pause() { synth.pause(); paused = true; playing = false; setPlayUi(false); mark(); setStatus('En pause · ' + label()); }
  function resume() { synth.resume(); paused = false; playing = true; setPlayUi(true); mark(); setStatus('Lecture · ' + label()); }
  function stop(finished) {
    token++; synth.cancel();
    playing = false; paused = false;
    if (finished) { idx = 0; store.set(key, '0'); }
    setPlayUi(false); mark();
    if (!finished) setStatus(IDLE);
  }

  playBtn.addEventListener('click', () => { if (playing) pause(); else if (paused) resume(); else start(idx); });
  box.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'stop') { stop(false); idx = 0; store.set(key, '0'); mark(); setPlayUi(false); }
    if (act === 'next') start(Math.min(idx + 1, blocks.length - 1));
    if (act === 'prev') start(Math.max(idx - 1, 0));
  });
  rateSel?.addEventListener('change', () => { rate = parseFloat(rateSel.value) || 1; if (playing) start(idx); });
  voiceSel?.addEventListener('change', () => { store.set('rnvp-pod-voice', voiceSel.value); if (playing) start(idx); });
  addEventListener('pagehide', () => synth.cancel());

  if (idx > 0) { setStatus('Reprendre à la partie ' + label()); setPlayUi(false); }
  mark();
})();

if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
