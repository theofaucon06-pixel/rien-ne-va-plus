import { test } from "node:test";
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { createApp } from "../server.mjs";
import { QUIZ } from "../js/content.js";
import { predictionWins } from "../js/shared.js";

async function fixture(t, options = {}) {
  const app = createApp(options);
  await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  t.after(() => app.close());
  async function post(route, data = {}, player) {
    const res = await fetch(base + "/api/" + route, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(player ? { Authorization: "Bearer " + player.token } : {}),
      },
      body: JSON.stringify(data),
    });
    return { status: res.status, ...(await res.json()) };
  }
  async function join(name, code) {
    const p = await post("rooms", { name, code });
    assert.equal(p.status, 201);
    return p;
  }
  async function listen(p) {
    const controller = new AbortController();
    const res = await fetch(
      `${base}/api/rooms/${p.room.code}/events?token=${p.token}`,
      { signal: controller.signal },
    );
    assert.equal(res.status, 200);
    t.after(() => controller.abort());
    const client = { last: null, events: 0 };
    const reader = res.body.getReader();
    let buffer = "";
    (async () => {
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += new TextDecoder().decode(value);
          let i;
          while ((i = buffer.indexOf("\n\n")) !== -1) {
            const event = buffer.slice(0, i);
            buffer = buffer.slice(i + 2);
            const data = event.split("\n").find((l) => l.startsWith("data: "));
            if (data) {
              client.last = JSON.parse(data.slice(6));
              client.events++;
            }
          }
        }
      } catch (e) {
        if (e.name !== "AbortError") throw e;
      }
    })();
    await until(() => client.last);
    return client;
  }
  const action = (p, data) => post(`rooms/${p.room.code}/action`, data, p);
  const snapshot = async (p) =>
    (await post(`rooms/${p.room.code}/resume`, {}, p)).room;
  return { app, base, post, join, listen, action, snapshot };
}
async function until(check) {
  const end = Date.now() + 4000;
  while (!check()) {
    if (Date.now() > end) throw Error("Timed out waiting for shared state");
    await delay(15);
  }
}

test("real event streams share positions, discoveries and safe identities without session tokens", async (t) => {
  const f = await fixture(t),
    a = await f.join("Alice"),
    b = await f.join("<Bob>", a.room.code),
    ca = await f.listen(a),
    cb = await f.listen(b);
  assert.equal(b.room.players[1].name, "Bob");
  assert.equal(b.room.players.length, 2);
  assert.ok(!JSON.stringify(b.room).includes(a.token));
  assert.equal(
    (
      await f.action(a, {
        type: "position",
        x: 1700,
        y: 500,
        yaw: 1,
        moving: true,
        discoveries: ["avantage", "fake", "avantage"],
      })
    ).status,
    200,
  );
  await until(() => cb.last.players.find((p) => p.id === a.id)?.x === 1700);
  assert.deepEqual(cb.last.discoveries, ["avantage"]);
  assert.equal(cb.last.players.find((p) => p.id === a.id).room, "hall");
  assert.ok(ca.events >= 1);
  assert.equal(
    (await f.action(a, { type: "position", x: "NaN", y: 5, yaw: 0 })).status,
    400,
  );
  assert.equal(
    (
      await f.post(
        `rooms/${a.room.code}/action`,
        { type: "ping" },
        { token: "fake" },
      )
    ).status,
    401,
  );
  const res = await fetch(f.base + "/api/rooms", {
    method: "POST",
    headers: {
      Origin: "https://elsewhere.test",
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  assert.equal(res.status, 403);
  for (const route of [
    "/.git/config",
    "/server.mjs",
    "/package.json",
    "/js/package.json",
    "/%E0%A4%A",
  ])
    assert.ok((await fetch(f.base + route)).status >= 400);
});

test("quiz is authoritative: answers hidden, one vote, host controls, five rounds, shared score", async (t) => {
  const f = await fixture(t),
    a = await f.join("Alice"),
    b = await f.join("Bob", a.room.code);
  await f.listen(a);
  const cb = await f.listen(b);
  assert.equal((await f.action(b, { type: "quiz-start" })).status, 403);
  assert.equal((await f.action(a, { type: "quiz-start" })).status, 200);
  let firstId;
  for (let i = 0; i < 5; i++) {
    const q = (await f.snapshot(a)).quiz;
    firstId ||= q.id;
    assert.equal(q.index, i);
    assert.equal(q.phase, "question");
    assert.equal(q.correct, undefined);
    assert.equal(q.answers, undefined);
    const actual = QUIZ.find((x) => x.q === q.question.q);
    const vote = { type: "quiz-answer", id: q.id, index: i, answer: actual.ok };
    assert.equal((await f.action(a, vote)).status, 200);
    assert.equal((await f.action(a, vote)).status, 409);
    assert.equal(
      (await f.action(b, { ...vote, answer: (actual.ok + 1) % 3 })).status,
      200,
    );
    await until(
      () => cb.last.quiz?.phase === "reveal" && cb.last.quiz?.index === i,
    );
    assert.equal(cb.last.quiz.correct, actual.ok);
    assert.equal(cb.last.quiz.scores[a.id], i + 1);
    assert.equal(
      (await f.action(b, { type: "quiz-next", id: q.id, index: i })).status,
      403,
    );
    assert.equal(
      (await f.action(a, { type: "quiz-next", id: q.id, index: i })).status,
      200,
    );
  }
  const completed = (await f.snapshot(a)).quiz;
  assert.equal(completed.phase, "complete");
  assert.equal(completed.scores[a.id], 5);
  assert.equal(completed.scores[b.id] || 0, 0);
  assert.equal(
    (
      await f.action(a, {
        type: "quiz-answer",
        id: firstId,
        index: 0,
        answer: 0,
      })
    ).status,
    409,
  );
});

test("shared roulette has one server result, zero loses, stale actions cannot reroll", async (t) => {
  const f = await fixture(t),
    a = await f.join("Alice"),
    b = await f.join("Bob", a.room.code);
  await f.listen(a);
  const cb = await f.listen(b);
  assert.equal(
    (await f.action(a, { type: "predict", round: 1, choice: "red" })).status,
    200,
  );
  assert.equal(
    (await f.action(b, { type: "predict", round: 1, choice: "black" })).status,
    200,
  );
  assert.equal((await f.action(b, { type: "spin", round: 1 })).status, 403);
  assert.equal((await f.action(a, { type: "spin", round: 1 })).status, 200);
  await until(() => cb.last.table.result !== null);
  const n = cb.last.table.result;
  assert.ok(n >= 0 && n <= 36);
  assert.equal((await f.snapshot(a)).table.result, n);
  assert.equal((await f.action(a, { type: "spin", round: 1 })).status, 409);
  assert.equal(
    (await f.action(a, { type: "table-next", round: 1 })).status,
    200,
  );
  assert.equal((await f.action(a, { type: "spin", round: 1 })).status, 409);
  for (const choice of ["red", "black", "even", "odd"])
    assert.equal(predictionWins(choice, 0), false);
});

test("room capacity, clean leave, resumed session and expiry", async (t) => {
  let time = 1000;
  const f = await fixture(t, { now: () => time, graceMs: 60000 }),
    a = await f.join("Alice"),
    b = await f.join("Bob", a.room.code);
  for (let i = 0; i < 6; i++) await f.join("Guest " + i, a.room.code);
  assert.equal(
    (await f.post("rooms", { name: "Extra", code: a.room.code })).status,
    409,
  );
  assert.equal((await f.post(`rooms/${a.room.code}/resume`, {}, a)).id, a.id);
  assert.equal((await f.post(`rooms/${a.room.code}/leave`, {}, a)).status, 200);
  assert.equal((await f.snapshot(b)).host, b.id);
  assert.equal(
    (await f.post(`rooms/${a.room.code}/resume`, {}, a)).status,
    401,
  );
  time += 61000;
  f.app.tick();
  assert.equal(f.app.rooms.size, 0);
  assert.equal(
    (await f.post(`rooms/${b.room.code}/resume`, {}, b)).status,
    404,
  );
});

test("question deadline reveals even when another player does not answer", async (t) => {
  let time = 1000;
  const f = await fixture(t, { now: () => time }),
    a = await f.join("Alice"),
    b = await f.join("Bob", a.room.code);
  await f.listen(a);
  await f.listen(b);
  await f.action(a, { type: "quiz-start" });
  const q = (await f.snapshot(a)).quiz;
  time += 36000;
  f.app.tick();
  assert.equal((await f.snapshot(a)).quiz.phase, "reveal");
  assert.equal(
    (await f.action(b, { type: "quiz-answer", id: q.id, index: 0, answer: 0 }))
      .status,
    409,
  );
});
