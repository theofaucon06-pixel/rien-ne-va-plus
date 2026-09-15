// A single event stream per tab; only positions and learning progress leave the solo game.
export class Multiplayer extends EventTarget {
  constructor(state) {
    super();
    this.state = state;
    this.room = null;
    this.session = null;
    this.status = "solo";
    this.peers = new Map();
    this.lastSent = "";
    this.lastAt = 0;
    this.busy = false;
    try {
      this.saved = JSON.parse(sessionStorage.getItem("rnvp-room"));
    } catch {}
    const invited = new URLSearchParams(location.search)
      .get("room")
      ?.toUpperCase();
    if (this.saved && (!invited || invited === this.saved.code)) this.resume();
    window.addEventListener("pagehide", () => this.stream?.close());
    window.addEventListener("pageshow", (e) => {
      if (e.persisted && this.session) this.openStream();
    });
    this.timer = setInterval(() => this.sync(), 180);
  }
  changed() {
    this.dispatchEvent(new Event("change"));
  }
  error(message) {
    this.dispatchEvent(new CustomEvent("problem", { detail: message }));
  }
  async request(route, data = {}, auth = true) {
    const controller = new AbortController(),
      timeout = setTimeout(() => controller.abort(), 7000);
    try {
      const res = await fetch("/api/" + route, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(auth && this.session
            ? { Authorization: "Bearer " + this.session.token }
            : {}),
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });
      let value;
      try {
        value = await res.json();
      } catch {
        throw new Error(
          "Le multijoueur est indisponible sur cette adresse. Le mode solo reste accessible.",
        );
      }
      if (!res.ok)
        throw Object.assign(new Error(value.error || "Connexion impossible."), {
          status: res.status,
        });
      return value;
    } catch (e) {
      if (e.name === "AbortError" || e instanceof TypeError)
        throw new Error(
          "Connexion interrompue. Vérifie ton réseau puis réessaie.",
        );
      throw e;
    } finally {
      clearTimeout(timeout);
    }
  }
  async join(name, code, color) {
    this.status = "connecting";
    this.changed();
    try {
      const data = await this.request(
        "rooms",
        { name, code: code.trim().toUpperCase(), color },
        false,
      );
      this.accept(data);
    } catch (e) {
      this.status = "solo";
      this.changed();
      throw e;
    }
  }
  accept(data) {
    this.session = { id: data.id, token: data.token, code: data.room.code };
    try {
      sessionStorage.setItem("rnvp-room", JSON.stringify(this.session));
    } catch {}
    this.update(data.room);
    this.openStream();
  }
  async resume() {
    this.session = this.saved;
    this.status = "connecting";
    this.changed();
    try {
      const data = await this.request(`rooms/${this.session.code}/resume`);
      this.accept(data);
    } catch (e) {
      this.reset();
      this.error(e.message);
    }
  }
  update(room) {
    this.room = room;
    const ids = new Set();
    for (const p of room.players) {
      if (p.id === this.session.id || !p.online) continue;
      ids.add(p.id);
      let peer = this.peers.get(p.id);
      if (!peer) {
        peer = {
          ...p,
          targetX: p.x,
          targetY: p.y,
          walk: 0,
          showName: true,
          kind: "peer",
        };
        this.peers.set(p.id, peer);
      }
      Object.assign(peer, {
        ...p,
        targetX: p.x,
        targetY: p.y,
        x: peer.x,
        y: peer.y,
      });
    }
    for (const id of this.peers.keys()) if (!ids.has(id)) this.peers.delete(id);
    this.state.remotePlayers = [...this.peers.values()];
    this.changed();
  }
  openStream() {
    this.stream?.close();
    this.status = "connecting";
    this.changed();
    const stream = (this.stream = new EventSource(
      `/api/rooms/${this.session.code}/events?token=${encodeURIComponent(this.session.token)}`,
    ));
    stream.onopen = () => {
      this.status = "online";
      this.lastSent = "";
      this.changed();
    };
    stream.onmessage = (e) => {
      try {
        this.update(JSON.parse(e.data));
      } catch {
        this.error("Un message du salon est illisible.");
      }
    };
    stream.onerror = () => {
      this.status = "reconnecting";
      this.changed();
      clearTimeout(this.retryCheck);
      this.retryCheck = setTimeout(async () => {
        if (this.stream !== stream || !this.session) return;
        try {
          await this.request(`rooms/${this.session.code}/resume`);
        } catch (e) {
          if ([401, 404].includes(e.status)) {
            this.reset();
            this.error(e.message);
          }
        }
      }, 2000);
    };
  }
  async action(data) {
    if (!this.session || this.status !== "online")
      throw new Error("Attends que le salon soit reconnecté.");
    return this.request(`rooms/${this.session.code}/action`, data);
  }
  async sync() {
    if (!this.session || this.status !== "online" || this.busy) return;
    const p = this.state.player,
      data = {
        type: "position",
        x: Math.round(p.x),
        y: Math.round(p.y),
        yaw:
          p.yaw ??
          ({ up: 0, down: Math.PI, left: Math.PI / 2, right: -Math.PI / 2 }[
            p.facing
          ] ||
            0),
        moving: !!p.moving,
        discoveries: [...this.state.revealed],
      };
    const key = JSON.stringify(data),
      time = Date.now();
    if (key === this.lastSent && time - this.lastAt < 3000) return;
    this.busy = true;
    try {
      await this.action(data);
      this.lastSent = key;
      this.lastAt = time;
    } catch (e) {
      if ([401, 404].includes(e.status)) {
        this.reset();
        this.error(e.message);
      }
    } finally {
      this.busy = false;
    }
  }
  frame(dt) {
    for (const p of this.peers.values()) {
      const k = 1 - Math.exp(-dt * 14);
      if (Math.hypot(p.targetX - p.x, p.targetY - p.y) > 600) {
        p.x = p.targetX;
        p.y = p.targetY;
      } else {
        p.x += (p.targetX - p.x) * k;
        p.y += (p.targetY - p.y) * k;
      }
      p.walk += dt;
      p.facing =
        Math.abs(Math.sin(p.yaw)) > 0.6
          ? Math.sin(p.yaw) > 0
            ? "left"
            : "right"
          : Math.cos(p.yaw) > 0
            ? "up"
            : "down";
    }
  }
  async leave() {
    try {
      if (this.session) await this.request(`rooms/${this.session.code}/leave`);
    } finally {
      this.reset();
    }
  }
  reset() {
    this.stream?.close();
    this.stream = null;
    clearTimeout(this.retryCheck);
    this.room = null;
    this.session = null;
    this.status = "solo";
    this.peers.clear();
    this.state.remotePlayers = [];
    try {
      sessionStorage.removeItem("rnvp-room");
    } catch {}
    this.changed();
  }
}
