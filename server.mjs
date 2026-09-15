import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, randomInt } from "node:crypto";
import { QUIZ, REVELATIONS } from "./js/content.js";
import { WORLD, PLAYER_START, roomAt } from "./js/world.js";
import { COLORS, EMOTES, PREDICTIONS, predictionWins } from "./js/shared.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
};
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

export function createApp({
  now = Date.now,
  random = randomInt,
  maxRooms = 100,
  graceMs = 60000,
} = {}) {
  const rooms = new Map(),
    limits = new Map();
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
  function send(p, r) {
    if (!p.stream || p.stream.destroyed) return;
    if (p.stream.writableLength > 65536) {
      p.stream.destroy();
      return;
    }
    p.stream.write(`data: ${JSON.stringify(snapshot(r))}\n\n`);
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
    p.stream?.end();
    log(r, `${p.name} a quitté le salon.`);
    if (r.host === p.id)
      r.host =
        [...r.players.values()].find((p) => p.stream)?.id ||
        r.players.keys().next().value;
    if (!r.players.size) rooms.delete(r.code);
    else checkAnswers(r);
  }
  function tick() {
    const t = now();
    for (const r of rooms.values()) {
      for (const p of r.players.values())
        if (t - p.lastSeen > graceMs) remove(r, p);
      if (r.quiz?.phase === "question" && t >= r.quiz.deadline) revealQuiz(r);
      const host = r.players.get(r.host);
      if (host && !host.stream && t - host.lastSeen > 15000) {
        const next = [...r.players.values()].find((p) => p.stream);
        if (next) {
          r.host = next.id;
          log(r, `${next.name} anime maintenant le salon.`);
        }
      }
      if (r.dirty) {
        r.dirty = false;
        for (const p of r.players.values()) send(p, r);
      }
      if (t - r.heartbeat > 15000) {
        r.heartbeat = t;
        for (const p of r.players.values()) p.stream?.write(": heartbeat\n\n");
      }
    }
    for (const [key, l] of limits) if (t > l.until) limits.delete(key);
  }
  const timer = setInterval(tick, 120);
  timer.unref();
  function rate(key, max, window = 60000) {
    let l = limits.get(key);
    if (!l || l.until < now()) {
      l = { count: 0, until: now() + window };
      limits.set(key, l);
    }
    if (++l.count > max)
      fail(429, "Trop de demandes. Réessaie dans un instant.");
  }
  async function body(req) {
    let bytes = 0,
      parts = [];
    for await (const part of req) {
      bytes += part.length;
      if (bytes > 8192) fail(413, "Demande trop volumineuse.");
      parts.push(part);
    }
    try {
      const v = JSON.parse(Buffer.concat(parts).toString() || "{}");
      if (!v || Array.isArray(v) || typeof v !== "object") throw 0;
      return v;
    } catch {
      fail(400, "Demande illisible.");
    }
  }
  function json(res, status, data) {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(data));
  }
  const server = http.createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "same-origin");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    try {
      const url = new URL(req.url, "http://localhost");
      if (url.pathname.startsWith("/api/")) {
        if (req.headers.origin) {
          let origin;
          try {
            origin = new URL(req.headers.origin);
          } catch {
            fail(403, "Origine non autorisée.");
          }
          if (
            origin.host !== req.headers.host &&
            origin.origin !== process.env.PUBLIC_ORIGIN
          )
            fail(403, "Origine non autorisée.");
        }
        if (url.pathname === "/api/health" && req.method === "GET")
          return json(res, 200, { ok: true, multiplayer: true, maxPlayers: 8 });
        if (url.pathname === "/api/rooms" && req.method === "POST") {
          rate("join:" + req.socket.remoteAddress, 60);
          const b = await body(req);
          let r;
          if (b.code) {
            r = rooms.get(String(b.code).toUpperCase());
            if (!r) fail(404, "Ce salon est introuvable ou a expiré.");
          } else {
            rate("create:" + req.socket.remoteAddress, 15, 600000);
            if (rooms.size >= maxRooms)
              fail(503, "Tous les salons sont occupés. Réessaie plus tard.");
            let code;
            const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
            do {
              code = Array.from(
                { length: 6 },
                () => alphabet[random(alphabet.length)],
              ).join("");
            } while (rooms.has(code));
            r = {
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
            rooms.set(code, r);
          }
          if (r.players.size >= 8)
            fail(409, "Ce salon est complet (8 personnes).");
          const id = randomBytes(8).toString("hex"),
            token = randomBytes(24).toString("hex"),
            used = new Set([...r.players.values()].map((p) => p.color)),
            requested = COLORS[Number(b.color)];
          const p = {
            id,
            token,
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
            stream: null,
            emote: null,
            emoteUntil: 0,
            lastAction: -Infinity,
          };
          r.players.set(id, p);
          if (!r.host) r.host = id;
          log(r, `${p.name} rejoint l'exploration.`);
          return json(res, 201, { id, token, room: snapshot(r) });
        }
        const match = url.pathname.match(
          /^\/api\/rooms\/([A-Z2-9]{6})\/(events|action|resume|leave)$/,
        );
        if (!match) fail(404, "Action introuvable.");
        const r = rooms.get(match[1]);
        if (!r) fail(404, "Le salon a expiré. Crée une nouvelle soirée.");
        const token =
            req.headers.authorization?.replace(/^Bearer /, "") ||
            (match[2] === "events" ? url.searchParams.get("token") : null),
          p = [...r.players.values()].find((p) => p.token === token);
        if (!p) fail(401, "Ta session a expiré. Rejoins à nouveau le salon.");
        rate("player:" + p.token, 40, 1000);
        p.lastSeen = now();
        if (match[2] === "events" && req.method === "GET") {
          const old = p.stream;
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
          });
          p.stream = res;
          old?.end();
          res.write("retry: 1500\n\n");
          send(p, r);
          broadcast(r);
          res.on("close", () => {
            if (p.stream === res) {
              p.stream = null;
              broadcast(r);
            }
          });
          return;
        }
        if (req.method !== "POST") fail(405, "Méthode non autorisée.");
        const b = await body(req);
        if (match[2] === "resume")
          return json(res, 200, {
            id: p.id,
            token: p.token,
            room: snapshot(r),
          });
        if (match[2] === "leave") {
          remove(r, p);
          return json(res, 200, { ok: true });
        }
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
                ...new Set(
                  b.discoveries.filter((d) => validDiscoveries.has(d)),
                ),
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
              id: randomBytes(8).toString("hex"),
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
            if (
              !q ||
              q.phase !== "reveal" ||
              b.id !== q.id ||
              b.index !== q.index
            )
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
            if (!Object.hasOwn(PREDICTIONS, b.choice))
              fail(400, "Choix inconnu.");
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
              .filter(
                ([id, c]) => r.players.has(id) && predictionWins(c, t.result),
              )
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
        broadcast(r);
        return json(res, 200, { ok: true });
      }
      if (!["GET", "HEAD"].includes(req.method))
        fail(405, "Méthode non autorisée.");
      let pathname;
      try {
        pathname = decodeURIComponent(url.pathname);
      } catch {
        fail(400, "Adresse invalide.");
      }
      if (pathname === "/") pathname = "/index.html";
      if (pathname === "/classic") pathname = "/classic.html";
      if (
        !/^\/(index\.html|classic\.html|manifest\.webmanifest|sw\.js|(?:js|css|assets|vendor)\/[\w./-]+)$/.test(
          pathname,
        ) ||
        pathname.split("/").some((p) => p.startsWith(".")) ||
        pathname.endsWith("package.json")
      )
        fail(404, "Page introuvable.");
      const filename = path.resolve(root, "." + pathname);
      if (!filename.startsWith(root + path.sep)) fail(403, "Accès refusé.");
      const data = await readFile(filename).catch(() =>
        fail(404, "Page introuvable."),
      );
      res.writeHead(200, {
        "Content-Type":
          MIME[path.extname(filename)] || "application/octet-stream",
        "Cache-Control": /\/(assets|vendor)\//.test(pathname)
          ? "public, max-age=86400"
          : "no-cache",
      });
      res.end(req.method === "HEAD" ? undefined : data);
    } catch (e) {
      if (res.headersSent) return res.end();
      if (!e.status) console.error(e);
      json(res, e.status || 500, {
        error: e.status ? e.message : "Le serveur a rencontré un problème.",
      });
    }
  });
  server.on("close", () => clearInterval(timer));
  return {
    server,
    rooms,
    tick,
    close() {
      clearInterval(timer);
      for (const r of rooms.values())
        for (const p of r.players.values()) p.stream?.end();
      server.closeAllConnections();
      return new Promise((resolve) => server.close(resolve));
    },
  };
}
