import test from "node:test";
import assert from "node:assert/strict";
import {
  createEngine,
  encode,
  decode,
} from "../supabase/functions/casino/engine.mjs";
import { QUIZ } from "../supabase/functions/casino/content.mjs";
const setup = () => {
  let time = 100000;
  const engine = createEngine({ now: () => time, random: () => 0 });
  const r = engine.createRoom("ABC234");
  const a = engine.join(r, { name: "<Alice>", color: 0 }, "secret-a");
  const b = engine.join(r, { name: "Bob", color: 0 }, "secret-b");
  return {
    engine,
    r,
    a,
    b,
    advance(ms) {
      time += ms;
    },
  };
};
test("cloud snapshots survive serialization and never expose room credentials or pending answers", () => {
  const { engine, r, a } = setup();
  engine.execute(r, "secret-a", "action", { type: "quiz-start" });
  const restored = decode(JSON.parse(JSON.stringify(encode(r))));
  const view = engine.snapshot(restored);
  assert.equal(view.players[0].name, "Alice");
  assert.notEqual(view.players[0].color, view.players[1].color);
  assert.equal(view.host, a.id);
  assert.equal(view.quiz.phase, "question");
  assert.ok(!JSON.stringify(view).includes("secret-"));
  assert.ok(!("order" in view.quiz));
  assert.ok(!("correct" in view.quiz));
  assert.throws(
    () => engine.execute(restored, "wrong", "action", { type: "ping" }),
    { status: 401 },
  );
});
test("cloud quiz scores once, blocks guests from starting and rejects stale votes", () => {
  const { engine, r, a, b } = setup();
  assert.throws(
    () => engine.execute(r, "secret-b", "action", { type: "quiz-start" }),
    { status: 403 },
  );
  engine.execute(r, "secret-a", "action", { type: "quiz-start" });
  const q = r.quiz,
    vote = {
      type: "quiz-answer",
      id: q.id,
      index: 0,
      answer: QUIZ[q.order[0]].ok,
    };
  engine.execute(r, "secret-a", "action", vote);
  assert.throws(() => engine.execute(r, "secret-a", "action", vote), {
    status: 409,
  });
  engine.execute(r, "secret-b", "action", vote);
  assert.equal(q.phase, "reveal");
  assert.equal(q.scores[a.id], 1);
  assert.equal(q.scores[b.id], 1);
  engine.execute(r, "secret-a", "action", {
    type: "quiz-next",
    id: q.id,
    index: 0,
  });
  assert.throws(() => engine.execute(r, "secret-a", "action", vote), {
    status: 409,
  });
});
test("cloud authority assigns one roulette result and rejects stale spins", () => {
  const { engine, r } = setup();
  engine.execute(r, "secret-a", "action", {
    type: "predict",
    choice: "red",
    round: 1,
  });
  engine.execute(r, "secret-b", "action", {
    type: "predict",
    choice: "even",
    round: 1,
  });
  engine.execute(r, "secret-a", "action", { type: "spin", round: 1 });
  assert.equal(r.table.result, 0);
  assert.deepEqual(r.table.winners, []);
  assert.throws(
    () => engine.execute(r, "secret-a", "action", { type: "spin", round: 1 }),
    { status: 409 },
  );
  assert.throws(
    () =>
      engine.execute(r, "secret-b", "action", { type: "table-next", round: 1 }),
    { status: 403 },
  );
});
test("cloud presence transfers the host, expires sessions, and closes quiz at the deadline", () => {
  const { engine, r, b, advance } = setup();
  engine.execute(r, "secret-a", "action", { type: "quiz-start" });
  advance(16000);
  engine.execute(r, "secret-b", "action", { type: "ping" });
  engine.expire(r);
  assert.equal(r.host, b.id);
  advance(20000);
  engine.execute(r, "secret-b", "action", { type: "ping" });
  engine.expire(r);
  assert.equal(r.quiz.phase, "reveal");
  advance(25000);
  engine.execute(r, "secret-b", "action", { type: "ping" });
  engine.expire(r);
  assert.equal(r.players.size, 1);
  assert.throws(() => engine.execute(r, "secret-a", "resume"), { status: 401 });
});
test("cloud limits capacity, positions and discovery claims", () => {
  const { engine, r } = setup();
  for (let i = 2; i < 8; i++) engine.join(r, { name: `Peer${i}` }, `s${i}`);
  assert.throws(() => engine.join(r, { name: "Ninth" }, "extra"), {
    status: 409,
  });
  engine.execute(r, "secret-a", "action", {
    type: "position",
    x: -100,
    y: 999999,
    yaw: 0,
    discoveries: ["avantage", "fake", "avantage"],
  });
  const p = engine.snapshot(r).players[0];
  assert.equal(p.x, 0);
  assert.equal(p.y, 1952);
  assert.deepEqual(p.discoveries, ["avantage"]);
  for (let i = 0; i < 11; i++)
    engine.execute(r, "secret-a", "action", { type: "ping" });
  assert.throws(
    () => engine.execute(r, "secret-a", "action", { type: "ping" }),
    { status: 429 },
  );
});

// The deployment bundle must be regenerated whenever educational content changes.
test('cloud questions and room geometry match the playable source', async () => {
  const cloud = await import('../supabase/functions/casino/content.mjs');
  const content = await import('../js/content.js');
  const world = await import('../js/world.js');
  assert.deepEqual(cloud.QUIZ, content.QUIZ);
  assert.deepEqual(cloud.ROOMS, world.ROOMS);
  assert.deepEqual(cloud.REVELATIONS.map(r => r.id), content.REVELATIONS.map(r => r.id));
});
