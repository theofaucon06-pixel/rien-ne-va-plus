import assert from "node:assert/strict";
const base = "https://ydcforyxwlmmgdgyypiu.supabase.co/functions/v1/casino/";
const sessions = [];
const timings = [];
async function request(route, data = {}, session, expected = 200) {
  const start = Date.now();
  const res = await fetch(base + route, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://rien-ne-va-plus.vercel.app",
      ...(session ? { "X-Room-Token": session.token } : {}),
    },
    body: JSON.stringify(data),
  });
  timings.push(Date.now() - start);
  const body = await res.json();
  assert.ok((Array.isArray(expected) ? expected : [expected]).includes(res.status), JSON.stringify(body));
  return body;
}
const action = (s, b, status) =>
  request(`rooms/${s.room.code}/action`, b, s, status);
try {
  const health = await fetch(base + "health");
  assert.equal(health.status, 200);
  const a = await request("rooms", { name: "Cloud Alice" }, null, 201);
  sessions.push(a);
  const b = await request(
    "rooms",
    { name: "Cloud Bob", code: a.room.code },
    null,
    201,
  );
  sessions.push(b);
  assert.equal(b.room.players.length, 2);
  assert.ok(!JSON.stringify(b.room).includes(a.token));
  assert.ok(!JSON.stringify(b.room).includes("tokenHash"));
  await request(`rooms/${a.room.code}/resume`, {}, null, 401);
  const denied = await fetch(base + "health", {
    headers: { Origin: "https://unrelated.example" },
  });
  assert.equal(denied.status, 403);
  await Promise.all([
    action(a, { type: "predict", choice: "red", round: 1 }),
    action(b, { type: "predict", choice: "black", round: 1 }),
  ]);
  const spins = await Promise.all([
    action(a, { type: "spin", round: 1 }, [200, 409]),
    action(a, { type: "spin", round: 1 }, [200, 409]),
  ]);
  const after = await request(`rooms/${b.room.code}/resume`, {}, b);
  assert.equal(spins.filter(s => s.ok).length, 1);
  assert.equal(after.room.table.result, spins.find(s => s.ok).room.table.result);
  assert.equal(Object.keys(after.room.table.choices).length, 2);
  await action(b, { type: "quiz-start" }, 403);
  const quiz = await action(a, { type: "quiz-start" });
  assert.equal(quiz.room.quiz.correct, undefined);
  const q = quiz.room.quiz;
  await Promise.all([
    action(a, { type: "quiz-answer", id: q.id, index: 0, answer: 0 }),
    action(b, { type: "quiz-answer", id: q.id, index: 0, answer: 1 }),
  ]);
  const corrected = await request(`rooms/${a.room.code}/resume`, {}, a);
  assert.equal(corrected.room.quiz.phase, "reveal");
  assert.equal(Object.keys(corrected.room.quiz.answers).length, 2);
  await action(a, { type: "quiz-answer", id: q.id, index: 0, answer: 0 }, 409);
  const moved = await action(a, {
    type: "position",
    x: 1600,
    y: 500,
    yaw: 1,
    moving: true,
    discoveries: ["avantage"],
  });
  const seen = await request(`rooms/${b.room.code}/resume`, {}, b);
  assert.equal(seen.room.players.find((p) => p.id === a.id).x, 1600);
  assert.ok(seen.room.discoveries.includes("avantage"));
  assert.ok(seen.room.revision > moved.room.revision);
  console.log(
    JSON.stringify({
      passed: [
        "Création et invitation sur Supabase",
        "Sessions privées et origine contrôlée",
        "Écritures concurrentes préservées",
        "Un seul tirage commun",
        "Quiz, votes et correction partagés",
        "Déplacements et découvertes",
        "Reprise de session",
      ],
      medianRequestMs: timings.sort((a, b) => a - b)[
        Math.floor(timings.length / 2)
      ],
    }),
  );
} finally {
  for (const s of sessions)
    await request(`rooms/${s.room.code}/leave`, {}, s).catch(() => {});
}
