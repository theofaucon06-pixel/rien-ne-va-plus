import { createEngine, decode, encode, uid, randomInt } from "./engine.mjs";

const api = Deno.env.get("SUPABASE_URL")!;
const secret =
  JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default ||
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const origins = new Set([
  "https://rien-ne-va-plus.vercel.app",
  "http://localhost:8787",
  "http://127.0.0.1:8787",
]);
const engine = createEngine();
function fail(status: number, message: string): never {
  throw Object.assign(new Error(message), { status });
}
async function hash(value: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(bytes), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
}
async function db(route: string, options: RequestInit = {}) {
  const res = await fetch(`${api}/rest/v1/${route}`, {
    ...options,
    headers: {
      apikey: secret,
      ...(secret.startsWith("eyJ")
        ? { Authorization: `Bearer ${secret}` }
        : {}),
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...options.headers,
    },
  });
  if (!res.ok) {
    console.error("Database operation failed", res.status, route.split("?")[0]);
    fail(503, "Le salon met un peu de temps à répondre. Réessaie.");
  }
  return res.status === 204 ? null : res.json();
}
async function limit(key: string, max: number, seconds: number) {
  const allowed = await db("rpc/rnvp_rate", {
    method: "POST",
    body: JSON.stringify({ p_key: key, p_max: max, p_seconds: seconds }),
  });
  if (!allowed) fail(429, "Trop de demandes. Réessaie dans un instant.");
}
async function readBody(req: Request) {
  if (Number(req.headers.get("content-length") || 0) > 8192)
    fail(413, "Demande trop volumineuse.");
  const reader = req.body?.getReader();
  let length = 0;
  const parts: Uint8Array[] = [];
  if (reader)
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.length;
        if (length > 8192) {
          await reader.cancel();
          fail(413, "Demande trop volumineuse.");
        }
        parts.push(value);
      }
    } finally {
      reader.releaseLock();
    }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  try {
    const value = JSON.parse(new TextDecoder().decode(bytes) || "{}");
    if (!value || Array.isArray(value) || typeof value !== "object") throw 0;
    return value;
  } catch {
    fail(400, "Demande illisible.");
  }
}
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    Vary: "Origin",
    "X-Content-Type-Options": "nosniff",
  };
  if (origin && origins.has(origin))
    Object.assign(headers, {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "content-type,x-room-token",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Max-Age": "3600",
    });
  const respond = (value: unknown, status = 200) =>
    new Response(JSON.stringify(value), { status, headers });
  try {
    if (origin && !origins.has(origin)) fail(403, "Origine non autorisée.");
    if (req.method === "OPTIONS")
      return new Response(null, { status: 204, headers });
    const route = new URL(req.url).pathname.replace(/^.*\/casino\/?/, "");
    if (route === "health" && req.method === "GET")
      return respond({
        ok: true,
        multiplayer: true,
        maxPlayers: 8,
        transport: "supabase",
      });
    if (req.method !== "POST") fail(405, "Méthode non autorisée.");
    const b = await readBody(req);
    // Store a one-way daily IP digest, never the raw network address.
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const guestKey = await hash(
      `${new Date().toISOString().slice(0, 10)}:${ip}`,
    );
    const joining = route === "rooms";
    if (joining) await limit(`join:${guestKey}`, 60, 60);
    const match = route.match(/^rooms\/([A-Z2-9]{6})\/(resume|leave|action)$/);
    if (!joining && !match) fail(404, "Action introuvable.");
    if (joining && b.code && !/^[A-Z2-9]{6}$/.test(b.code))
      fail(400, "Code de salon invalide.");
    const token = joining ? uid() + uid() : req.headers.get("x-room-token");
    if (!token || !/^[a-f0-9]{64}$/.test(token))
      fail(401, "Ta session a expiré. Rejoins à nouveau le salon.");
    const tokenHash = await hash(token);
    if (joining && !b.code) {
      await limit(`create:${guestKey}`, 15, 600);
      for (let attempt = 0; attempt < 5; attempt++) {
        const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        const code = Array.from(
          { length: 6 },
          () => alphabet[randomInt(alphabet.length)],
        ).join("");
        const room = engine.createRoom(code),
          p = engine.join(room, b, tokenHash);
        const result = await db("rpc/rnvp_create_room", {
          method: "POST",
          body: JSON.stringify({ p_code: code, p_state: encode(room) }),
        });
        if (result === "full")
          fail(503, "Tous les salons sont occupés. Réessaie plus tard.");
        if (result === "created")
          return respond(
            {
              id: p.id,
              token,
              room: { ...engine.snapshot(room), revision: 1 },
            },
            201,
          );
      }
      fail(503, "Impossible de créer le salon. Réessaie.");
    }
    const code = joining ? b.code : match![1],
      mode = joining ? "join" : match![2];
    for (let attempt = 0; attempt < 8; attempt++) {
      const [row] = await db(
        `rnvp_rooms?code=eq.${code}&select=state,revision,updated_at`,
      );
      if (!row || Date.now() - Date.parse(row.updated_at) > 7200000)
        fail(404, "Le salon a expiré. Crée une nouvelle soirée.");
      const room = decode(row.state);
      engine.expire(room);
      if (!room.players.size)
        fail(404, "Le salon a expiré. Crée une nouvelle soirée.");
      if (
        !joining &&
        ![...room.players.values()].some((p) => p.tokenHash === tokenHash)
      ) {
        await limit(`invalid:${guestKey}`, 30, 60);
        fail(401, "Ta session a expiré. Rejoins à nouveau le salon.");
      }
      const p = joining
        ? engine.join(room, b, tokenHash)
        : engine.execute(room, tokenHash, mode, b);
      const revision = row.revision + 1;
      const updated = await db(
        `rnvp_rooms?code=eq.${code}&revision=eq.${row.revision}&select=revision`,
        {
          method: "PATCH",
          body: JSON.stringify({
            state: encode(room),
            revision,
            updated_at: new Date().toISOString(),
          }),
        },
      );
      if (updated.length) {
        const view = { ...engine.snapshot(room), revision };
        if (mode === "leave") return respond({ ok: true });
        if (joining || mode === "resume")
          return respond({ id: p.id, token, room: view }, joining ? 201 : 200);
        return respond({ ok: true, room: view });
      }
      await new Promise((resolve) => setTimeout(resolve, 20 + randomInt(60)));
    }
    fail(503, "Le salon est très actif. Réessaie dans un instant.");
  } catch (error) {
    const e = error as Error & { status?: number };
    if (!e.status) console.error("Casino request failed", e.name);
    return respond(
      { error: e.status ? e.message : "Le serveur a rencontré un problème." },
      e.status || 500,
    );
  }
});
