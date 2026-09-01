/* Ten slayer perk icons, spliced into the ICONS const.
 *
 *     node _iconart/perkicons.js
 *
 * House rules (CLAUDE.md): custom inline SVG, never emoji, 64x64 viewBox,
 * class="ev-icon" so it sizes to 1em off the parent, gradient-rich, dark-fantasy
 * palette. Gradient ids are prefixed slp_ so they cannot collide with the ~200
 * other defs in the file — two <defs> sharing an id silently makes one of them win
 * everywhere it is referenced.
 *
 * Drawn for the shop card, which shows them around 28px. Same brief as the item
 * art: one bold silhouette, few shapes, strong value separation. Detail below
 * roughly 4 units of the 64 viewBox is invisible and only costs bytes.
 *
 * Idempotent — re-running replaces the block rather than stacking it.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const GAME = path.join(__dirname, '..', 'cindervale.html');
const OPEN = '  /* ==SLAYER-PERK-ICONS-START== */';
const CLOSE = '  /* ==SLAYER-PERK-ICONS-END== */';

/* Shared palette so the ten read as one set: brass, blood, bone, ember. */
const G = (id, a, b, c) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="0.4" y2="1">` +
  `<stop offset="0" stop-color="${a}"/><stop offset="0.55" stop-color="${b}"/>` +
  `<stop offset="1" stop-color="${c}"/></linearGradient>`;
const BRASS = ['#f2d79a', '#c79b4e', '#7a5a22'];
const BLOOD = ['#e8624a', '#a82a1e', '#5a1410'];
const BONE  = ['#f4ecd8', '#cbbc99', '#8a7a58'];
const EMBER = ['#ffc46a', '#e0762f', '#8a3a10'];
const STEEL = ['#eef1f6', '#9aa0ac', '#4a4e58'];

const svg = (defs, body) =>
  `<svg class="ev-icon" viewBox="0 0 64 64"><defs>${defs}</defs>` +
  `<g stroke="#241608" stroke-width="1.1" stroke-linejoin="round">${body}</g></svg>`;

const ICONS = {
  /* Bloodscholar — an open tome with a blood drop on the page. */
  slp_scholar: svg(G('slp_a', ...BONE) + G('slp_a2', ...BLOOD),
    `<path d="M32 18 Q20 12 8 16 L8 48 Q20 44 32 50 Z" fill="url(#slp_a)"/>` +
    `<path d="M32 18 Q44 12 56 16 L56 48 Q44 44 32 50 Z" fill="url(#slp_a)"/>` +
    `<path d="M32 18 L32 50" stroke="#8a7a58"/>` +
    `<path d="M38 26 q5 7 5 10 a5 5 0 0 1-10 0 q0-3 5-10 Z" fill="url(#slp_a2)"/>`),

  /* Warpath — a war banner on a spear. */
  slp_warpath: svg(G('slp_b', ...BLOOD) + G('slp_b2', ...BRASS),
    `<path d="M20 8 L24 8 L24 58 L20 58 Z" fill="url(#slp_b2)"/>` +
    `<path d="M24 12 L52 18 L44 28 L52 38 L24 32 Z" fill="url(#slp_b)"/>`),

  /* Skinner — a curved skinning knife. */
  slp_skinner: svg(G('slp_c', ...STEEL) + G('slp_c2', ...BRASS),
    `<path d="M10 40 Q26 8 54 12 Q44 34 18 46 Z" fill="url(#slp_c)"/>` +
    `<path d="M10 40 L20 50 L12 56 L4 46 Z" fill="url(#slp_c2)"/>`),

  /* Bloodfrenzy — a fanged maw. */
  slp_frenzy: svg(G('slp_d', ...BLOOD) + G('slp_d2', ...BONE),
    `<path d="M8 20 Q32 6 56 20 Q32 58 8 20 Z" fill="url(#slp_d)"/>` +
    `<path d="M16 22 L22 34 L27 22 Z M29 23 L34 37 L39 23 Z M41 22 L46 33 L50 21 Z" fill="url(#slp_d2)"/>`),

  /* Quartermaster — a stamped wax seal on a coin. */
  slp_quarter: svg(G('slp_e', ...BRASS) + G('slp_e2', ...BLOOD),
    `<circle cx="32" cy="34" r="22" fill="url(#slp_e)"/>` +
    `<circle cx="32" cy="34" r="13" fill="url(#slp_e2)"/>` +
    `<path d="M32 24 L35 32 L43 32 L37 37 L39 45 L32 40 L25 45 L27 37 L21 32 L29 32 Z" fill="#f2d79a" stroke="none"/>`),

  /* Bloody Tithe — a coin stack with a drop. */
  slp_tithe: svg(G('slp_f', ...BRASS) + G('slp_f2', ...BLOOD),
    `<ellipse cx="30" cy="48" rx="20" ry="7" fill="url(#slp_f)"/>` +
    `<ellipse cx="30" cy="40" rx="20" ry="7" fill="url(#slp_f)"/>` +
    `<ellipse cx="30" cy="32" rx="20" ry="7" fill="url(#slp_f)"/>` +
    `<path d="M46 8 q7 10 7 14 a7 7 0 0 1-14 0 q0-4 7-14 Z" fill="url(#slp_f2)"/>`),

  /* Bloodhound — a hound's head in profile. */
  slp_hound: svg(G('slp_g', ...EMBER) + G('slp_g2', ...BONE),
    `<path d="M14 22 Q10 8 20 12 L26 20 Q40 16 52 28 Q58 34 52 44 L26 50 Q12 46 14 34 Z" fill="url(#slp_g)"/>` +
    `<path d="M52 28 Q60 32 58 40 L48 42 Z" fill="url(#slp_g2)"/>` +
    `<circle cx="30" cy="30" r="3" fill="#241608" stroke="none"/>`),

  /* Shortlist — a scroll with a struck-through line. */
  slp_shortlist: svg(G('slp_h', ...BONE) + G('slp_h2', ...BLOOD),
    `<rect x="14" y="10" width="36" height="44" rx="3" fill="url(#slp_h)"/>` +
    `<path d="M22 22 H42 M22 32 H42 M22 42 H34" stroke="#8a7a58" stroke-width="2.6" stroke-linecap="round"/>` +
    `<path d="M16 46 L48 16" stroke="url(#slp_h2)" stroke-width="5" stroke-linecap="round"/>`),

  /* Slayer's Fortune — a die showing its face. */
  slp_fortune: svg(G('slp_i', ...BRASS),
    `<path d="M32 6 L56 19 L56 45 L32 58 L8 45 L8 19 Z" fill="url(#slp_i)"/>` +
    `<path d="M32 6 L56 19 L32 32 L8 19 Z" fill="#f2d79a" opacity="0.55" stroke="none"/>` +
    `<circle cx="32" cy="19" r="3.4" fill="#5a1410" stroke="none"/>` +
    `<circle cx="20" cy="40" r="3" fill="#5a1410" stroke="none"/>` +
    `<circle cx="44" cy="40" r="3" fill="#5a1410" stroke="none"/>`),

  /* Relentless — a heart with a pulse line through it. */
  slp_relentless: svg(G('slp_j', ...BLOOD),
    `<path d="M32 54 Q6 36 6 22 A13 13 0 0 1 32 18 A13 13 0 0 1 58 22 Q58 36 32 54 Z" fill="url(#slp_j)"/>` +
    `<path d="M10 30 H22 L27 20 L34 40 L39 30 H54" stroke="#ffd9a0" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
};

let s = fs.readFileSync(GAME, 'utf8');
const a = s.indexOf(OPEN), b = s.indexOf(CLOSE);
if (a >= 0 && b > a) s = s.slice(0, a) + s.slice(b + CLOSE.length + 1);

const block = OPEN + '\n' +
  Object.keys(ICONS).map(k => '  ' + k + ': ' + JSON.stringify(ICONS[k]) + ',').join('\n') +
  '\n' + CLOSE + '\n';

/* Land it just inside the ICONS object, after its opening brace. */
const anchor = 'const ICONS = {';
if (!s.includes(anchor)) throw new Error('ICONS anchor not found');
s = s.replace(anchor, anchor + '\n' + block);
fs.writeFileSync(GAME, s);
const bytes = Object.values(ICONS).reduce((n, v) => n + v.length, 0);
console.log('injected ' + Object.keys(ICONS).length + ' perk icons, ' + (bytes / 1024).toFixed(1) + ' KB');
