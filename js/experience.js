import { Multiplayer } from "./multiplayer.js";
import { COLORS, EMOTES, PREDICTIONS, REDS } from "./shared.js";
import { ROOMS, WORLD } from "./world.js";
import { REVELATIONS, STORY } from "./content.js";
import { ui } from "./ui.js";
const $ = (s) => document.querySelector(s);
const escape = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const roomName = (id) =>
  ROOMS.find((r) => r.id === id)?.label || "En exploration";
const button = (text, action, cls = "", disabled = false) =>
  `<button class="ex-button ${cls}" data-action="${action}" ${disabled ? "disabled" : ""}>${text}</button>`;

export function createExperience(story) {
  const state = story.state,
    net = new Multiplayer(state);
  let view = "",
    tab = "explore",
    signature = "",
    color = 0,
    target = null,
    lastFocus = null,
    lastTick = 0;
  const dialog = document.createElement("dialog");
  dialog.className = "experience-dialog";
  dialog.setAttribute("aria-labelledby", "ex-title");
  document.body.append(dialog);
  const tools = document.createElement("div");
  tools.className = "experience-tools";
  tools.innerHTML =
    '<button class="mission-pill" id="mission-guide"><small>TON FIL ROUGE</small><b>Premiers pas dans le casino</b><span>Carte, indices et découvertes ↗</span></button><button class="calm-toggle" id="calm-toggle" title="Réduire les animations">Confort</button>';
  document.body.append(tools);
  const notice = document.createElement("div");
  notice.className = "sr-only";
  notice.setAttribute("role", "status");
  notice.setAttribute("aria-live", "polite");
  document.body.append(notice);
  let calm = false;
  try {
    calm =
      localStorage.getItem("rnvp-calm") === "1" ||
      (localStorage.getItem("rnvp-calm") === null &&
        matchMedia("(prefers-reduced-motion: reduce)").matches);
  } catch {}
  document.body.classList.toggle("calm-mode", calm);
  function setCalm() {
    calm = !calm;
    document.body.classList.toggle("calm-mode", calm);
    try {
      localStorage.setItem("rnvp-calm", calm ? "1" : "0");
    } catch {}
    if (dialog.open) render();
  }
  function close() {
    dialog.close();
  }
  dialog.addEventListener("close", () => {
    const i = ui.stack.lastIndexOf("experience");
    if (i >= 0) ui.stack.splice(i, 1);
    view = "";
    lastFocus?.focus?.();
    if (!ui.stack.length) ui.onIdle?.();
  });
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        close();
    }
  });
  function open(next) {
    view = next;
    signature = "";
    if (!dialog.open) {
      lastFocus = document.activeElement;
      ui.stack.push("experience");
      dialog.showModal();
    }
    render();
  }
  function shell(title, kicker, html) {
    dialog.innerHTML = `<header class="ex-head"><div><small>${kicker}</small><h2 id="ex-title">${title}</h2></div><button class="ex-close" data-action="close" aria-label="Fermer">×</button></header><div class="ex-body">${html}<p id="ex-error" class="ex-error" role="alert"></p></div>`;
  }
  function message(text) {
    const e = dialog.querySelector("#ex-error");
    if (e) e.textContent = text;
    else {
      notice.textContent = text;
      ui.toast(escape(text));
    }
  }
  function mission() {
    if (target) {
      const dx = target.x - state.player.x,
        dy = target.y - state.player.y,
        d = Math.hypot(dx, dy);
      if (d < 100) return `Te voilà : ${target.label}`;
      const dir = [
        "Est",
        "Sud-est",
        "Sud",
        "Sud-ouest",
        "Ouest",
        "Nord-ouest",
        "Nord",
        "Nord-est",
      ][(Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8];
      return `${target.label} · ${dir} · ${Math.round(d / 40)} m`;
    }
    if (!state.flags.entered) return "Pousse la porte du hall";
    if (!state.witnesses.size) return "Rencontre ton premier témoin";
    if (!state.stats.rounds && !state.stats.spins)
      return "Observe un jeu et ses mécanismes";
    if (state.revealed.size < 3)
      return `Décrypte trois mécanismes · ${Math.min(3, state.revealed.size)}/3`;
    return `${state.revealed.size}/15 clés découvertes · partage tes idées`;
  }
  function guide() {
    shell(
      "La curiosité est ta meilleure mise.",
      "BIENVENUE DE L’AUTRE CÔTÉ",
      `<div class="ex-grid"><div><div class="guide-step"><span>01</span><div><h3>Explore à ton rythme.</h3><p>Entre dans le hall, échange avec les témoins et observe les jeux. La carte t’aide à retrouver ton chemin.</p></div></div><div class="guide-step"><span>02</span><div><h3>Repère les ficelles.</h3><p>Les mises sont fictives. Ton carnet rassemble les mécanismes que tu découvres, les récits et leurs sources. Tu peux lire les clés depuis la carte sans miser.</p></div></div><div class="guide-step"><span>03</span><div><h3>Partage les déclics.</h3><p>Invite tes amis, explorez ensemble, testez vos intuitions à la roulette commune et répondez à un quiz collectif.</p></div></div></div><div class="ex-card"><span class="section-kicker">LES REPÈRES</span><h3>Tout commence par une question.</h3><p>Les personnages historiques sont mis en scène ; certains témoins sont composites. Le carnet distingue les récits documentés, les reconstitutions et les personnages fictifs.</p><div class="ex-controls">${(document.body.dataset.mode === "3d" ? STORY.controls3d : STORY.controls).map(([k, v]) => `<span><kbd>${escape(k)}</kbd> ${escape(v)}</span>`).join("")}<span><kbd>P</kbd> Carte</span><span><kbd>G</kbd> Amis</span></div><div class="ex-actions">${button(calm ? "Animations réduites : oui" : "Animations réduites : non", "calm")}${button("C’est parti →", "close", "primary")}</div><p><a href="https://www.joueurs-info-service.fr/" target="_blank" rel="noopener noreferrer">Joueurs Info Service ↗</a></p></div></div>`,
    );
  }
  function mapMarkup() {
    return `<svg class="map-svg" viewBox="-30 -40 ${WORLD.w + 60} ${WORLD.h + 80}" role="img" aria-label="Plan du casino, ta position et celle de tes amis">${ROOMS.map((r) => `<g><rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="18" fill="${state.visited.has(r.id) ? "#254b37" : "#123526"}" stroke="${target?.id === r.id ? "#f2d392" : "#637b58"}" stroke-width="${target?.id === r.id ? 12 : 4}"/>${r.label && r.w > 350 ? `<text x="${r.x + r.w / 2}" y="${r.y + r.h / 2}" text-anchor="middle" fill="#bdcba9" font-size="92">${escape(r.label.replace("La salle des ", "").replace("La salle de ", "").replace("Le ", "").replace("Les ", ""))}</text>` : ""}</g>`).join("")}<g id="map-people"></g></svg>`;
  }
  function map() {
    shell(
      "Ne perds pas le fil.",
      "CARTE & DÉCOUVERTES",
      `<div class="ex-grid"><div>${mapMarkup()}<div class="map-key"><span><i></i>Toi</span><span>● Tes amis dans le salon</span></div><p>Choisis un lieu pour afficher une direction pendant l’exploration.</p><div class="ex-actions">${ROOMS.filter(
        (r) => r.label && !["ruelle", "corridor", "hallway"].includes(r.id),
      )
        .map((r) =>
          button(
            escape(r.label),
            `route:${r.id}`,
            target?.id === r.id ? "primary" : "",
          ),
        )
        .join(
          "",
        )}${target ? button("Arrêter le guidage", "unroute") : ""}</div></div><div><span class="section-kicker">TON CARNET DE DÉCOUVERTES</span><h3>${state.revealed.size} clés sur 15</h3><div class="ex-progress"><i style="width:${(state.revealed.size / 15) * 100}%"></i></div><p>${escape(mission())}. Les idées comptent davantage que les jetons.</p><div class="discovery-list">${REVELATIONS.map((r) => `<details class="discovery-item"><summary>${state.revealed.has(r.id) ? "✓" : "○"} ${String(r.n).padStart(2, "0")} · ${escape(r.sub)}</summary><p>${escape(r.keep)}</p><p><b>À explorer</b>${escape(r.hint)}</p></details>`).join("")}</div></div></div>`,
    );
    mapPeople();
  }
  function mapPeople() {
    const el = dialog.querySelector("#map-people");
    if (!el) return;
    el.innerHTML = [
      { ...state.player, id: "me", name: "Toi", color: "#f2d392" },
      ...net.peers.values(),
    ]
      .map(
        (p) =>
          `<g><circle cx="${p.x}" cy="${p.y}" r="24" fill="${p.color}" stroke="#052317" stroke-width="8"/><text x="${p.x}" y="${p.y - 38}" text-anchor="middle" fill="#f3ecd9" font-size="85">${escape(p.name)}</text></g>`,
      )
      .join("");
  }
  function joinForm() {
    const code =
      new URLSearchParams(location.search)
        .get("room")
        ?.replace(/[^A-Za-z2-9]/g, "")
        .slice(0, 6)
        .toUpperCase() || "";
    let name = "";
    try {
      name = localStorage.getItem("rnvp-name") || "";
    } catch {}
    shell(
      "C’est encore mieux ensemble.",
      "SALONS PRIVÉS · 2 À 8 PERSONNES",
      `<div class="ex-grid"><section class="ex-card"><span class="section-kicker">TA PLACE AUTOUR DE LA TABLE</span><h3>Choisis ton nom.</h3><p>Aucun compte à créer. Un prénom ou un pseudo suffit.</p><form id="join-form"><label for="player-name">Ton pseudo</label><input id="player-name" name="name" maxlength="20" autocomplete="nickname" placeholder="Camille" value="${escape(name)}" required><label>Ta couleur</label><div class="ex-colors" role="group" aria-label="Couleur de l’avatar">${COLORS.map((c, i) => `<button type="button" data-color="${i}" style="--avatar:${c}" aria-label="Couleur ${i + 1}" aria-pressed="${i === color}"></button>`).join("")}</div><label for="room-code">Un code d’invitation ?</label><input id="room-code" name="code" maxlength="6" pattern="[A-Za-z2-9]{6}" autocomplete="off" placeholder="ABC234" value="${code}"><div class="ex-actions"><button type="submit" class="ex-button primary" ${net.status === "connecting" ? "disabled" : ""}>${code ? "Rejoindre le salon" : "Créer ou rejoindre →"}</button></div><p>Laisse le code vide pour créer ton salon.</p></form></section><section><div class="guide-step"><span>↗</span><div><h3>Retrouve tes amis.</h3><p>Partage le lien du salon. Chacun choisit la version 3D ou 2D et vous vous retrouvez dans le même casino.</p></div></div><div class="guide-step"><span>◇</span><div><h3>Faites des découvertes.</h3><p>Vos avatars se déplacent en direct. La carte vous situe, les messages rapides vous rapprochent et les découvertes s’additionnent.</p></div></div><div class="guide-step"><span>?</span><div><h3>Comparez vos intuitions.</h3><p>Un même tirage de roulette pour tous, puis cinq questions à résoudre ensemble. Vos parties individuelles gardent leurs propres jetons.</p></div></div></section></div>`,
    );
    dialog.querySelector("#join-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.currentTarget,
        submit = form.querySelector("[type=submit]"),
        name = form.elements.name.value.trim(),
        code = form.elements.code.value.trim();
      if (!name) return;
      submit.disabled = true;
      submit.textContent = "Connexion…";
      try {
        await net.join(name, code, color);
        try {
          localStorage.setItem("rnvp-name", name);
        } catch {}
        render();
      } catch (err) {
        message(err.message);
        submit.disabled = false;
        submit.textContent = "Réessayer →";
      }
    });
  }
  function playerRows(r) {
    return `<div class="player-list">${r.players.map((p) => `<div class="player-row"><span class="player-icon" style="--avatar:${p.color}">${escape(p.name[0])}</span><div><b>${escape(p.name)}</b><small>${p.online ? escape(roomName(p.room)) : "Reconnexion…"}${p.id === r.host ? " · anime le salon" : ""}</small></div>${p.id === net.session.id ? '<span class="you-label">TOI</span>' : ""}</div>`).join("")}</div>`;
  }
  function explore(r) {
    return `<div class="ex-grid"><section><span class="section-kicker">L’ÉQUIPE</span>${playerRows(r)}<div class="ex-actions">${button("Explorer le casino →", "play", "primary")}${button("Voir la carte", "map")}</div></section><section class="ex-card"><span class="section-kicker">VOTRE CURIOSITÉ COLLECTIVE</span><h3>${r.discoveries.length} clés découvertes ensemble</h3><div class="ex-progress"><i style="width:${(r.discoveries.length / 15) * 100}%"></i></div><p>Explorez des lieux différents puis retrouvez-vous. Chacun enrichit le carnet du groupe.</p><div class="ex-actions">${Object.entries(
      EMOTES,
    )
      .map(([id, text]) => button(escape(text), `emote:${id}`))
      .join(
        "",
      )}</div><div class="room-feed" aria-label="Activité du salon">${r.feed
      .slice(-6)
      .reverse()
      .map((e) => `<p>${escape(e.text)}</p>`)
      .join("")}</div></section></div>`;
  }
  function quiz(r) {
    const q = r.quiz,
      host = r.host === net.session.id;
    if (!q)
      return `<div class="ex-grid"><div><span class="section-kicker">LE DÉFI DES CURIEUX</span><h3>Cinq questions. Plusieurs regards.</h3><p>Chacun répond de son côté, puis vous découvrez la correction ensemble. Les points récompensent les connaissances.</p>${host ? button("Lancer le quiz collectif", "quiz-start", "primary", r.players.filter((p) => p.online).length < 2) : "<p>La personne qui anime le salon peut lancer le quiz.</p>"}<p>Au moins deux personnes doivent être connectées.</p></div><section class="ex-card">${playerRows(r)}</section></div>`;
    if (q.phase === "complete")
      return `<div class="ex-grid"><div><span class="section-kicker">LE QUIZ EST TERMINÉ</span><h3>Un peu moins de hasard.<br>Un peu plus de recul.</h3><p>Le meilleur résultat, c’est ce que vous retenez ensemble. Repartez explorer un mécanisme qui vous a surpris.</p><div class="ex-actions">${button("Repartir explorer", "play", "primary")}${host ? button("Un autre quiz", "quiz-start") : ""}</div></div><div class="ex-card">${r.players.map((p) => `<div class="score-row"><span>${escape(p.name)}</span><b>${q.scores[p.id] || 0} / ${q.total}</b></div>`).join("")}</div></div>`;
    const answered = q.answered.includes(net.session.id),
      reveal = q.phase === "reveal";
    return `<div class="ex-grid"><div><span class="section-kicker">QUESTION ${q.index + 1} / ${q.total}</span><h3 class="quiz-question">${escape(q.question.q)}</h3><div class="quiz-answers">${q.question.a.map((a, i) => `<button class="ex-button ${reveal && q.correct === i ? "correct" : ""} ${reveal && q.answers[net.session.id] === i ? "selected" : ""}" data-action="answer:${i}" ${answered || reveal ? "disabled" : ""}>${String.fromCharCode(65 + i)} · ${escape(a)}</button>`).join("")}</div>${reveal ? `<div class="quiz-feedback"><b>${q.answers[net.session.id] === q.correct ? "Bien vu !" : "La clé pour comprendre"}</b><p>${escape(q.why)}</p></div>` : `<p>${answered ? "Réponse enregistrée. Échangez après la correction." : "Choisis une réponse. Elle reste secrète jusqu’à la correction."}</p><span class="quiz-timer" id="quiz-countdown"></span>`}${reveal ? (host ? `<div class="ex-actions">${button(q.index + 1 === q.total ? "Voir le bilan →" : "Question suivante →", "quiz-next", "primary")}</div>` : "<p>La personne qui anime passe à la suite quand vous êtes prêts.</p>") : ""}</div><section class="ex-card"><span class="section-kicker">AUTOUR DE TOI</span>${playerRows(r)}<p>${q.answered.length} réponse(s) reçue(s).</p></section></div>`;
  }
  function table(r) {
    const t = r.table,
      host = r.host === net.session.id,
      done = t.result !== null,
      mine = t.choices[net.session.id];
    return `<div class="ex-grid"><div><span class="section-kicker">LA ROULETTE COMMUNE · TOUR ${t.round}</span><h3>La bille a-t-elle une mémoire ?</h3><p>Choisissez une prédiction. Tout le salon reçoit le même tirage. Aucune mise, aucun solde à risquer : juste votre intuition à observer.</p><div class="roulette-number ${done ? (t.result === 0 ? "" : REDS.includes(t.result) ? "red" : "black") : ""}">${done ? t.result : "?"}</div><div class="history-strip">${t.history.map((n) => `<span>${n}</span>`).join("")}</div><p>Les derniers tirages, du plus récent au plus ancien.</p></div><section class="ex-card"><span class="section-kicker">VOTRE PROCHAIN DÉCLIC</span><div class="ex-actions">${Object.entries(
      PREDICTIONS,
    )
      .map(
        ([id, label]) =>
          `<button class="ex-button" data-action="predict:${id}" aria-pressed="${id === mine}" ${done ? "disabled" : ""}>${label}</button>`,
      )
      .join(
        "",
      )}</div><p>${Object.keys(t.choices).length} prédiction(s) enregistrée(s).</p>${done ? `<div class="quiz-feedback"><b>${t.winners.includes(net.session.id) ? "Ton intuition était juste ce tour-ci." : "Un tirage ne suit pas nos attentes."}</b><p>Rouge, noir, pair ou impair : 18 cases sur 37. Le zéro ne correspond à aucun de ces choix. Une série précédente ne change pas le tirage suivant.</p><p>Un succès sur ce tour ne donne aucun pouvoir sur le suivant.</p></div>` : "<p>La personne qui anime lance le tirage quand tout le monde est prêt.</p>"}<div class="ex-actions">${host ? button(done ? "Observer un autre tour" : "Lancer le tirage commun", done ? "table-next" : "spin", "primary", !done && !Object.keys(t.choices).length) : ""}</div></section></div>`;
  }
  function lobby() {
    if (!net.room) {
      joinForm();
      return;
    }
    const r = net.room;
    shell(
      "Votre soirée, ensemble.",
      "LE SALON DES CURIEUX",
      `<div class="room-heading"><div><span class="section-kicker">CODE DU SALON</span><b class="room-code">${r.code}</b></div><div><span class="ex-status"><span class="live-dot"></span>${net.status === "online" ? `${r.players.filter((p) => p.online).length}/8 personnes connectées` : "Connexion au salon…"}</span><div class="ex-actions">${button("Copier l’invitation ↗", "invite")}${button("Quitter le salon", "leave")}</div></div></div><div class="ex-tabs" role="group" aria-label="Activités du salon">${[
        ["explore", "Explorer ensemble"],
        ["table", "Roulette commune"],
        ["quiz", "Quiz collectif"],
      ]
        .map(
          ([id, label]) =>
            `<button class="ex-button ${tab === id ? "primary" : ""}" data-action="tab:${id}" aria-pressed="${tab === id}">${label}</button>`,
        )
        .join(
          "",
        )}</div>${tab === "quiz" ? quiz(r) : tab === "table" ? table(r) : explore(r)}`,
    );
  }
  function render() {
    if (view === "map") map();
    else if (view === "guide") guide();
    else lobby();
  }
  function begin() {
    close();
    if (!state.started) {
      const cont = $("#btn-continue");
      if (cont && !cont.hidden) cont.click();
      else $("#btn-start").click();
    }
  }
  async function act(action) {
    if (action === "close") return close();
    if (action === "map") return open("map");
    if (action === "play") return begin();
    if (action === "calm") return setCalm();
    if (action.startsWith("route:")) {
      const r = ROOMS.find((r) => r.id === action.slice(6));
      if (r) {
        target = {
          id: r.id,
          label: r.label,
          x: r.x + r.w / 2,
          y: r.y + r.h / 2,
        };
        close();
      }
      return;
    }
    if (action === "unroute") {
      target = null;
      render();
      return;
    }
    if (action.startsWith("tab:")) {
      tab = action.slice(4);
      render();
      return;
    }
    if (action === "invite") {
      const url = new URL(location.href);
      url.search = "";
      url.hash = "";
      url.searchParams.set("room", net.room.code);
      try {
        await navigator.clipboard.writeText(url.href);
        message("Lien copié. Envoie-le à tes amis.");
      } catch {
        const el = document.createElement("div");
        el.className = "invite-preview";
        el.textContent = url.href;
        dialog.querySelector(".room-heading").after(el);
        message("Sélectionne ce lien pour le copier.");
      }
      return;
    }
    if (action === "leave") {
      await net.leave();
      return;
    }
    let data;
    if (action.startsWith("emote:"))
      data = { type: "emote", emote: action.slice(6) };
    else if (action === "quiz-start") data = { type: action };
    else if (action === "quiz-next")
      data = { type: action, id: net.room.quiz.id, index: net.room.quiz.index };
    else if (action.startsWith("answer:"))
      data = {
        type: "quiz-answer",
        id: net.room.quiz.id,
        index: net.room.quiz.index,
        answer: Number(action.slice(7)),
      };
    else if (action.startsWith("predict:"))
      data = {
        type: "predict",
        round: net.room.table.round,
        choice: action.slice(8),
      };
    else if (["spin", "table-next"].includes(action))
      data = { type: action, round: net.room.table.round };
    if (data) await net.action(data);
  }
  dialog.addEventListener("click", async (e) => {
    const c = e.target.closest("[data-color]");
    if (c) {
      color = Number(c.dataset.color);
      for (const b of dialog.querySelectorAll("[data-color]"))
        b.setAttribute("aria-pressed", String(b === c));
      return;
    }
    const b = e.target.closest("[data-action]");
    if (!b) return;
    const action = b.dataset.action;
    b.disabled = true;
    try {
      await act(action);
    } catch (err) {
      message(err.message);
    } finally {
      if (b.isConnected) b.disabled = false;
    }
  });
  window.addEventListener(
    "keydown",
    (e) => {
      if (dialog.open) {
        e.stopImmediatePropagation();
        return;
      }
      if (
        e.target.closest?.("input,textarea,select,[contenteditable]") ||
        e.ctrlKey ||
        e.metaKey
      )
        return;
      if (
        (e.key.toLowerCase() === "g" || e.key.toLowerCase() === "p") &&
        (!ui.isOpen() || ui.top() === "intro")
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();
        open(e.key.toLowerCase() === "g" ? "lobby" : "map");
      }
    },
    true,
  );
  for (const id of ["btn-multi", "btn-friends"])
    $("#" + id)?.addEventListener("click", () => open("lobby"));
  for (const id of ["btn-map", "mission-guide"])
    $("#" + id)?.addEventListener("click", () => open("map"));
  for (const id of ["btn-how", "btn-accessibility", "calm-toggle"])
    $("#" + id)?.addEventListener("click", () => open("guide"));
  net.addEventListener("problem", (e) => message(e.detail));
  let lastQuiz = "";
  net.addEventListener("change", () => {
    $("#online-count").textContent = net.room
      ? String(net.room.players.filter((p) => p.online).length)
      : "";
    const r = net.room,
      key = r
        ? JSON.stringify({
            status: net.status,
            players: r.players.map((p) => [p.id, p.name, p.online, p.room]),
            host: r.host,
            discoveries: r.discoveries,
            feed: r.feed.map((f) => f.id),
            quiz: r.quiz,
            table: r.table,
          })
        : net.status;
    if (dialog.open && view === "lobby" && key !== signature) {
      signature = key;
      if (net.room || net.status !== "connecting") render();
    }
    const q = r?.quiz,
      quizKey = q ? `${q.id}:${q.index}:${q.phase}` : "";
    if (q && quizKey !== lastQuiz) {
      lastQuiz = quizKey;
      if (q.phase === "question" && state.started) {
        notice.textContent =
          "Une question collective vous attend dans le salon.";
        if (!dialog.open)
          ui.toast("Une question vous attend : ouvre <b>Entre amis</b>.");
      }
    }
  });
  const invited = new URLSearchParams(location.search).get("room");
  for (const a of document.querySelectorAll("[data-mode-link]")) {
    const url = new URL(a.href);
    if (invited) url.searchParams.set("room", invited);
    a.href = url.href;
  }
  if (invited) setTimeout(() => open("lobby"), 200);
  return {
    net,
    open,
    frame(dt) {
      net.frame(dt);
      lastTick += dt;
      if (lastTick < 0.25) return;
      lastTick = 0;
      $("#mission-guide b").textContent = mission();
      $("#mission-guide small").textContent = target
        ? "TA DIRECTION"
        : "TON FIL ROUGE";
      if (dialog.open && view === "map") mapPeople();
      const timer = dialog.querySelector("#quiz-countdown");
      if (timer && net.room?.quiz)
        timer.textContent = `${Math.max(0, Math.ceil((net.room.quiz.deadline - Date.now()) / 1000))} s pour répondre`;
    },
  };
}
