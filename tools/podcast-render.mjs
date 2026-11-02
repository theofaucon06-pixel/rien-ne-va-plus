// Pure rendering of the podcast: data in, strings out. No file is written here (see build-podcast.mjs).
// Pages use root-absolute URLs so they work under /podcast, /podcast/ and /podcast/<slug> alike.
// Only episodes with `status: 'published'` get a page, a link and a feed entry; `soon` ones are teasers on the home page.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHOW, THEMES, EPISODES } from '../js/podcast-data.js';
import { REVELATIONS, WITNESSES, SOURCES } from '../js/content.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export const esc = (v) =>
  String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const stripTags = (v) => String(v).replace(/<[^>]*>/g, '');
export const frDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d === 1 ? '1er' : d} ${MONTHS[m - 1]} ${y}`;
};
const rfc822 = (iso) => new Date(iso + 'T08:00:00Z').toUTCString();

export const url = (p = '') => SHOW.baseUrl + p;
export const episodePath = (ep) => `/podcast/${ep.slug}`;
export const episodeLabel = (ep) => (ep.number === 0 ? 'Bande-annonce' : `Épisode ${ep.number}`);
const numLabel = (ep) => String(ep.number).padStart(2, '0');

export const isPublished = (ep) => ep.status === 'published';
export const isSoon = (ep) => ep.status === 'soon';
export const publishedEpisodes = () => EPISODES.filter(isPublished);
export const upcomingEpisodes = () => EPISODES.filter(isSoon);

export const wordCount = (ep) => ep.sections.flatMap((s) => s.p).join(' ').split(/\s+/).filter(Boolean).length;
// Spoken French runs at roughly 150 words a minute.
export const minutes = (ep) => (ep.audio ? Math.max(1, Math.round(ep.audio.seconds / 60)) : Math.max(1, Math.round(wordCount(ep) / 150)));
export const hasAudio = (ep) => !!ep.audio;
const coverPng = () => existsSync(path.join(root, 'assets', 'podcast', 'cover.png'));

const mechanicOf = (id) => REVELATIONS.find((r) => r.id === id);
const witnessOf = (id) => WITNESSES.find((w) => w.id === id);
export const statusOf = (id) => SOURCES.witnesses.find((w) => w.id === id)?.status || 'réel';
export const kindOfStatus = (s) => (/composite/.test(s) ? 'composite' : /fictif/.test(s) ? 'fictif' : 'réel');
const kindLabel = { réel: 'Personne réelle', composite: 'Personnage composite', fictif: 'Personnage fictif' };

// ---------------------------------------------------------------- shared page frame
function head({ title, description, path: p, type = 'website', ld, full: fullTitle, motion = false, experience = false }) {
  const full = fullTitle || `${title} — ${SHOW.name}`;
  const image = coverPng() ? url('/assets/podcast/cover.png') : url('/assets/icons/icon-512.png');
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(full)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url(p)}">
<meta property="og:site_name" content="${esc(SHOW.name)}">
<meta property="og:title" content="${esc(full)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="${type}">
<meta property="og:url" content="${url(p)}">
<meta property="og:image" content="${image}">
<meta property="og:locale" content="fr_FR">
<meta name="twitter:card" content="summary">
<meta name="theme-color" content="#C8FF2E">
<link rel="alternate" type="application/rss+xml" title="${esc(SHOW.name)}" href="/podcast/feed.xml">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="apple-touch-icon" href="/assets/icons/apple-touch-icon.png">
<link rel="icon" href="/assets/podcast/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/css/podcast-fonts.css">
<link rel="stylesheet" href="/css/podcast.css">${motion ? '\n<link rel="stylesheet" href="/css/podcast-motion.css">' : ''}${experience ? '\n<link rel="stylesheet" href="/css/episode-motion.css">\n<noscript><style>.zv-stage,.zv-bar,.zv-chapters{display:none}.zv>audio{display:block;width:100%}</style></noscript>' : ''}
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
</head>`;
}

const header = (current) => `<header class="pod-header">
  <a class="pod-mark" href="/podcast"><img src="/assets/podcast/logo.svg" alt="${esc(SHOW.name)}, accueil du podcast" height="44"></a>
  <nav class="pod-nav" aria-label="Navigation du podcast">
    <a href="/podcast#episodes"${current === 'episodes' ? ' aria-current="page"' : ''}>Épisodes</a>
    <a href="/podcast#zero">C’est quoi ?</a>
    <a href="/podcast#suivre">S’abonner</a>
    <a class="pod-game" href="/">Jouer <span aria-hidden="true">↗</span></a>
  </nav>
</header>`;

const helpBlock = () => `<aside class="pod-help" aria-labelledby="help-title">
  <div class="help-card">
    <span class="sticker st-red tilt-l">Besoin d’en parler ?</span>
    <div class="help-copy">
      <h2 id="help-title">${esc(SHOW.help.name)}</h2>
      <p>Écoute sans jugement, ${esc(SHOW.help.hours)}.</p>
    </div>
    <div class="help-actions">
      <a class="btn btn-ink" href="tel:${SHOW.help.phone.replace(/\s/g, '')}">${esc(SHOW.help.phone)}</a>
      <a class="pod-link" href="${SHOW.help.url}" target="_blank" rel="noopener noreferrer">joueurs-info-service.fr ↗</a>
    </div>
  </div>
</aside>`;

const footer = () => `<footer class="pod-footer">
  <strong>${esc(SHOW.name)}</strong>
  <span>Saison ${SHOW.season}, ${esc(SHOW.seasonTitle)}</span>
  <span class="foot-note">Un podcast de prévention. Aucun conseil pour gagner : il n’en existe pas.</span>
  <a href="/podcast/feed.xml">Flux RSS</a>
  <a href="/">Jouer à Rien ne va plus</a>
</footer>`;

const frame = (inner, current, { motion = false, experience = false } = {}) => `<body class="pod${experience ? ' pod-motion' : motion ? ' pod-ep' : ' pod-home'}">
<a class="pod-skip" href="#main">Aller au contenu</a>
${header(current)}
<main id="main">
${inner}
</main>
${footer()}
${experience ? '<script src="/js/episode-motion.js" defer></script>' : `${motion ? '<script src="/js/podcast-motion.js" defer></script>\n' : ''}<script src="/js/podcast.js" defer></script>`}
</body>
</html>
`;

const chips = (ep) => ep.themes.map((t) => `<li>${esc(THEMES[t] || t)}</li>`).join('');

const voiceSticker = (id, i) => {
  const w = witnessOf(id);
  const k = kindOfStatus(statusOf(id));
  return `<li class="voice v${i % 3}"><b>${esc(w.name)}</b><span>${esc(w.sub)}</span><em class="kind k-${k}">${kindLabel[k]}</em></li>`;
};
const tilts = ['tilt-l', 'tilt-r', 'tilt-l2', 'tilt-r2'];

// ---------------------------------------------------------------- index
export function renderIndex() {
  const live = publishedEpisodes();
  const soon = upcomingEpisodes();
  const [first, ...otherLive] = live;
  const liveMin = live.reduce((n, e) => n + minutes(e), 0);
  const voiceIds = [...new Set(live.flatMap((e) => e.witnesses))];
  const anyAudio = live.some(hasAudio);
  const nameWords = SHOW.name.split(/\s+/);

  const marqueeItems = [
    esc(SHOW.name.toUpperCase()),
    'LA MAISON GAGNE TOUJOURS',
    '37 CASES',
    '35 CONTRE 1',
    '97,3 CENTIMES PAR EURO MISÉ',
    'ZÉRO SERMON',
    'ZÉRO SYSTÈME POUR GAGNER'
  ];
  const marqueeSet = marqueeItems.map((t) => `<span>${t}</span>`).join('<i>●</i>') + '<i>●</i>';

  const playLabel = (ep) => (hasAudio(ep) ? 'Écouter' : 'Lancer');
  const meta = (ep) => `${episodeLabel(ep)} · ≈ ${minutes(ep)} min · ${hasAudio(ep) ? 'audio' : 'lecture vocale, enregistrement bientôt'}`;

  const feature = first
    ? `<article class="feature">
    <span class="sticker st-red tilt-r feature-tag">À la une</span>
    <span class="feature-num" aria-hidden="true">${numLabel(first)}</span>
    <div class="feature-body">
      <p class="mono">${esc(meta(first))}</p>
      <h3><a class="stretch" href="${episodePath(first)}">${esc(first.title)}</a></h3>
      <p class="feature-hook">${esc(first.hook)}</p>
      <ul class="chips" aria-label="Thèmes">${chips(first)}</ul>
      <span class="btn btn-lime" aria-hidden="true"><span class="ico">▶</span> ${playLabel(first)} l’épisode ${first.number}</span>
    </div>
  </article>`
    : '';

  const liveCards = otherLive
    .map(
      (ep, i) => `    <li class="live-card ${tilts[i % 4]}">
      <span class="mono">${esc(episodeLabel(ep))} · ≈ ${minutes(ep)} min</span>
      <h3><a class="stretch" href="${episodePath(ep)}">${esc(ep.title)}</a></h3>
      <p>${esc(ep.hook)}</p>
    </li>`
    )
    .join('\n');

  const teasers = soon
    .map(
      (ep) => `    <li class="soon-card">
      <span class="soon-num" aria-hidden="true">${numLabel(ep)}</span>
      <span class="sticker st-red ${ep.number % 2 ? 'tilt-r' : 'tilt-l'}">Bientôt</span>
      <p class="mono">${esc(episodeLabel(ep))}</p>
      <h3>${esc(ep.title)}</h3>
      <p class="soon-hook">${esc(ep.hook)}</p>
    </li>`
    )
    .join('\n');

  const voices = voiceIds.map(voiceSticker).join('\n      ');

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'PodcastSeries',
    name: SHOW.name,
    description: SHOW.description,
    url: url('/podcast'),
    inLanguage: SHOW.language,
    webFeed: url('/podcast/feed.xml'),
    author: { '@type': 'Person', name: SHOW.host },
    ...(live.length
      ? { episode: live.map((ep) => ({ '@type': 'PodcastEpisode', name: ep.title, url: url(episodePath(ep)), episodeNumber: ep.number })) }
      : {})
  };

  const inner = `<section class="hero" aria-labelledby="hero-title">
  <div class="hero-grid">
    <div class="hero-copy">
      <p class="tag"><span class="tag-dot" aria-hidden="true"></span>Podcast · Saison ${SHOW.season} · ${esc(SHOW.seasonTitle)}</p>
      <h1 id="hero-title">${nameWords.map((w, i) => `<span class="w${i}">${esc(w)}</span>`).join(' ')}</h1>
      <p class="promise">${esc(SHOW.tagline)}</p>
      <p class="sub">Des mécanismes réels, des histoires vraies, des sources. Zéro sermon.</p>
      <div class="hero-actions">
${first ? `        <a class="btn btn-ink btn-xl" href="${episodePath(first)}"><span class="ico" aria-hidden="true">▶</span> ${playLabel(first)} l’épisode ${first.number}</a>
        <p class="mono hero-meta">≈ ${minutes(first)} min · ${hasAudio(first) ? 'audio' : 'lecture vocale, enregistrement bientôt'}</p>` : `        <a class="btn btn-ink btn-xl" href="#suivre">Suivre le podcast</a>`}
      </div>
    </div>
    <div class="hero-art" aria-hidden="true">
      <div class="zero-disc"><span class="zero">0</span><span class="zero-cap">la case verte</span></div>
      <span class="sticker st-white tilt-l big-sticker">1 case sur 37</span>
      <span class="sticker st-red tilt-r big-sticker s2">35 contre 1</span>
    </div>
  </div>
${first ? `  <p class="sticker st-ink tilt-r hero-badge">Épisode ${first.number} dispo</p>` : ''}
</section>

<div class="marquee" aria-hidden="true"><div class="marquee-track"><div class="marquee-set">${marqueeSet}</div><div class="marquee-set">${marqueeSet}</div><div class="marquee-set">${marqueeSet}</div><div class="marquee-set">${marqueeSet}</div></div></div>

<section class="block block-paper" id="episodes" aria-labelledby="episodes-title">
  <div class="wrap">
    <div class="block-head">
      <h2 id="episodes-title">Dispo <span class="hl">maintenant</span></h2>
      <p class="mono">${live.length} épisode${live.length > 1 ? 's' : ''} · ≈ ${liveMin} min</p>
    </div>
${feature}
${liveCards ? `    <ul class="live-grid">\n${liveCards}\n    </ul>` : ''}
    <p class="note-audio">${live.every((e) => e.experience === 'motion') ? 'Chaque épisode se regarde en même temps qu’il s’écoute : le motion design se joue en direct, calé sur la voix.' : anyAudio ? 'Chaque page propose aussi le texte complet.' : 'Chaque page propose le texte complet et une lecture vocale par ton navigateur. La version enregistrée arrive bientôt.'}</p>
  </div>
</section>

${soon.length ? `<section class="block block-ink" id="bientot" aria-labelledby="soon-title">
  <div class="wrap">
    <div class="block-head">
      <h2 id="soon-title">Ça arrive<span class="hl">.</span></h2>
      <p class="mono">${soon.length} épisode${soon.length > 1 ? 's' : ''} en préparation</p>
    </div>
    <ul class="soon-grid">
${teasers}
    </ul>
  </div>
</section>` : ''}

<section class="block block-lime" id="zero" aria-labelledby="zero-title">
  <div class="wrap">
    <div class="zero-head">
      <p class="tag"><span class="tag-dot" aria-hidden="true"></span>Le concept</p>
      <h2 id="zero-title">C’est quoi, le zéro vert ?</h2>
    </div>
    <div class="zero-grid">
      <div class="prose">
        <p>À la roulette européenne, il y a 36 numéros… et un zéro. Il est vert.</p>
        <p>Quand tu mises sur un numéro et qu’il sort, le casino te paie 35 contre 1. Sauf qu’il y a 37 cases, pas 36. Cette case en plus, c’est toute la marge de la maison : chaque euro misé te revient, en moyenne, à 97,3 centimes.</p>
        <p>${esc(SHOW.name)} est présenté par ${esc(SHOW.host)}. Il prolonge le jeu <a href="/">Rien ne va plus</a>, une simulation en 3D où l’argent est faux mais les probabilités sont vraies.</p>
        <p><strong>Ce que tu n’y trouveras pas :</strong> un système pour gagner. Il n’y en a pas, et c’est le sujet.</p>
      </div>
      <ul class="stats" aria-label="Les chiffres du zéro vert">
        <li class="stat st-red tilt-l"><b>37</b><span>cases sur la roue</span></li>
        <li class="stat tilt-r st-white"><b>35 : 1</b><span>ce que paie un numéro</span></li>
        <li class="stat tilt-l2 st-ink"><b>2,7&nbsp;%</b><span>gardés par la maison</span></li>
      </ul>
    </div>
${voices ? `    <div class="voices" id="voix">
      <h3>Qui parle</h3>
      <p class="voices-note">Chaque personnage est annoncé pour ce qu’il est : une personne qui a existé, un portrait composite construit sur des témoignages publiés, ou un personnage fictif qui représente un service réel.</p>
      <ul class="voice-list">
      ${voices}
      </ul>
    </div>` : ''}
  </div>
</section>

<section class="block block-paper" id="suivre" aria-labelledby="follow-title">
  <div class="wrap follow">
    <div>
      <p class="tag"><span class="tag-dot" aria-hidden="true"></span>S’abonner</p>
      <h2 id="follow-title">Un flux, tous tes lecteurs</h2>
    </div>
    <div class="follow-card">
      <p>Le flux RSS marche dans n’importe quelle appli de podcasts.</p>
      <div class="rss">
        <label for="rss-url" class="visually-hidden">Adresse du flux RSS</label>
        <input id="rss-url" type="text" readonly value="${url('/podcast/feed.xml')}">
        <button type="button" class="btn btn-ink" data-copy="#rss-url">Copier</button>
      </div>
      <p class="honest">${anyAudio ? '' : 'Pour l’instant le flux est vide, et c’est normal : les plateformes n’acceptent que des fichiers audio, et il se remplit tout seul dès que le premier épisode enregistré est publié. '}Les liens Apple Podcasts, Spotify et autres arriveront ici dès l’inscription du flux.</p>
    </div>
  </div>
</section>

<section class="play-band" aria-labelledby="play-title">
  <div class="wrap play-inner">
    <h2 id="play-title">Un casino pour de faux.<br>Les probabilités pour de vrai.</h2>
    <div class="play-side">
      <p>Quinze mécaniques à découvrir, quatorze témoins à rencontrer, seul ou jusqu’à huit amis. Aucun argent réel, aucun compte.</p>
      <a class="btn btn-ink btn-xl" href="/">Jouer à Rien ne va plus <span class="ico" aria-hidden="true">↗</span></a>
    </div>
  </div>
</section>

${helpBlock()}`;

  return (
    head({ title: SHOW.name, full: `${SHOW.name} — le podcast de Rien ne va plus`, description: SHOW.description, path: '/podcast', ld }) + '\n' + frame(inner, 'episodes')
  );
}

// ---------------------------------------------------------------- episode
function sourcesFor(ep) {
  const out = [];
  for (const id of ep.mechanics) {
    const refs = SOURCES.mechanics.find((m) => m.id === id)?.refs || [];
    const r = mechanicOf(id);
    out.push({ title: `Mécanisme : ${r.title}`, refs });
  }
  for (const id of ep.witnesses) {
    const s = SOURCES.witnesses.find((w) => w.id === id);
    const w = witnessOf(id);
    if (s) out.push({ title: `${w.name} (${s.status})`, refs: s.refs });
  }
  return out;
}

const attr = (name, v) => (v == null || v === '' ? '' : ` ${name}="${esc(v)}"`);

const frTime = (sec) => `${Math.floor(sec / 60)}:${String(Math.round(sec) % 60).padStart(2, '0')}`;
const isoDuration = (sec) => `PT${Math.floor(sec / 60)}M${Math.round(sec) % 60}S`;

function sourcesHtml(ep) {
  return sourcesFor(ep)
    .map(
      (g) => `      <div class="src-group"><h4>${esc(g.title)}</h4><ul>
${g.refs.map((r) => `        <li>${r}</li>`).join('\n')}
      </ul></div>`
    )
    .join('\n');
}

function episodeLd(ep) {
  const min = minutes(ep);
  return {
    '@context': 'https://schema.org',
    '@type': 'PodcastEpisode',
    name: ep.title,
    description: ep.summary,
    url: url(episodePath(ep)),
    datePublished: SHOW.published,
    inLanguage: SHOW.language,
    episodeNumber: ep.number,
    timeRequired: ep.audio ? isoDuration(ep.audio.seconds) : `PT${min}M`,
    partOfSeries: { '@type': 'PodcastSeries', name: SHOW.name, url: url('/podcast') },
    author: { '@type': 'Person', name: SHOW.host },
    ...(ep.audio ? { associatedMedia: { '@type': 'MediaObject', contentUrl: url('/' + ep.audio.file) } } : {})
  };
}

function episodeNav(ep) {
  const live = publishedEpisodes();
  const i = live.indexOf(ep);
  const prev = live[i - 1];
  const nextLive = live[i + 1];
  const nextSoon = EPISODES.find((e) => isSoon(e) && e.number > ep.number);
  const left = prev
    ? `<a class="nav-card" href="${episodePath(prev)}"><small>← ${esc(episodeLabel(prev))}</small><span>${esc(prev.title)}</span></a>`
    : `<a class="nav-card" href="/podcast#episodes"><small>← Retour</small><span>Tous les épisodes</span></a>`;
  const right = nextLive
    ? `<a class="nav-card nav-next" href="${episodePath(nextLive)}"><small>${esc(episodeLabel(nextLive))} →</small><span>${esc(nextLive.title)}</span></a>`
    : nextSoon
      ? `<div class="nav-card nav-next is-soon"><small>Bientôt · ${esc(episodeLabel(nextSoon))}</small><span>${esc(nextSoon.title)}</span></div>`
      : `<a class="nav-card nav-next" href="/podcast#suivre"><small>La suite</small><span>Suivre le podcast →</span></a>`;
  return `<nav class="ep-nav" aria-label="Épisodes voisins">
    ${left}
    ${right}
  </nav>`;
}

// ---- gabarit « motion » : la scène de la vidéo rejouée en direct, calée sur l'audio (voir README, « Le podcast »)
const svgIcon = (cls, inner) => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${inner}</svg>`;
const stroke = 'fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';
const ICON = {
  play: svgIcon('i-play', '<path d="M7 4.5v15l13-7.5z"/>'),
  pause: svgIcon('i-pause', '<path d="M6 4h4.5v16H6zM13.5 4H18v16h-4.5z"/>'),
  vol: svgIcon('i-vol', `<path d="M3 9.5v5h4l5 4.5v-14L7 9.5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.2 5.8a9 9 0 0 1 0 12.4" ${stroke} stroke-width="2.2"/>`),
  mute: svgIcon('i-mute', `<path d="M3 9.5v5h4l5 4.5v-14L7 9.5z"/><path d="M16 9.5l5 5M21 9.5l-5 5" ${stroke} stroke-width="2.2"/>`),
  enter: svgIcon('i-enter', `<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" ${stroke} stroke-width="2.6"/>`),
  exit: svgIcon('i-exit', `<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" ${stroke} stroke-width="2.6"/>`),
  replay: svgIcon('i-replay', `<path d="M5 12a7 7 0 1 0 2.2-5.1M4 3.5v5h5" ${stroke} stroke-width="3"/>`)
};

// The timeline copy is committed (assets/podcast/<slug>.timeline.json, written by tools/video/build-timeline.mjs): the page
// must not depend on output/, which git ignores. Its hash goes in the URL so a cached copy never outlives a change.
function timelineFor(ep) {
  const rel = `assets/podcast/${ep.slug}.timeline.json`;
  const abs = path.join(root, rel);
  if (!existsSync(abs)) throw new Error(`${rel} manquant : lance « node tools/video/build-timeline.mjs » (voir README, « Le podcast »)`);
  return { rel, hash: createHash('sha1').update(readFileSync(abs)).digest('hex').slice(0, 8) };
}

function renderMotionEpisode(ep) {
  const p = episodePath(ep);
  if (!ep.audio) throw new Error(`${ep.slug}: l'expérience motion a besoin de l'audio (champ \`audio\`)`);
  const tl = timelineFor(ep);
  const poster = typeof ep.poster === 'number' ? ep.poster : 0;
  const chapters = ep.sections
    .map((s, k) => `        <li><button type="button" data-chap="${k}"><b>${k + 1}</b><span>${esc(s.h)}</span><time></time></button></li>`)
    .join('\n');
  const transcript = ep.sections
    .map((s) => `      <h2>${esc(s.h)}</h2>\n${s.p.map((t) => `      <p>${esc(t)}</p>`).join('\n')}`)
    .join('\n');
  const label = `${ep.title}, ${episodeLabel(ep)}`;

  const inner = `<article class="ep-motion-page">
  <section class="ep-motion" aria-labelledby="ep-title">
    <div class="ep-motion-wrap">
      <div class="ep-motion-top">
        <span class="sticker st-red tilt-r ep-tag">${esc(episodeLabel(ep))}</span>
        <nav class="crumbs" aria-label="Fil d’Ariane"><a href="/podcast">Podcast</a> <span aria-hidden="true">/</span> <span>${esc(episodeLabel(ep))}</span></nav>
      </div>
      <div class="ep-motion-head">
        <h1 id="ep-title">${esc(ep.title)}</h1>
        <p class="lead">${esc(ep.hook)}</p>
      </div>

      <div class="zv" data-zv data-slug="${esc(ep.slug)}" data-title="${esc(label)}" data-poster="${poster}" data-total="${ep.audio.seconds}" data-timeline="/${tl.rel}?v=${tl.hash}">
        <div class="zv-stage" data-zv-mount>
          <button type="button" class="zv-big" aria-label="Lancer l’épisode : ${esc(ep.title)}"><span class="zv-big-disc">${ICON.play}${ICON.replay}</span><span class="zv-big-label"></span></button>
          <p class="zv-status" role="status" aria-live="polite"></p>
        </div>
        <div class="zv-bar" role="group" aria-label="Commandes du lecteur">
          <button type="button" class="zv-btn" data-act="play" aria-label="Lecture" aria-pressed="false">${ICON.play}${ICON.pause}</button>
          <p class="zv-time" aria-hidden="true"><span data-cur>0:00</span><span> / </span><span data-tot>${frTime(ep.audio.seconds)}</span></p>
          <div class="zv-seek" data-seek role="slider" tabindex="0" aria-label="Position dans l’épisode" aria-valuemin="0" aria-valuemax="${ep.audio.seconds}" aria-valuenow="0" aria-valuetext="0 minute 0 seconde">
            <div class="zv-rail"><div class="zv-track"><i class="zv-fill"></i></div><span class="zv-marks"></span><span class="zv-thumb"></span></div>
          </div>
          <button type="button" class="zv-btn" data-act="mute" aria-label="Couper le son" aria-pressed="false">${ICON.vol}${ICON.mute}</button>
          <button type="button" class="zv-btn" data-act="fs" aria-label="Plein écran" aria-pressed="false">${ICON.enter}${ICON.exit}</button>
        </div>
        <ol class="zv-chapters" aria-label="Chapitres">
${chapters}
        </ol>
        <audio controls preload="metadata" src="/${ep.audio.file}"></audio>
      </div>

      <section class="visually-hidden" aria-label="Transcription">
${transcript}
      <h2>À retenir</h2>
      <ol>
${ep.retenir.map((t) => `        <li>${esc(t)}</li>`).join('\n')}
      </ol>
      </section>
    </div>
  </section>

${helpBlock()}

  <div class="ep-motion-more">
    <div class="ep-motion-wrap">
      <details class="sources" id="sources">
        <summary>Sources et références</summary>
${sourcesHtml(ep)}
      </details>
    </div>
  </div>

  ${episodeNav(ep)}
</article>`;

  return head({ title: ep.title, description: ep.summary, path: p, type: 'article', ld: episodeLd(ep), experience: true }) + '\n' + frame(inner, 'episodes', { experience: true });
}

// js/episode-motion.js = lib.js + the components used by the timelines of the published motion episodes (union, in a fixed
// order) + the embed prelude + core.js + the player, concatenated (the same files render the video: nothing is duplicated).
// One bundle serves every motion episode. A component is added as soon as a published motion episode's timeline uses it;
// a component a timeline names but that does not exist yet is skipped (core.js reports it in __info.missing and draws nothing).
// Generated by tools/build-podcast.mjs: never edit it by hand.
const readTimeline = (ep) => {
  const abs = path.join(root, `assets/podcast/${ep.slug}.timeline.json`);
  return existsSync(abs) ? JSON.parse(readFileSync(abs, 'utf8')) : null; // renderMotionEpisode reports a missing timeline
};
export function motionComponents(eps = publishedEpisodes().filter((ep) => ep.experience === 'motion'), timelineOf = readTimeline) {
  const cdir = path.join(root, 'tools', 'video', 'composition', 'components');
  const have = new Set(readdirSync(cdir).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3)));
  const used = new Set();
  for (const ep of eps) {
    for (const shot of (timelineOf(ep) || {}).shots || []) if (shot.component) used.add(shot.component);
  }
  return [...used].filter((id) => have.has(id)).sort();
}

export function renderMotionBundle(eps) {
  const dir = path.join(root, 'tools', 'video', 'composition');
  const files = ['lib.js', ...motionComponents(eps).map((id) => `components/${id}.js`), 'embed-prelude.js', 'core.js', 'embed-player.js'];
  const parts = files.map((f) => `/* ==== tools/video/composition/${f} ==== */\n${readFileSync(path.join(dir, f), 'utf8').trimEnd()}\n`);
  return `/* Zéro Vert — lecteur « motion » des épisodes. FICHIER GÉNÉRÉ par tools/build-podcast.mjs (npm run podcast) : ne pas éditer.\n   Sources : tools/video/composition/ (lib, components/*, embed-prelude, core, embed-player). */\n` + parts.join(';\n');
}

export function renderEpisode(ep) {
  if (ep.experience === 'motion') return renderMotionEpisode(ep);
  const p = episodePath(ep);
  const min = minutes(ep);
  const hasScene = ep.sections.some((s) => s.scene);

  const toc = ep.sections.map((s, k) => `<li><a href="#s${k + 1}">${esc(s.h)}</a></li>`).join('\n      ');

  const body = ep.sections
    .map(
      (s, k) => `    <section class="script-sec" id="s${k + 1}" aria-labelledby="s${k + 1}-h"${attr('data-scene', s.scene)}${attr('data-cap', s.cap)}${attr('data-big', s.big)}>
      <h3 id="s${k + 1}-h" data-tts>${esc(s.h)}</h3>
${s.p.map((t) => `      <p data-tts>${esc(t)}</p>`).join('\n')}
    </section>`
    )
    .join('\n');

  const people = ep.witnesses.map(voiceSticker).join('\n        ');

  const game = ep.mechanics
    .map((id) => {
      const r = mechanicOf(id);
      return `<li><b>${String(r.n).padStart(2, '0')} · ${esc(r.title)}</b><span>${esc(r.hint)}</span></li>`;
    })
    .join('\n        ');

  const sources = sourcesHtml(ep);

  const audio = ep.audio
    ? `<div class="player" data-player="audio" data-slug="${ep.slug}">
      <audio controls preload="none" src="/${ep.audio.file}"></audio>
      <div class="player-row">
        <button type="button" data-act="back" aria-label="Reculer de 15 secondes">−15 s</button>
        <button type="button" data-act="fwd" aria-label="Avancer de 30 secondes">+30 s</button>
        <label>Vitesse <select data-act="rate"><option value="0.9">0,9×</option><option value="1" selected>1×</option><option value="1.25">1,25×</option><option value="1.5">1,5×</option></select></label>
        <a href="/${ep.audio.file}" download>Télécharger</a>
      </div>
    </div>`
    : `<div class="player" data-player="speech" data-slug="${ep.slug}" hidden>
      <div class="player-main">
        <button type="button" class="play" data-act="play" aria-label="Lire l’épisode à voix haute"><span aria-hidden="true">▶</span></button>
        <div class="player-info"><b>Lecture vocale</b><span data-status role="status" aria-live="polite">Voix de ton navigateur. Version enregistrée à venir.</span></div>
      </div>
      <div class="player-row">
        <button type="button" data-act="prev" aria-label="Paragraphe précédent">⏮</button>
        <button type="button" data-act="next" aria-label="Paragraphe suivant">⏭</button>
        <button type="button" data-act="stop" aria-label="Arrêter la lecture">■</button>
        <label>Vitesse <select data-act="rate"><option value="0.85">0,85×</option><option value="1" selected>1×</option><option value="1.15">1,15×</option><option value="1.3">1,3×</option></select></label>
        <label class="voice-pick" hidden>Voix <select data-act="voice"></select></label>
      </div>
      <div class="progress" aria-hidden="true"><i></i></div>
    </div>`;

  const ld = episodeLd(ep);

  const nav = episodeNav(ep);

  const stage = hasScene ? `<div class="stage" data-stage aria-hidden="true"><div class="stage-view"></div><div class="stage-hud"></div></div>\n      ` : '';

  const inner = `<article class="ep">
  <header class="ep-hero">
    <div class="wrap">
      <nav class="crumbs" aria-label="Fil d’Ariane"><a href="/podcast">Podcast</a> <span aria-hidden="true">/</span> <span>${esc(episodeLabel(ep))}</span></nav>
      <span class="sticker st-red tilt-r ep-tag">${esc(episodeLabel(ep))}</span>
      <h1>${esc(ep.title)}</h1>
      <p class="lead">${esc(ep.hook)}</p>
      <ul class="metas">
        <li>≈ ${min} min</li>
        <li>Texte du ${frDate(SHOW.published)}</li>
        <li>${ep.audio ? 'Audio disponible' : 'Audio bientôt'}</li>
      </ul>
      <p class="ep-summary">${esc(ep.summary)}</p>
      <ol class="toc" aria-label="Dans cet épisode">
      ${toc}
      <li><a href="#retenir">À retenir</a></li>
      </ol>
    </div>
  </header>

  <div class="ep-split">
    <div class="stage-col">
      ${stage}${audio}
    </div>

    <div class="script">
${body}

    <section class="retenir" id="retenir" aria-labelledby="retenir-h">
      <h3 id="retenir-h">À retenir</h3>
      <ol>
${ep.retenir.map((t) => `        <li>${esc(t)}</li>`).join('\n')}
      </ol>
    </section>

${ep.witnesses.length ? `    <section class="people" id="personnes" aria-labelledby="people-h">
      <h3 id="people-h">Les voix de cet épisode</h3>
      <ul class="voice-list">
        ${people}
      </ul>
    </section>
` : ''}
    <section class="in-game" aria-labelledby="game-h">
      <h3 id="game-h">Dans le jeu</h3>
      <p>Tu peux vivre ${ep.mechanics.length > 1 ? 'ces mécanismes' : 'ce mécanisme'} sans risque, avec de l’argent fictif.</p>
      <ul>
        ${game}
      </ul>
      <a class="btn btn-ink" href="/">Entrer dans le casino <span class="ico" aria-hidden="true">↗</span></a>
    </section>

    <details class="sources" id="sources">
      <summary>Sources et références</summary>
${sources}
    </details>
    </div>
  </div>

  ${nav}
</article>

${helpBlock()}`;

  return head({ title: ep.title, description: ep.summary, path: p, type: 'article', ld, motion: true }) + '\n' + frame(inner, 'episodes', { motion: true });
}

// ---------------------------------------------------------------- RSS
const x = esc;
export function renderFeed() {
  const withAudio = publishedEpisodes().filter(hasAudio);
  const image = coverPng() ? url('/assets/podcast/cover.png') : null;
  const items = withAudio
    .map((ep) => {
      const a = ep.audio;
      return `    <item>
      <title>${x(ep.title)}</title>
      <link>${url(episodePath(ep))}</link>
      <guid isPermaLink="true">${url(episodePath(ep))}</guid>
      <pubDate>${rfc822(ep.published || SHOW.published)}</pubDate>
      <description>${x(ep.summary)}</description>
      <enclosure url="${url('/' + a.file)}" length="${a.bytes}" type="audio/mpeg"/>
      <itunes:title>${x(ep.title)}</itunes:title>
      <itunes:episode>${ep.number}</itunes:episode>
      <itunes:season>${SHOW.season}</itunes:season>
      <itunes:episodeType>${ep.kind === 'trailer' ? 'trailer' : 'full'}</itunes:episodeType>
      <itunes:duration>${a.seconds}</itunes:duration>
      <itunes:explicit>${SHOW.explicit ? 'true' : 'false'}</itunes:explicit>
      <podcast:transcript url="${url(episodePath(ep))}" type="text/html" language="fr"/>
    </item>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:podcast="https://podcastindex.org/namespace/1.0">
  <channel>
    <title>${x(SHOW.name)}</title>
    <link>${url('/podcast')}</link>
    <atom:link href="${url('/podcast/feed.xml')}" rel="self" type="application/rss+xml"/>
    <description>${x(SHOW.description)}</description>
    <language>${SHOW.language.toLowerCase()}</language>
    <lastBuildDate>${rfc822([SHOW.published, ...withAudio.map((e) => e.published).filter(Boolean)].sort().pop())}</lastBuildDate>
    <generator>Rien ne va plus — tools/build-podcast.mjs</generator>
    <copyright>© ${SHOW.published.slice(0, 4)} ${x(SHOW.host)}</copyright>
    <itunes:author>${x(SHOW.host)}</itunes:author>
    <itunes:summary>${x(SHOW.description)}</itunes:summary>
    <itunes:type>episodic</itunes:type>
    <itunes:explicit>${SHOW.explicit ? 'true' : 'false'}</itunes:explicit>
    <itunes:category text="${x(SHOW.category)}"><itunes:category text="${x(SHOW.subcategory)}"/></itunes:category>${image ? `\n    <itunes:image href="${image}"/>\n    <image><url>${image}</url><title>${x(SHOW.name)}</title><link>${url('/podcast')}</link></image>` : ''}
${items}
  </channel>
</rss>
`;
}

// ---------------------------------------------------------------- everything
// Map of file path (relative to the repository) to its content. Only published episodes get a page.
export function buildAll() {
  const files = new Map();
  files.set('podcast/index.html', renderIndex());
  for (const ep of publishedEpisodes()) files.set(`podcast/${ep.slug}.html`, renderEpisode(ep));
  if (publishedEpisodes().some((ep) => ep.experience === 'motion')) files.set('js/episode-motion.js', renderMotionBundle());
  files.set('podcast/feed.xml', renderFeed());
  return files;
}
