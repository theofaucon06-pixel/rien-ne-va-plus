import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SHOW, THEMES, EPISODES } from "../js/podcast-data.js";
import { REVELATIONS, WITNESSES, SOURCES } from "../js/content.js";
import { buildAll, renderFeed, renderEpisode, renderIndex, minutes, hasAudio, publishedEpisodes, upcomingEpisodes } from "../tools/podcast-render.mjs";
import { createApp } from "../server.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pages = buildAll();
const allText = (ep) => ep.sections.flatMap((s) => s.p).join(" ");
const live = publishedEpisodes();
const soon = upcomingEpisodes();
const SCENES = ["wheel", "wells", "pockets", "average", "streak", "outro"];
const pageOf = (ep) => pages.get(`podcast/${ep.slug}.html`);

test("episodes are well formed, numbered in order and use known themes", () => {
  assert.ok(EPISODES.length >= 2);
  const slugs = new Set();
  EPISODES.forEach((ep, i) => {
    assert.equal(ep.number, i, `episode ${ep.slug} is out of order`);
    assert.match(ep.slug, /^[a-z0-9-]+$/);
    assert.ok(!slugs.has(ep.slug), "duplicate slug " + ep.slug);
    slugs.add(ep.slug);
    assert.ok(ep.title?.length >= 3, `${ep.slug}.title`);
    for (const f of ["hook", "summary"]) assert.ok(ep[f]?.length > 10, `${ep.slug}.${f}`);
    assert.ok(ep.sections.length >= 3 && ep.sections.every((s) => s.h && s.p.length >= 1), ep.slug);
    assert.ok(ep.retenir.length >= 3, ep.slug + " needs takeaways");
    assert.ok(ep.themes.length >= 1 && ep.themes.every((t) => t in THEMES), ep.slug + " themes");
    assert.ok(minutes(ep) >= 1);
    assert.ok(["published", "soon"].includes(ep.status), `${ep.slug}: status must be published or soon`);
  });
  assert.ok(live.length >= 1, "at least one published episode");
  assert.equal(live.length + soon.length, EPISODES.length);
});

test("published episodes carry a scene, a caption and a big figure per section", () => {
  for (const ep of live) {
    for (const [k, sec] of ep.sections.entries()) {
      if (!sec.scene) continue;
      assert.ok(SCENES.includes(sec.scene), `${ep.slug} section ${k + 1}: unknown scene ${sec.scene}`);
      assert.ok(sec.cap?.length > 2, `${ep.slug} section ${k + 1}: missing cap`);
      assert.ok(sec.big?.length >= 1, `${ep.slug} section ${k + 1}: missing big`);
    }
  }
});

test("every referenced mechanic and person exists in the game content and has sources", () => {
  const rev = new Set(REVELATIONS.map((r) => r.id));
  const wit = new Set(WITNESSES.map((w) => w.id));
  for (const ep of EPISODES) {
    for (const id of ep.mechanics) {
      assert.ok(rev.has(id), `${ep.slug}: unknown mechanic ${id}`);
      assert.ok(SOURCES.mechanics.find((m) => m.id === id)?.refs.length, `${ep.slug}: no source for ${id}`);
    }
    for (const id of ep.witnesses) {
      assert.ok(wit.has(id), `${ep.slug}: unknown witness ${id}`);
      const s = SOURCES.witnesses.find((w) => w.id === id);
      assert.ok(s?.status && s.refs.length, `${ep.slug}: ${id} has no status or source`);
    }
  }
});

test("episodes that tell a composite or fictional person say so in the text", () => {
  const needle = { sami: /composite/, parieur: /composite/, architecte: /composite/, main: /composite/, nour: /fictif/ };
  for (const ep of EPISODES)
    for (const id of ep.witnesses) if (needle[id]) assert.match(allText(ep), needle[id], `${ep.slug} must flag ${id}`);
});

test("numbers quoted in the scripts match their arithmetic", () => {
  const by = (slug) => allText(EPISODES.find((e) => e.slug === slug));
  // roulette: 36/37 returned per euro, an edge of 2.7 %
  assert.equal(Math.round((36 / 37) * 1000) / 10, 97.3);
  assert.equal(Math.round((1 - 36 / 37) * 1000) / 10, 2.7);
  assert.match(by("la-bille-n-a-pas-de-memoire"), /97,3 centimes/);
  // 26 blacks in a row: about one in 137 million
  assert.equal(Math.round(1 / (18 / 37) ** 26 / 1e6), 137);
  assert.match(by("la-bille-n-a-pas-de-memoire"), /cent trente-sept millions/);
  // 100 000 € staked at 2.7 % ≈ 2 700 €; doubling the stakes doubles the expected loss
  assert.equal(Math.round(100000 / 37 / 100) * 100, 2700);
  assert.match(by("se-refaire"), /deux mille sept cents euros/);
  assert.match(by("se-refaire"), /cinq mille quatre cents euros/);
  // martingale from 10 €: ten losses cost 10 230 €, the eleventh stake is 10 240 €; ten reds lost ≈ 1 in 784, said "about 800"
  assert.equal(10 * (2 ** 10 - 1), 10230);
  assert.equal(10 * 2 ** 10, 10240);
  assert.ok(Math.abs(1 / (19 / 37) ** 10 - 800) < 40);
  assert.match(by("le-systeme-infaillible"), /dix mille deux cent trente euros/);
  assert.match(by("le-systeme-infaillible"), /environ une chance sur huit cents/);
  // odds 1.55 / 4.20 / 5.80 add up to 105.6 %
  const o = 1 / 1.55 + 1 / 4.2 + 1 / 5.8;
  assert.equal(Math.round(o * 1000) / 10, 105.6);
  assert.match(by("le-casino-dans-la-poche"), /105,6 %/);
  assert.match(by("le-casino-dans-la-poche"), /5,6 %/);
  // craps: any-seven edge is about twelve times the pass line
  assert.equal(Math.round(16.67 / 1.41), 12);
  // slot machines: a legal return of at least 85 % lets the machine keep up to 15 centimes per euro
  assert.match(by("la-zone"), /quatre-vingt-cinq pour cent/);
});

test("the help line matches the game's own content", () => {
  const sortie = REVELATIONS.find((r) => r.id === "sortie").text({ time: "", net: 0, debt: 0 });
  assert.ok(sortie.includes(SHOW.help.phone), "phone number differs from js/content.js");
  const last = EPISODES.at(-1);
  assert.ok(last.retenir.join(" ").includes(SHOW.help.phone));
  for (const [rel, html] of pages) if (rel.endsWith(".html")) assert.ok(html.includes(SHOW.help.phone), rel + " lacks the help line");
});

test("generated files are present and up to date (run `npm run podcast`)", () => {
  for (const [rel, content] of pages) {
    const abs = path.join(root, rel);
    assert.ok(existsSync(abs), "missing " + rel);
    assert.equal(readFileSync(abs, "utf8"), content, "stale " + rel);
  }
});

test("only published episodes have a page; soon episodes have none", () => {
  assert.equal(pages.size, live.length + 2); // index + feed + one page per published episode
  for (const ep of soon) {
    assert.ok(!pages.has(`podcast/${ep.slug}.html`), `${ep.slug} must not have a page`);
    assert.ok(!existsSync(path.join(root, `podcast/${ep.slug}.html`)), `stale page for ${ep.slug}`);
  }
  for (const ep of live) assert.ok(pages.has(`podcast/${ep.slug}.html`), ep.slug);
});

// These files are delivered by other workstreams (brand, fonts, motion); they are checked here so a release cannot miss them.
test("brand, fonts and motion files referenced by the pages are shipped", () => {
  for (const f of [
    "assets/podcast/logo.svg", "assets/podcast/mark.svg", "assets/podcast/favicon.svg", "assets/podcast/cover.svg", "assets/podcast/cover.png",
    "css/podcast-fonts.css", "css/podcast-motion.css", "js/podcast-motion.js"
  ]) assert.ok(existsSync(path.join(root, f)), "missing " + f);
});

test("pages load the stylesheets and scripts in the agreed order, with the brand icon and logo", () => {
  for (const [rel, html] of pages) {
    if (!rel.endsWith(".html")) continue;
    const css = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map((m) => m[1]);
    const isEp = rel !== "podcast/index.html";
    assert.deepEqual(css, isEp ? ["/css/podcast-fonts.css", "/css/podcast.css", "/css/podcast-motion.css"] : ["/css/podcast-fonts.css", "/css/podcast.css"], rel);
    assert.match(html, /<link rel="icon" href="\/assets\/podcast\/favicon\.svg"/);
    assert.match(html, /<img src="\/assets\/podcast\/logo\.svg"/);
    const js = [...html.matchAll(/<script src="([^"]+)" defer>/g)].map((m) => m[1]);
    assert.deepEqual(js, isEp ? ["/js/podcast-motion.js", "/js/podcast.js"] : ["/js/podcast.js"], rel);
    assert.ok(!/La Maison Gagne/.test(html), rel + " still uses the old name");
  }
});

test("episode pages expose the scenes: data-* on each section and one stage block", () => {
  for (const ep of live) {
    const html = pageOf(ep);
    const secs = [...html.matchAll(/<section class="script-sec"[^>]*>/g)].map((m) => m[0]);
    assert.equal(secs.length, ep.sections.length);
    const hasScene = ep.sections.some((x) => x.scene);
    if (hasScene) {
      assert.equal((html.match(/<div class="stage" data-stage aria-hidden="true"><div class="stage-view"><\/div><div class="stage-hud"><\/div><\/div>/g) || []).length, 1, ep.slug + " stage");
      secs.forEach((tag, k) => {
        const sec = ep.sections[k];
        assert.ok(tag.includes(`data-scene="${sec.scene}"`), `${ep.slug} s${k + 1} data-scene`);
        assert.ok(tag.includes("data-cap="), `${ep.slug} s${k + 1} data-cap`);
        assert.ok(tag.includes("data-big="), `${ep.slug} s${k + 1} data-big`);
      });
    } else assert.ok(!html.includes("data-stage"));
    assert.match(html, /<details class="sources" id="sources">/);
    assert.match(html, /id="retenir"/);
    assert.match(html, /href="\/"[^>]*>Entrer dans le casino/); // link to the game
  }
});

test("the home page teases the soon episodes without linking them, and counts honestly", () => {
  const html = pages.get("podcast/index.html");
  assert.equal((html.match(/class="soon-card"/g) || []).length, soon.length);
  for (const ep of soon) {
    assert.ok(html.includes(ep.title.replace(/’/g, "’")) || html.includes(ep.title), `${ep.slug} teaser title`);
    assert.ok(!html.includes(`/podcast/${ep.slug}`), `${ep.slug} must not be linked`);
  }
  for (const ep of live) assert.ok(html.includes(`href="/podcast/${ep.slug}"`), ep.slug + " is linked");
  assert.ok(html.includes(`${soon.length} épisode${soon.length > 1 ? "s" : ""} en préparation`));
  const liveMin = live.reduce((n, e) => n + minutes(e), 0);
  assert.ok(html.includes(`${live.length} épisode${live.length > 1 ? "s" : ""} · ≈ ${liveMin} min`));
  assert.match(html, /class="marquee"/);
  assert.match(html, /href="\/">Jouer à Rien ne va plus/);
  // voices: only those of published episodes
  const liveWitnesses = new Set(live.flatMap((e) => e.witnesses));
  for (const w of WITNESSES) if (!liveWitnesses.has(w.id)) assert.ok(!html.includes(`<b>${w.name}</b>`), `${w.id} should not be listed`);
});

test("every page has one h1, valid JSON-LD, and only working internal links", () => {
  for (const [rel, html] of pages) {
    if (!rel.endsWith(".html")) continue;
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1, rel + " h1 count");
    assert.match(html, /<html lang="fr">/);
    assert.match(html, /<link rel="canonical" href="https:\/\/[^"]+">/);
    const ld = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
    assert.ok(ld, rel + " has no JSON-LD");
    JSON.parse(ld[1].replace(/\\u003c/g, "<"));
    const ids = new Set([...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]));
    for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const link = m[1];
      if (/^(https?:|tel:|mailto:|data:)/.test(link)) continue;
      if (link.startsWith("#")) {
        assert.ok(ids.has(link.slice(1)), `${rel}: dead anchor ${link}`);
        continue;
      }
      assert.ok(link.startsWith("/"), `${rel}: relative link ${link}`);
      const [p, hash] = link.split("#");
      const file = p === "/" ? "index.html" : p === "/podcast" ? "podcast/index.html" : /^\/podcast\/[\w-]+$/.test(p) ? p.slice(1) + ".html" : p.slice(1);
      if (file.startsWith("podcast/") && file.endsWith(".html")) assert.ok(pages.has(file), `${rel}: link to a page that is not published: ${link}`);
      if (!file.startsWith("assets/podcast/") && !file.startsWith("css/podcast-") && !file.startsWith("js/podcast-motion"))
        assert.ok(existsSync(path.join(root, file)), `${rel}: dead link ${link}`); // brand, fonts and motion files are checked in their own test
      if (hash && file.startsWith("podcast/")) {
        const target = pages.get(file);
        assert.ok(target.includes(` id="${hash}"`), `${rel}: dead anchor ${link}`);
      }
    }
  }
});

test("RSS feed is well formed and lists exactly the published episodes that have audio", () => {
  const xml = renderFeed();
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  const stack = [];
  for (const m of xml.replace(/<\?[^>]*\?>/g, "").matchAll(/<(\/?)([\w:]+)([^>]*?)(\/?)>/g)) {
    const [, close, name, , self] = m;
    if (self) continue;
    if (close) assert.equal(stack.pop(), name, "unbalanced </" + name + ">");
    else stack.push(name);
  }
  assert.deepEqual(stack, []);
  const feedEps = live.filter(hasAudio);
  assert.equal((xml.match(/<item>/g) || []).length, feedEps.length);
  assert.equal((xml.match(/<enclosure /g) || []).length, feedEps.length);
  assert.ok(!/La Maison Gagne/.test(xml));
  for (const ep of feedEps) {
    assert.ok(existsSync(path.join(root, ep.audio.file)), "audio file missing: " + ep.audio.file);
    assert.ok(ep.audio.bytes > 0 && ep.audio.seconds > 0);
  }
  assert.ok(!/<[^>]*&(?!amp;|lt;|gt;|quot;|apos;)/.test(xml), "unescaped ampersand");
});

test("the server serves the podcast, its feed and episodes, and nothing outside it", async (t) => {
  const app = createApp();
  await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
  t.after(() => app.close());
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const get = (p) => fetch(base + p);
  for (const p of ["/podcast", "/podcast/", ...live.map((e) => "/podcast/" + e.slug)]) {
    const res = await get(p);
    assert.equal(res.status, 200, p);
    assert.match(res.headers.get("content-type"), /text\/html/);
    assert.match(await res.text(), /<h1[ >]/);
  }
  const feed = await get("/podcast/feed.xml");
  assert.equal(feed.status, 200);
  assert.match(feed.headers.get("content-type"), /xml/);
  for (const p of ["/css/podcast.css", "/js/podcast.js"]) assert.equal((await get(p)).status, 200, p);
  for (const ep of soon) assert.equal((await get("/podcast/" + ep.slug)).status, 404, ep.slug + " has no page");
  for (const p of ["/podcast/inconnu", "/podcast/..%2Fserver.mjs", "/podcast/%2e%2e/package.json", "/podcast/index.html/x", "/js/podcast-data.js.map"])
    assert.equal((await get(p)).status, 404, p);
});

test("publishing a recording switches the page to a real player and adds the episode to the feed", () => {
  const ep = live[0];
  const before = ep.audio;
  try {
    ep.audio = { file: "assets/podcast/essai.mp3", bytes: 3456789, seconds: 215 };
    const html = renderEpisode(ep);
    assert.match(html, /<audio controls preload="none" src="\/assets\/podcast\/essai\.mp3">/);
    assert.ok(!html.includes('data-player="speech"'));
    assert.match(html, /"associatedMedia"/);
    const xml = renderFeed();
    assert.equal((xml.match(/<item>/g) || []).length, 1);
    assert.match(xml, /<enclosure url="https:\/\/rien-ne-va-plus\.vercel\.app\/assets\/podcast\/essai\.mp3" length="3456789" type="audio\/mpeg"\/>/);
    assert.match(xml, /<itunes:duration>215<\/itunes:duration>/);
    assert.ok(xml.includes(`<podcast:transcript url="https://rien-ne-va-plus.vercel.app/podcast/${ep.slug}"`));
  } finally {
    ep.audio = before;
  }
  assert.ok(renderEpisode(ep).includes('data-player="speech"'));
});

test("an episode that is still `soon` never reaches the feed, even with audio", () => {
  const ep = soon[0];
  const before = ep.audio;
  try {
    ep.audio = { file: "assets/podcast/essai.mp3", bytes: 1, seconds: 1 };
    assert.equal((renderFeed().match(/<item>/g) || []).length, 0);
    assert.ok(!buildAll().has(`podcast/${ep.slug}.html`));
    assert.ok(!renderIndex().includes(`/podcast/${ep.slug}`));
  } finally {
    ep.audio = before;
  }
});
