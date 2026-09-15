// Shared rules for the Supabase authority. No database or browser dependencies.
import {
  QUIZ,
  REVELATIONS,
  WORLD,
  PLAYER_START,
  roomAt,
  COLORS,
  EMOTES,
  PREDICTIONS,
  predictionWins,
} from "./content.mjs";
export function randomInt(max) {
  const limit = Math.floor(0x100000000 / max) * max;
  const bytes = new Uint32Array(1);
  do {
    crypto.getRandomValues(bytes);
  } while (bytes[0] >= limit);
  return bytes[0] % max;
}
export function uid() {
  return crypto.randomUUID().replaceAll("-", "");
}
const validDiscoveries = new Set(REVELATIONS.map((r) => r.id));
const safeName = (v) =>
  String(v || "")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N} _-]/gu, "")
    .trim()
    .slice(0, 20) || "Explorateur";
const fail = (status, message) => {
  throw Object.assign(new Error(message), { status });
};

export function createEngine({ now = Date.now, random = randomInt } = {}) {
  const broadcast = (r) => {
    r.dirty = true;
  };
  function log(r, text, kind = "info") {
    r.feed.push({ id: ++r.sequence, text, kind, at: now() });
    r.feed = r.feed.slice(-25);
    broadcast(r);
  }
  function snapshot(r) {
    const q = r.quiz,
      question = q && QUIZ[q.order[q.index]];
    return {
      code: r.code,
      host: r.host,
      createdAt: r.createdAt,
      players: [...r.players.values()].map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        x: p.x,
        y: p.y,
        yaw: p.yaw,
        moving: p.moving,
        room: p.room,
        online: !!p.stream,
        discoveries: p.discoveries,
        emote: p.emote,
        emoteUntil: p.emoteUntil,
      })),
      discoveries: [
        ...new Set([...r.players.values()].flatMap((p) => p.discoveries)),
      ],
      feed: r.feed,
      quiz: q
        ? {
            id: q.id,
            phase: q.phase,
            index: q.index,
            total: q.order.length,
            deadline: q.deadline,
            question: question && { q: question.q, a: question.a },
            answered: Object.keys(q.answers),
            scores: q.scores,
            ...(q.phase !== "question"
              ? {
                  correct: question?.ok,
                  why: question?.why,
                  answers: q.answers,
                }
              : {}),
          }
        : null,
      table: r.table,
    };
  }
  function revealQuiz(r) {
    const q = r.quiz;
    if (!q || q.phase !== "question") return;
    q.phase = "reveal";
    const ok = QUIZ[q.order[q.index]].ok;
    for (const [id, a] of Object.entries(q.answers))
      if (a === ok) q.scores[id] = (q.scores[id] || 0) + 1;
    broadcast(r);
  }
  function checkAnswers(r) {
    const active = [...r.players.values()].filter((p) => p.stream);
    if (
      active.length &&
      active.every((p) => Object.hasOwn(r.quiz?.answers || {}, p.id))
    )
      revealQuiz(r);
  }
  function remove(r, p) {
    r.players.delete(p.id);

    log(r, `${p.name} a quitté le salon.`);
    if (r.host === p.id)
      r.host =
        [...r.players.values()].find((p) => p.stream)?.id ||
        r.players.keys().next().value;
    if (r.players.size) checkAnswers(r);
  }
  function createRoom(code) {
    return {
      code,
      players: new Map(),
      host: null,
      createdAt: now(),
      feed: [],
      sequence: 0,
      quiz: null,
      table: { round: 1, choices: {}, result: null, history: [] },
      dirty: true,
      heartbeat: now(),
    };
  }
  function join(r, b, tokenHash) {
    if (r.players.size >= 8) fail(409, "Ce salon est complet (8 personnes).");
    const id = uid(),
      used = new Set([...r.players.values()].map((p) => p.color)),
      requested = COLORS[Number(b.color)];
    const p = {
      id,
      tokenHash,
      name: safeName(b.name),
      color:
        requested && !used.has(requested)
          ? requested
          : COLORS.find((c) => !used.has(c)),
      x: PLAYER_START.x,
      y: PLAYER_START.y,
      yaw: 0,
      moving: false,
      room: "street",
      discoveries: [],
      lastSeen: now(),
      stream: true,
      emote: null,
      emoteUntil: 0,
      lastAction: 0,
    };
    r.players.set(id, p);
    if (!r.host) r.host = id;
    log(r, `${p.name} rejoint l'exploration.`);
    return p;
  }
  function expire(r) {
    const t = now();
    for (const p of [...r.players.values()]) {
      p.stream = t - p.lastSeen < 10000;
      if (t - p.lastSeen > 60000) remove(r, p);
    }
    if (r.quiz?.phase === "question" && t >= r.quiz.deadline) revealQuiz(r);
    const host = r.players.get(r.host);
    if (host && !host.stream && t - host.lastSeen > 15000) {
      const next = [...r.players.values()].find((p) => p.stream);
      if (next) {
        r.host = next.id;
        log(r, `${next.name} anime maintenant le salon.`);
      }
    }
    if (r.quiz?.phase === "question") checkAnswers(r);
  }
  function execute(r, tokenHash, mode, b = {}) {
    const p = [...r.players.values()].find((p) => p.tokenHash === tokenHash);
    if (!p) fail(401, "Ta session a expiré. Rejoins à nouveau le salon.");
    p.lastSeen = now();
    p.stream = true;
    const t = now();
    if (!p.rate || p.rate.until < t) p.rate = { count: 0, until: t + 1000 };
    if (++p.rate.count > 12)
      fail(429, "Trop de demandes. Réessaie dans un instant.");
    if (mode === "leave") {
      remove(r, p);
      return p;
    }
    if (mode === "resume") return p;
    const hostOnly = () => {
      if (p.id !== r.host)
        fail(
          403,
          "Seule la personne qui anime le salon peut lancer cette action.",
        );
    };
    switch (b.type) {
      case "position":
        if (
          !Number.isFinite(b.x) ||
          !Number.isFinite(b.y) ||
          !Number.isFinite(b.yaw)
        )
          fail(400, "Position invalide.");
        p.x = Math.max(0, Math.min(WORLD.w, b.x));
        p.y = Math.max(0, Math.min(WORLD.h, b.y));
        p.yaw = b.yaw % (Math.PI * 2);
        p.moving = b.moving === true;
        p.room = roomAt(p.x, p.y)?.id || "street";
        if (Array.isArray(b.discoveries))
          p.discoveries = [
            ...new Set(b.discoveries.filter((d) => validDiscoveries.has(d))),
          ].slice(0, 15);
        break;
      case "ping":
        break;
      case "emote":
        if (!Object.hasOwn(EMOTES, b.emote)) fail(400, "Message inconnu.");
        if (now() - p.lastAction < 2000)
          fail(429, "Attends un instant avant le prochain message.");
        p.lastAction = now();
        p.emote = b.emote;
        p.emoteUntil = now() + 5000;
        log(r, `${p.name} : ${EMOTES[b.emote]}`, "emote");
        break;
      case "quiz-start": {
        hostOnly();
        if (r.quiz && r.quiz.phase !== "complete")
          fail(409, "Le quiz est déjà en cours.");
        if ([...r.players.values()].filter((p) => p.stream).length < 2)
          fail(
            409,
            "Attends au moins une autre personne pour le quiz collectif.",
          );
        const order = QUIZ.map((_, i) => i);
        for (let i = order.length - 1; i > 0; i--) {
          const j = random(i + 1);
          [order[i], order[j]] = [order[j], order[i]];
        }
        r.quiz = {
          id: uid(),
          order: order.slice(0, 5),
          index: 0,
          phase: "question",
          answers: {},
          scores: {},
          deadline: now() + 35000,
        };
        log(
          r,
          "Le quiz collectif commence. Cinq questions pour démêler le hasard.",
        );
        break;
      }
      case "quiz-answer": {
        const q = r.quiz;
        if (
          !q ||
          q.phase !== "question" ||
          b.id !== q.id ||
          b.index !== q.index ||
          now() >= q.deadline
        )
          fail(409, "Cette question est terminée.");
        if (
          !Number.isInteger(b.answer) ||
          b.answer < 0 ||
          b.answer >= QUIZ[q.order[q.index]].a.length
        )
          fail(400, "Réponse invalide.");
        if (Object.hasOwn(q.answers, p.id))
          fail(409, "Ta réponse a déjà été enregistrée.");
        q.answers[p.id] = b.answer;
        checkAnswers(r);
        break;
      }
      case "quiz-next": {
        hostOnly();
        const q = r.quiz;
        if (!q || q.phase !== "reveal" || b.id !== q.id || b.index !== q.index)
          fail(409, "Attends la correction de cette question.");
        if (q.index === q.order.length - 1) q.phase = "complete";
        else {
          q.index++;
          q.phase = "question";
          q.answers = {};
          q.deadline = now() + 35000;
        }
        break;
      }
      case "predict":
        if (r.table.result !== null || b.round !== r.table.round)
          fail(409, "Ce tour est terminé.");
        if (!Object.hasOwn(PREDICTIONS, b.choice)) fail(400, "Choix inconnu.");
        r.table.choices[p.id] = b.choice;
        break;
      case "spin": {
        hostOnly();
        const t = r.table;
        if (t.result !== null || b.round !== t.round)
          fail(409, "Ce tour est déjà terminé.");
        if (!Object.keys(t.choices).length)
          fail(409, "Choisissez une prédiction avant de lancer.");
        t.result = random(37);
        t.winners = Object.entries(t.choices)
          .filter(([id, c]) => r.players.has(id) && predictionWins(c, t.result))
          .map(([id]) => id);
        t.history = [t.result, ...t.history].slice(0, 12);
        break;
      }
      case "table-next":
        hostOnly();
        if (r.table.result === null || b.round !== r.table.round)
          fail(409, "Le tour est encore ouvert.");
        r.table = {
          round: r.table.round + 1,
          choices: {},
          result: null,
          history: r.table.history,
        };
        break;
      default:
        fail(400, "Action inconnue.");
    }
    return p;
  }
  return { createRoom, join, execute, expire, snapshot };
}
export function decode(data) {
  return { ...data, players: new Map(data.players.map((p) => [p.id, p])) };
}
export function encode(r) {
  return { ...r, players: [...r.players.values()] };
}
