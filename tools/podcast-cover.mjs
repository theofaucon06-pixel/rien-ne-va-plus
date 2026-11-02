// Draws the podcast cover (assets/podcast/cover.svg): a European roulette wheel, ball at rest, show title in the middle.
// Run: node tools/podcast-cover.mjs   (the PNG used by podcast directories is exported from this SVG, see README)
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const C = 500;
const R1 = 438, R2 = 318; // outer and inner radius of the pocket ring
const pt = (r, a) => [C + r * Math.cos(a), C + r * Math.sin(a)].map((v) => v.toFixed(2));
const n = ORDER.length;
let slices = '';
let nums = '';
ORDER.forEach((num, i) => {
  const a0 = (i / n) * Math.PI * 2 - Math.PI / 2 - Math.PI / n;
  const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2 - Math.PI / n;
  const fill = num === 0 ? '#3f7a4e' : RED.has(num) ? '#a94d43' : '#122f26';
  const [x0, y0] = pt(R1, a0), [x1, y1] = pt(R1, a1), [x2, y2] = pt(R2, a1), [x3, y3] = pt(R2, a0);
  slices += `<path d="M${x0} ${y0}A${R1} ${R1} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${R2} ${R2} 0 0 0 ${x3} ${y3}Z" fill="${fill}"/>`;
  const am = (a0 + a1) / 2;
  const [tx, ty] = pt((R1 + R2) / 2 + 2, am);
  const rot = ((am * 180) / Math.PI + 90).toFixed(2);
  nums += `<text x="${tx}" y="${ty}" transform="rotate(${rot} ${tx} ${ty})">${num}</text>`;
});
// the ball rests in pocket 17 (index 8)
const ballA = (8.5 / n) * Math.PI * 2 - Math.PI / 2 - Math.PI / n;
const [bx, by] = pt((R1 + R2) / 2 - 38, ballA);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000" role="img" aria-labelledby="t">
<title id="t">La Maison Gagne — le podcast de Rien ne va plus</title>
<defs>
<radialGradient id="bg" cx="50%" cy="42%" r="75%"><stop offset="0" stop-color="#17402f"/><stop offset="1" stop-color="#07180f"/></radialGradient>
<radialGradient id="ball" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#cdbf9d"/></radialGradient>
</defs>
<rect width="1000" height="1000" fill="url(#bg)"/>
<circle cx="${C}" cy="${C}" r="478" fill="none" stroke="#c6a14f" stroke-width="3"/>
<circle cx="${C}" cy="${C}" r="458" fill="#0b241b" stroke="#9d8351" stroke-width="2"/>
${slices}
<g fill="#eee4cc" font-family="'Bodoni 72',Didot,Georgia,serif" font-size="21" text-anchor="middle" dominant-baseline="middle" opacity=".9">${nums}</g>
<circle cx="${C}" cy="${C}" r="${R1}" fill="none" stroke="#c6a14f" stroke-width="3"/>
<circle cx="${C}" cy="${C}" r="${R2}" fill="#0c291f" stroke="#c6a14f" stroke-width="3"/>
<circle cx="${C}" cy="${C}" r="${R2 - 22}" fill="none" stroke="#c6a14f" stroke-opacity=".35"/>
<circle cx="${bx}" cy="${by}" r="15" fill="url(#ball)"/>
<g text-anchor="middle" font-family="'Bodoni 72',Didot,Georgia,serif" fill="#f3eddf">
<text x="${C}" y="${C - 118}" font-size="44" fill="#d1b078">♦</text>
<text x="${C}" y="${C - 28}" font-size="108" letter-spacing="-2">La Maison</text>
<text x="${C}" y="${C + 82}" font-size="120" font-style="italic" fill="#d1b078" letter-spacing="-2">gagne.</text>
<text x="${C}" y="${C + 150}" font-family="Inter,-apple-system,system-ui,sans-serif" font-size="19" letter-spacing="5" fill="#bfcbbf">LE PODCAST DE RIEN NE VA PLUS</text>
</g>
</svg>
`;
mkdirSync(path.join(root, 'assets', 'podcast'), { recursive: true });
writeFileSync(path.join(root, 'assets', 'podcast', 'cover.svg'), svg);
console.log('assets/podcast/cover.svg écrit');
