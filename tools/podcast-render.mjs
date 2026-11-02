// Pure rendering of the podcast: data in, strings out. No file is written here (see build-podcast.mjs).
// Pages use root-absolute URLs so they work under /podcast, /podcast/ and /podcast/<slug> alike.
import { existsSync } from 'node:fs';
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

export const wordCount = (ep) => ep.sections.flatMap((s) => s.p).join(' ').split(/\s+/).filter(Boolean).length;
// Spoken French runs at roughly 150 words a minute.
export const minutes = (ep) => Math.max(1, Math.round(wordCount(ep) / 150));
export const hasAudio = (ep) => !!ep.audio;
const coverFile = (ext) => existsSync(path.join(root, 'assets', 'podcast', `cover.${ext}`));
const coverPng = () => coverFile('png');

const mechanicOf = (id) => REVELATIONS.find((r) => r.id === id);
const witnessOf = (id) => WITNESSES.find((w) => w.id === id);
export const statusOf = (id) => SOURCES.witnesses.find((w) => w.id === id)?.status || 'réel';
export const kindOfStatus = (s) => (/composite/.test(s) ? 'composite' : /fictif/.test(s) ? 'fictif' : 'réel');
const kindLabel = { réel: 'Personne réelle', composite: 'Personnage composite', fictif: 'Personnage fictif' };

// ---------------------------------------------------------------- shared page frame
function head({ title, description, path: p, type = 'website', ld, full: fullTitle }) {
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
<meta name="theme-color" content="#0E2A20">
<link rel="alternate" type="application/rss+xml" title="${esc(SHOW.name)}" href="/podcast/feed.xml">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="apple-touch-icon" href="/assets/icons/apple-touch-icon.png">
<link rel="icon" href="/assets/icons/icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/css/podcast.css">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
</head>`;
}

const header = (current) => `<header class="pod-header">
  <a class="pod-mark" href="/podcast" aria-label="${esc(SHOW.name)}, accueil du podcast"><span class="pod-sym" aria-hidden="true">♦</span><span>${esc(SHOW.name.toUpperCase())}<small>LE PODCAST DE RIEN NE VA PLUS</small></span></a>
  <nav class="pod-nav" aria-label="Navigation du podcast">
    <a href="/podcast#episodes"${current === 'episodes' ? ' aria-current="page"' : ''}>Épisodes</a>
    <a href="/podcast#voix">Les voix</a>
    <a href="/podcast#suivre">S’abonner</a>
    <a class="pod-game" href="/">Le jeu <span aria-hidden="true">↗</span></a>
  </nav>
</header>`;

const helpBlock = () => `<aside class="pod-help" aria-labelledby="help-title">
  <div><span class="label">BESOIN D’EN PARLER ?</span>
  <h2 id="help-title">${esc(SHOW.help.name)}</h2>
  <p>Écoute sans jugement, ${esc(SHOW.help.hours)}.</p></div>
  <a class="pod-btn" href="tel:${SHOW.help.phone.replace(/\s/g, '')}">${esc(SHOW.help.phone)}</a>
  <a class="pod-link" href="${SHOW.help.url}" target="_blank" rel="noopener noreferrer">joueurs-info-service.fr ↗</a>
</aside>`;

const footer = () => `<footer class="pod-footer">
  <span>${esc(SHOW.name)} · Saison ${SHOW.season}, ${esc(SHOW.seasonTitle)}</span>
  <span>Un podcast de prévention. Aucun conseil pour gagner : il n’en existe pas.</span>
  <a href="/podcast/feed.xml">Flux RSS</a>
</footer>`;

const frame = (inner, current) => `<body class="pod">
<a class="pod-skip" href="#main">Aller au contenu</a>
${header(current)}
<main id="main">
${inner}
</main>
${footer()}
<script src="/js/podcast.js" defer></script>
</body>
</html>
`;

const themeChips = (ep) => ep.themes.map((t) => `<span class="chip">${esc(THEMES[t])}</span>`).join('');

// ---------------------------------------------------------------- index
export function renderIndex() {
  const [trailer, first] = EPISODES;
  const used = [...new Set(EPISODES.flatMap((e) => e.witnesses))];
  const totalMin = EPISODES.reduce((n, e) => n + minutes(e), 0);

  const rows = EPISODES.map((ep) => `    <li class="ep-row" data-themes="${ep.themes.join(' ')}">
      <a class="ep-link" href="${episodePath(ep)}">
        <span class="ep-num" aria-hidden="true">${ep.number === 0 ? '—' : String(ep.number).padStart(2, '0')}</span>
        <span class="ep-body">
          <span class="ep-kicker">${esc(episodeLabel(ep))} · ${hasAudio(ep) ? 'audio' : 'texte'} · ≈ ${minutes(ep)} min</span>
          <span class="ep-title">${esc(ep.title)}</span>
          <span class="ep-hook">${esc(ep.hook)}</span>
          <span class="ep-chips">${themeChips(ep)}</span>
        </span>
        <span class="ep-go" aria-hidden="true">→</span>
      </a>
    </li>`).join('\n');

  const filters = Object.entries(THEMES)
    .filter(([k]) => EPISODES.some((e) => e.themes.includes(k)))
    .map(([k, v]) => `<button type="button" class="filter" data-filter="${k}" aria-pressed="false">${esc(v)}</button>`)
    .join('\n      ');

  const voices = used
    .map((id) => {
      const w = witnessOf(id);
      const st = statusOf(id);
      const k = kindOfStatus(st);
      const ep = EPISODES.find((e) => e.witnesses.includes(id));
      return `    <li class="voice" style="--c:${w.color}">
      <a href="${episodePath(ep)}#personnes">
        <span class="voice-dot" aria-hidden="true">${esc(w.name.replace(/^(Un|Une|L’|L')\s?/i, '').charAt(0).toUpperCase())}</span>
        <span class="voice-name">${esc(w.name)}</span>
        <span class="voice-sub">${esc(w.sub)}</span>
        <span class="voice-kind k-${k}">${kindLabel[k]}</span>
      </a>
    </li>`;
    })
    .join('\n');

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'PodcastSeries',
    name: SHOW.name,
    description: SHOW.description,
    url: url('/podcast'),
    inLanguage: SHOW.language,
    webFeed: url('/podcast/feed.xml'),
    author: { '@type': 'Person', name: SHOW.host }
  };

  const inner = `<section class="pod-hero">
  <div class="pod-hero-copy">
    <div class="eyebrow"><span class="live-dot" aria-hidden="true"></span> PODCAST · SAISON ${SHOW.season} · ${esc(SHOW.seasonTitle.toUpperCase())}</div>
    <h1>La maison<br><em>gagne.</em></h1>
    <p class="lead">${esc(SHOW.tagline)} ${EPISODES.length - 1} épisodes courts, un mécanisme à chaque fois, une vraie histoire derrière, et toutes les sources.</p>
    <div class="actions">
      <a class="pod-btn primary" href="${episodePath(first)}">Commencer par l’épisode 1 <span aria-hidden="true">→</span></a>
      <a class="pod-btn" href="${episodePath(trailer)}">Bande-annonce</a>
    </div>
    <ul class="proofs" aria-label="Nos principes">
      <li><b>Sourcé</b> chaque chiffre renvoie à une référence</li>
      <li><b>Sans sermon</b> on explique, on ne juge pas</li>
      <li><b>Honnête</b> réel, composite ou fictif : toujours dit</li>
    </ul>
  </div>
  <div class="pod-hero-art">
    <img src="/assets/podcast/cover.svg" width="560" height="560" alt="Pochette du podcast : une roue de roulette dont la bille s’arrête, au centre de laquelle on lit « La Maison Gagne »." fetchpriority="high">
    <p class="art-note"><small>LE SAVIEZ-VOUS ?</small>Sur une roue européenne, chaque euro misé rapporte en moyenne <em>97,3 centimes.</em></p>
  </div>
</section>

<section class="pod-section" id="episodes" aria-labelledby="episodes-title">
  <div class="section-head">
    <h2 id="episodes-title">Les épisodes <span>(${EPISODES.length})</span></h2>
    <span class="muted">≈ ${totalMin} MIN AU TOTAL</span>
  </div>
  <div class="filters" role="group" aria-label="Filtrer par thème" hidden>
      <button type="button" class="filter" data-filter="all" aria-pressed="true">Tous</button>
      ${filters}
  </div>
  <ol class="ep-list">
${rows}
  </ol>
  <p class="muted note-audio">Les épisodes se lisent et s’écoutent : chaque page propose le texte complet et une lecture vocale par ton navigateur. La version enregistrée arrive épisode par épisode.</p>
</section>

<section class="pod-section split" id="apropos" aria-labelledby="about-title">
  <div>
    <span class="label">LE PODCAST</span>
    <h2 id="about-title">Regarder le décor<br>de l’autre côté</h2>
  </div>
  <div class="prose">
    <p>${esc(SHOW.description)}</p>
    <p>La Maison Gagne est présenté par ${esc(SHOW.host)}. Il prolonge le jeu <a href="/">Rien ne va plus</a>, une simulation en 3D où l’argent est faux mais les probabilités sont réelles. Chaque épisode correspond à des mécaniques que tu peux expérimenter dans le jeu.</p>
    <p><strong>Ce que tu n’y trouveras pas :</strong> un système pour gagner. Il n’y en a pas, et c’est le sujet.</p>
  </div>
</section>

<section class="pod-section" id="voix" aria-labelledby="voices-title">
  <div class="section-head"><h2 id="voices-title">Les voix du récit <span>(${used.length})</span></h2><span class="muted">RÉEL · COMPOSITE · FICTIF</span></div>
  <p class="muted lead-s">Chaque personnage est annoncé pour ce qu’il est : une personne qui a existé, un portrait composite construit sur des témoignages publiés, ou un personnage fictif qui représente un service réel.</p>
  <ul class="voice-grid">
${voices}
  </ul>
</section>

<section class="pod-section split" id="suivre" aria-labelledby="follow-title">
  <div>
    <span class="label">S’ABONNER</span>
    <h2 id="follow-title">Un flux, tous<br>tes lecteurs</h2>
  </div>
  <div class="prose">
    <p>Le flux RSS fonctionne dans n’importe quelle application de podcasts.</p>
    <div class="rss">
      <label for="rss-url" class="visually-hidden">Adresse du flux RSS</label>
      <input id="rss-url" type="text" readonly value="${url('/podcast/feed.xml')}">
      <button type="button" class="pod-btn" data-copy="#rss-url">Copier</button>
    </div>
    <p class="muted">${EPISODES.some(hasAudio) ? '' : 'Le flux se remplit automatiquement dès que le premier épisode enregistré est publié : les plateformes n’acceptent que des fichiers audio. '}Les liens Apple Podcasts, Spotify et autres seront ajoutés ici dès l’inscription du flux.</p>
  </div>
</section>

<section class="pod-section cta" aria-labelledby="play-title">
  <div>
    <span class="label">ET SI TU ESSAYAIS ?</span>
    <h2 id="play-title">Entre dans le casino.<br><em>Sans un euro.</em></h2>
    <p>Quinze mécaniques à découvrir, quatorze témoins à rencontrer, seul ou jusqu’à huit amis. Aucun argent réel, aucun compte.</p>
  </div>
  <a class="pod-btn primary big" href="/">Jouer à Rien ne va plus <span aria-hidden="true">↗</span></a>
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

export function renderEpisode(ep) {
  const i = EPISODES.indexOf(ep);
  const prev = EPISODES[i - 1];
  const next = EPISODES[i + 1];
  const p = episodePath(ep);
  const min = minutes(ep);

  const toc = ep.sections
    .map((s, k) => `<li><a href="#s${k + 1}">${esc(s.h)}</a></li>`)
    .join('\n        ');

  const body = ep.sections
    .map(
      (s, k) => `    <section class="script-sec" id="s${k + 1}" aria-labelledby="s${k + 1}-h">
      <h3 id="s${k + 1}-h" data-tts>${esc(s.h)}</h3>
${s.p.map((t) => `      <p data-tts>${esc(t)}</p>`).join('\n')}
    </section>`
    )
    .join('\n');

  const people = ep.witnesses
    .map((id) => {
      const w = witnessOf(id);
      const st = statusOf(id);
      const k = kindOfStatus(st);
      return `<li class="person" style="--c:${w.color}"><span class="voice-dot" aria-hidden="true">${esc(w.name.replace(/^(Un|Une|L’|L')\s?/i, '').charAt(0).toUpperCase())}</span><span><b>${esc(w.name)}</b><small>${esc(w.sub)}</small></span><span class="voice-kind k-${k}">${kindLabel[k]}</span></li>`;
    })
    .join('\n      ');

  const game = ep.mechanics
    .map((id) => {
      const r = mechanicOf(id);
      return `<li><b>${String(r.n).padStart(2, '0')} · ${esc(r.title)}</b><span>${esc(r.hint)}</span></li>`;
    })
    .join('\n      ');

  const sources = sourcesFor(ep)
    .map(
      (g) => `      <div class="src-group"><h4>${esc(g.title)}</h4><ul>
${g.refs.map((r) => `        <li>${r}</li>`).join('\n')}
      </ul></div>`
    )
    .join('\n');

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

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'PodcastEpisode',
    name: ep.title,
    description: ep.summary,
    url: url(p),
    datePublished: SHOW.published,
    inLanguage: SHOW.language,
    episodeNumber: ep.number,
    timeRequired: `PT${min}M`,
    partOfSeries: { '@type': 'PodcastSeries', name: SHOW.name, url: url('/podcast') },
    author: { '@type': 'Person', name: SHOW.host },
    ...(ep.audio ? { associatedMedia: { '@type': 'MediaObject', contentUrl: url('/' + ep.audio.file) } } : {})
  };

  const nav = `<nav class="ep-nav" aria-label="Épisodes voisins">
    ${prev ? `<a class="prev" href="${episodePath(prev)}"><small>← ${esc(episodeLabel(prev))}</small><span>${esc(prev.title)}</span></a>` : '<span></span>'}
    ${next ? `<a class="next" href="${episodePath(next)}"><small>${esc(episodeLabel(next))} →</small><span>${esc(next.title)}</span></a>` : `<a class="next" href="/podcast"><small>Fin de saison</small><span>Tous les épisodes</span></a>`}
  </nav>`;

  const inner = `<article class="ep">
  <div class="ep-top">
    <nav class="crumbs" aria-label="Fil d’Ariane"><a href="/podcast">Podcast</a> <span aria-hidden="true">/</span> <span>${esc(episodeLabel(ep))}</span></nav>
    <div class="eyebrow"><span class="live-dot" aria-hidden="true"></span> ${esc(episodeLabel(ep).toUpperCase())} · SAISON ${SHOW.season}</div>
    <h1>${esc(ep.title)}</h1>
    <p class="lead">${esc(ep.hook)}</p>
    <p class="meta"><span>≈ ${min} min</span><span>Texte du ${frDate(SHOW.published)}</span><span>${ep.audio ? 'Audio disponible' : 'Version audio à venir'}</span></p>
    <p class="ep-summary">${esc(ep.summary)}</p>
    <div class="chips">${themeChips(ep)}</div>
  </div>

  ${audio}

  <div class="ep-grid">
    <aside class="ep-aside" aria-label="Dans cet épisode">
      <h2 class="label">DANS CET ÉPISODE</h2>
      <ol class="toc">
        ${toc}
        <li><a href="#retenir">À retenir</a></li>
        <li><a href="#sources">Sources</a></li>
      </ol>
    </aside>

    <div class="script">
${body}

    <section class="retenir" id="retenir" aria-labelledby="retenir-h">
      <h3 id="retenir-h">À retenir</h3>
      <ul>
${ep.retenir.map((t) => `        <li>${esc(t)}</li>`).join('\n')}
      </ul>
    </section>

${ep.witnesses.length ? `    <section class="people" id="personnes" aria-labelledby="people-h">
      <h3 id="people-h">Les voix de cet épisode</h3>
      <ul>
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
      <a class="pod-btn" href="/">Entrer dans le casino <span aria-hidden="true">↗</span></a>
    </section>

    <section class="sources" id="sources" aria-labelledby="sources-h">
      <h3 id="sources-h">Sources et références</h3>
${sources}
    </section>
    </div>
  </div>

  ${nav}
</article>

${helpBlock()}`;

  return head({ title: ep.title, description: ep.summary, path: p, type: 'article', ld }) + '\n' + frame(inner, 'episodes');
}

// ---------------------------------------------------------------- RSS
const x = esc;
export function renderFeed() {
  const withAudio = EPISODES.filter(hasAudio);
  const image = coverPng() ? url('/assets/podcast/cover.png') : null;
  const items = withAudio
    .map((ep) => {
      const a = ep.audio;
      return `    <item>
      <title>${x(ep.title)}</title>
      <link>${url(episodePath(ep))}</link>
      <guid isPermaLink="true">${url(episodePath(ep))}</guid>
      <pubDate>${rfc822(SHOW.published)}</pubDate>
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
    <lastBuildDate>${rfc822(SHOW.published)}</lastBuildDate>
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
// Map of file path (relative to the repository) to its content.
export function buildAll() {
  const files = new Map();
  files.set('podcast/index.html', renderIndex());
  for (const ep of EPISODES) files.set(`podcast/${ep.slug}.html`, renderEpisode(ep));
  files.set('podcast/feed.xml', renderFeed());
  return files;
}
