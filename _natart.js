/* The nine Sundered Spire natives — icon source of truth.
 *
 *   node _natart.js            write _natart.html (preview on the real arena band)
 *   node _natart.js --inject   splice them into cindervale.html's ICONS block
 *
 * Both read this one map, so what Jordan approves is byte-for-byte what ships.
 *
 * Recipe, learned the hard way on the 57 zone portraits and again on the first
 * pass of these: the body must be DARK almost all the way through, with the light
 * arriving as a thin explicit rim along the top and lead edges — not as a gradient
 * that lifts the whole mass to mid-tone. A body-wide mid-mauve reads pale and
 * flat, and a boxy symmetrical silhouette reads as a robot no matter what colour
 * it is. Asymmetry, one dominant mass, light only on the edges that face up.
 *
 * Palette: rose-grey stone, plum shadow, near-black edge, cold rose light from
 * inside the break — the Spire's own, so a native never reads as one of the four
 * raids it climbs past.
 */
const NAT = {

/* Loose masonry that never finished falling. NOT a body: a broken column caught
   mid-collapse, its pieces visibly separated by gaps, drifting off their own axis.
   The first pass gave it a head and limbs and it read as a small robot — what
   makes rubble read as rubble is the empty space between the chunks. */
rubble_shade: '<svg class="ev-icon" viewBox="0 0 64 64"><defs><linearGradient id="rbs_s" x1="0.25" y1="0" x2="0.7" y2="1"><stop offset="0" stop-color="#caa2b2"/><stop offset="0.16" stop-color="#6d4557"/><stop offset="0.5" stop-color="#2b1723"/><stop offset="1" stop-color="#120a10"/></linearGradient><linearGradient id="rbs_d" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0" stop-color="#8b5f70"/><stop offset="0.26" stop-color="#3a2130"/><stop offset="1" stop-color="#0f070f"/></linearGradient><radialGradient id="rbs_e" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffd8ea"/><stop offset="0.35" stop-color="#e06fa8" stop-opacity="0.7"/><stop offset="1" stop-color="#c96a9a" stop-opacity="0"/></radialGradient></defs><ellipse cx="31" cy="59" rx="12" ry="2.5" fill="#000" opacity="0.38"/><ellipse cx="32" cy="31" rx="15" ry="19" fill="url(#rbs_e)" opacity="0.5"/><path d="M25 50 L37 47 L41 55 L30 58 L23 55 Z" fill="url(#rbs_d)" stroke="#0e0710" stroke-width="0.9" stroke-linejoin="round"/><path d="M19 34 L33 30 L38 41 L25 45 L17 41 Z" fill="url(#rbs_s)" stroke="#0e0710" stroke-width="1" stroke-linejoin="round"/><path d="M40 30 L52 33 L50 44 L40 43 L37 35 Z" fill="url(#rbs_d)" stroke="#0e0710" stroke-width="0.9" stroke-linejoin="round"/><path d="M8 25 L20 20 L23 29 L12 34 Z" fill="url(#rbs_d)" stroke="#0e0710" stroke-width="0.9" stroke-linejoin="round"/><path d="M23 12 L38 8 L45 19 L38 27 L24 26 L19 18 Z" fill="url(#rbs_s)" stroke="#0e0710" stroke-width="1.1" stroke-linejoin="round"/><path d="M44 12 L55 17 L51 26 L42 22 Z" fill="url(#rbs_d)" stroke="#0e0710" stroke-width="0.9" stroke-linejoin="round"/><path d="M27 2 L38 1 L41 7 L28 9 Z" fill="url(#rbs_d)" stroke="#0e0710" stroke-width="0.8" stroke-linejoin="round"/><path d="M5 45 L11 43 L12 48 L6 50 Z M56 46 L61 44 L62 49 L57 50 Z M14 8 L19 6 L20 11 L15 13 Z" fill="#33202c" stroke="#0e0710" stroke-width="0.6" stroke-linejoin="round"/><circle cx="27" cy="19" r="4.6" fill="url(#rbs_e)"/><circle cx="37" cy="18" r="4" fill="url(#rbs_e)"/><circle cx="27" cy="19" r="1.5" fill="#fff2f8"/><circle cx="37" cy="18" r="1.2" fill="#fff2f8"/><path d="M23 12 L38 8 L45 19" fill="none" stroke="#f4c6da" stroke-width="1.4" stroke-linejoin="round" opacity="0.9"/><path d="M19 34 L33 30 L38 41" fill="none" stroke="#e3a9c1" stroke-width="1.1" stroke-linejoin="round" opacity="0.7"/><path d="M8 25 L20 20 M44 12 L55 17 M40 30 L52 33 M27 2 L38 1" fill="none" stroke="#d99ab4" stroke-width="0.95" opacity="0.6"/></svg>',

/* It held this landing up: a wide low arch with shoulders, one enormous slab arm
   dragging, the other stump-short. Deliberately lopsided so it never reads boxy. */
floorwarden: '<svg class="ev-icon" viewBox="0 0 64 64"><defs><linearGradient id="fwd_b" x1="0.2" y1="0" x2="0.65" y2="1"><stop offset="0" stop-color="#c69cab"/><stop offset="0.14" stop-color="#6b4354"/><stop offset="0.48" stop-color="#2a1722"/><stop offset="1" stop-color="#110910"/></linearGradient><linearGradient id="fwd_a" x1="0.1" y1="0" x2="0.9" y2="1"><stop offset="0" stop-color="#8f6272"/><stop offset="0.28" stop-color="#331d29"/><stop offset="1" stop-color="#0f070e"/></linearGradient><radialGradient id="fwd_g" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffcbe2"/><stop offset="0.4" stop-color="#d861a0" stop-opacity="0.65"/><stop offset="1" stop-color="#b8548a" stop-opacity="0"/></radialGradient></defs><ellipse cx="32" cy="59" rx="21" ry="3.2" fill="#000" opacity="0.46"/><path d="M18 42 L31 42 L30 58 L16 58 Z" fill="url(#fwd_a)" stroke="#0d0710" stroke-width="0.9" stroke-linejoin="round"/><path d="M36 42 L48 43 L49 58 L36 58 Z" fill="url(#fwd_a)" stroke="#0d0710" stroke-width="0.9" stroke-linejoin="round"/><path d="M45 22 L61 26 L60 47 L47 51 L43 34 Z" fill="url(#fwd_a)" stroke="#0d0710" stroke-width="1" stroke-linejoin="round"/><path d="M48 47 L61 44 L60 52 L49 54 Z" fill="#1a0e16" stroke="#0d0710" stroke-width="0.8" stroke-linejoin="round"/><path d="M18 24 L10 27 L9 39 L19 40 Z" fill="url(#fwd_a)" stroke="#0d0710" stroke-width="0.9" stroke-linejoin="round"/><path d="M17 22 Q32 8 47 22 L48 45 L16 45 Z" fill="url(#fwd_b)" stroke="#0d0710" stroke-width="1.2" stroke-linejoin="round"/><path d="M23 27 Q32 18 41 27 L41 45 L23 45 Z" fill="#150c14" opacity="0.8"/><ellipse cx="32" cy="33" rx="11" ry="10" fill="url(#fwd_g)"/><path d="M27 27 Q32 22 37 27 L36 38 L28 38 Z" fill="#ffd6e8" opacity="0.55"/><path d="M25 46 L27 52 M32 46 L32 53 M39 46 L37 52" stroke="#0d0710" stroke-width="1.1" opacity="0.7"/><path d="M17 22 Q32 8 47 22" fill="none" stroke="#f4c6da" stroke-width="1.5" opacity="0.9"/><path d="M45 22 L61 26" fill="none" stroke="#dfa5bc" stroke-width="1.1" opacity="0.7"/><path d="M18 24 L10 27" fill="none" stroke="#dfa5bc" stroke-width="1" opacity="0.6"/></svg>',

/* Something that walked up a staircase which was already sideways. The shroud is
   open down the front and a flight of steps runs INTO it, shrinking away to a
   vanishing point that is somewhere the creature is not. Drawn as receding
   parallelograms, not as a flat zigzag — the first pass drew the treads in profile
   and it read as a letter E. */
stairwraith: '<svg class="ev-icon" viewBox="0 0 64 64"><defs><linearGradient id="stw_c" x1="0.15" y1="0" x2="0.7" y2="1"><stop offset="0" stop-color="#b592a9"/><stop offset="0.14" stop-color="#573a51"/><stop offset="0.48" stop-color="#241726"/><stop offset="1" stop-color="#0e090f"/></linearGradient><radialGradient id="stw_v" cx="0.62" cy="0.72" r="0.75"><stop offset="0" stop-color="#ffd6ef"/><stop offset="0.3" stop-color="#b4468a"/><stop offset="1" stop-color="#180517"/></radialGradient><radialGradient id="stw_e" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffdbef"/><stop offset="0.38" stop-color="#d668ab" stop-opacity="0.65"/><stop offset="1" stop-color="#b45c96" stop-opacity="0"/></radialGradient></defs><ellipse cx="33" cy="59" rx="11" ry="2.4" fill="#000" opacity="0.34"/><path d="M19 13 Q14 32 20 47 Q17 55 22 59 Q32 62 43 57 Q47 52 45 46 Q50 30 45 13 Z" fill="url(#stw_c)" stroke="#0c0710" stroke-width="1.1" stroke-linejoin="round"/><path d="M22 57 L26 50 L29 59 M34 60 L36 51 L41 56" fill="none" stroke="#0c0710" stroke-width="1.1" opacity="0.85"/><path d="M23 19 L42 19 Q45 34 41 48 Q32 52 23 48 Q20 33 23 19 Z" fill="url(#stw_v)" stroke="#0c0710" stroke-width="0.8"/><path d="M24 44 L41 44 L39 48 L26 48 Z" fill="#ffd9ef" opacity="0.92"/><path d="M26 37 L40 37 L39 41 L27 41 Z" fill="#f7a9d3" opacity="0.8"/><path d="M28 31 L39 31 L38 34 L29 34 Z" fill="#d97ab0" opacity="0.7"/><path d="M30 26 L38 26 L37.5 28.5 L30.5 28.5 Z" fill="#a95186" opacity="0.62"/><path d="M31.5 22 L37 22 L36.7 24 L31.8 24 Z" fill="#7c3563" opacity="0.55"/><path d="M17 23 Q8 29 7 38 L12 40 Q14 31 20 27 Z" fill="url(#stw_c)" stroke="#0c0710" stroke-width="0.9" stroke-linejoin="round"/><path d="M47 21 Q57 26 58 35 L53 37 Q51 28 45 25 Z" fill="url(#stw_c)" stroke="#0c0710" stroke-width="0.9" stroke-linejoin="round"/><path d="M21 9 Q32 0 44 9 L45 17 Q32 22 19 17 Z" fill="url(#stw_c)" stroke="#0c0710" stroke-width="1.2" stroke-linejoin="round"/><ellipse cx="32" cy="13" rx="9" ry="5" fill="url(#stw_e)"/><path d="M26 11 L30 14 L26 16 Z M38 11 L34 14 L38 16 Z" fill="#ffe8f6"/><path d="M21 9 Q32 0 44 9" fill="none" stroke="#f4c8dd" stroke-width="1.5" opacity="0.9"/><path d="M19 13 Q14 32 20 47" fill="none" stroke="#e0aac7" stroke-width="1.1" opacity="0.6"/><path d="M17 23 Q8 29 7 38 M47 21 Q57 26 58 35" fill="none" stroke="#d69fbe" stroke-width="0.9" opacity="0.55"/></svg>',

/* It is trying to set: a low sagging mass with a crusted back and a wide split.
   Reads as thick before it reads as anything else, which is the point. */
mortarfiend: '<svg class="ev-icon" viewBox="0 0 64 64"><defs><linearGradient id="mtf_b" x1="0.25" y1="0" x2="0.7" y2="1"><stop offset="0" stop-color="#c199a6"/><stop offset="0.13" stop-color="#6a4351"/><stop offset="0.46" stop-color="#2a1722"/><stop offset="1" stop-color="#120a11"/></linearGradient><linearGradient id="mtf_l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8b5f71"/><stop offset="1" stop-color="#150c13"/></linearGradient><radialGradient id="mtf_e" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffd0e6"/><stop offset="0.42" stop-color="#dd66a4" stop-opacity="0.6"/><stop offset="1" stop-color="#c05f92" stop-opacity="0"/></radialGradient></defs><ellipse cx="32" cy="58" rx="24" ry="3.4" fill="#000" opacity="0.46"/><path d="M6 41 Q7 26 20 21 Q29 14 40 20 Q56 23 59 40 Q60 53 47 56 L16 56 Q4 53 6 41 Z" fill="url(#mtf_b)" stroke="#0e0810" stroke-width="1.2" stroke-linejoin="round"/><path d="M12 33 Q17 25 25 23 Q31 18 38 22 Q48 25 52 33 Q44 38 32 38 Q19 38 12 33 Z" fill="#1c1019" opacity="0.55"/><path d="M13 54 Q11 60 16 60 Q20 60 18 54 Z M29 55 Q28 61 33 61 Q37 61 35 55 Z M45 54 Q43 60 48 60 Q52 60 50 54 Z" fill="url(#mtf_l)" stroke="#0e0810" stroke-width="0.8" stroke-linejoin="round"/><ellipse cx="24" cy="33" rx="6" ry="4.5" fill="url(#mtf_e)"/><ellipse cx="41" cy="34" rx="5" ry="4" fill="url(#mtf_e)"/><path d="M21 32 Q24 29 27 32 Q24 35 21 32 Z M38 33 Q41 30 44 33 Q41 36 38 33 Z" fill="#160b13"/><circle cx="24" cy="32.6" r="1.5" fill="#fff0f7"/><circle cx="41" cy="33.6" r="1.3" fill="#fff0f7"/><path d="M16 44 Q22 41 26 46 Q31 41 36 46 Q41 41 47 45" fill="none" stroke="#0e0810" stroke-width="2.4" stroke-linejoin="round"/><path d="M16 44 Q22 41 26 46 Q31 41 36 46 Q41 41 47 45" fill="none" stroke="#eab9d1" stroke-width="1" stroke-linejoin="round" opacity="0.75"/><path d="M9 28 L3 24 L9 22 Z M56 30 L62 26 L56 24 Z" fill="url(#mtf_l)" stroke="#0e0810" stroke-width="0.7" stroke-linejoin="round"/><path d="M6 41 Q7 26 20 21 Q29 14 40 20 Q56 23 59 40" fill="none" stroke="#f0bed4" stroke-width="1.4" opacity="0.85"/></svg>',

/* Pull the keystone and everything above it comes down. Massive hunched shoulders,
   the head sunk between them, the wedge burning in the chest. */
keystone_golem: '<svg class="ev-icon" viewBox="0 0 64 64"><defs><linearGradient id="ksg_b" x1="0.2" y1="0" x2="0.7" y2="1"><stop offset="0" stop-color="#bd94a3"/><stop offset="0.13" stop-color="#653e4d"/><stop offset="0.46" stop-color="#26141f"/><stop offset="1" stop-color="#100810"/></linearGradient><linearGradient id="ksg_a" x1="0.1" y1="0" x2="0.9" y2="1"><stop offset="0" stop-color="#8a5d6d"/><stop offset="0.3" stop-color="#301b27"/><stop offset="1" stop-color="#0e070d"/></linearGradient><linearGradient id="ksg_k" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="#fff0f8"/><stop offset="0.35" stop-color="#f087bd"/><stop offset="1" stop-color="#8e2f60"/></linearGradient><radialGradient id="ksg_g" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ff9dcb"/><stop offset="0.45" stop-color="#e0509a" stop-opacity="0.5"/><stop offset="1" stop-color="#c9407f" stop-opacity="0"/></radialGradient></defs><ellipse cx="32" cy="59" rx="21" ry="3.2" fill="#000" opacity="0.48"/><path d="M17 45 L29 45 L28 58 L14 58 Z" fill="url(#ksg_a)" stroke="#0c0610" stroke-width="0.9" stroke-linejoin="round"/><path d="M36 45 L48 45 L50 58 L36 58 Z" fill="url(#ksg_a)" stroke="#0c0610" stroke-width="0.9" stroke-linejoin="round"/><path d="M13 20 L3 27 L6 45 L17 44 L18 28 Z" fill="url(#ksg_a)" stroke="#0c0610" stroke-width="1" stroke-linejoin="round"/><path d="M51 20 L61 27 L58 45 L47 44 L46 28 Z" fill="url(#ksg_a)" stroke="#0c0610" stroke-width="1" stroke-linejoin="round"/><path d="M14 22 Q22 11 32 12 Q42 11 50 22 L48 48 L16 48 Z" fill="url(#ksg_b)" stroke="#0c0610" stroke-width="1.3" stroke-linejoin="round"/><path d="M25 8 L39 8 L41 16 L23 16 Z" fill="url(#ksg_a)" stroke="#0c0610" stroke-width="1" stroke-linejoin="round"/><path d="M27 11 L31 11 L31 13 L27 13 Z M34 11 L38 11 L38 13 L34 13 Z" fill="#ffbfdd"/><ellipse cx="32" cy="33" rx="16" ry="14" fill="url(#ksg_g)"/><path d="M24 23 L40 23 L36 42 L28 42 Z" fill="url(#ksg_k)" stroke="#0c0610" stroke-width="1.1" stroke-linejoin="round"/><path d="M26 23 L38 23 L37 28 L27 28 Z" fill="#fff6fb" opacity="0.55"/><path d="M24 24 L15 17 M40 24 L49 17 M28 42 L21 49 M36 42 L44 49 M32 42 L32 48" stroke="#ff9dcb" stroke-width="1.2" opacity="0.6" fill="none"/><path d="M14 22 Q22 11 32 12 Q42 11 50 22" fill="none" stroke="#f6c9dc" stroke-width="1.6" opacity="0.9"/><path d="M13 20 L3 27 M51 20 L61 27" fill="none" stroke="#dda7bc" stroke-width="1.1" opacity="0.65"/></svg>',

/* It hangs dead true. A tapered form on a line with a heavy point, arms short and
   useless, nothing touching the floor. */
plumbhang: '<svg class="ev-icon" viewBox="0 0 64 64"><defs><linearGradient id="plh_b" x1="0.25" y1="0" x2="0.75" y2="1"><stop offset="0" stop-color="#c49aab"/><stop offset="0.14" stop-color="#67404f"/><stop offset="0.5" stop-color="#28151f"/><stop offset="1" stop-color="#110910"/></linearGradient><linearGradient id="plh_w" x1="0" y1="0" x2="0.7" y2="1"><stop offset="0" stop-color="#f0d0de"/><stop offset="0.3" stop-color="#a8768f"/><stop offset="1" stop-color="#1e1019"/></linearGradient><radialGradient id="plh_e" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffd8ec"/><stop offset="0.42" stop-color="#dd6bab" stop-opacity="0.6"/><stop offset="1" stop-color="#bd5c94" stop-opacity="0"/></radialGradient></defs><ellipse cx="32" cy="61" rx="6" ry="1.8" fill="#000" opacity="0.28"/><path d="M32 1 L32 11" stroke="#7d5c6c" stroke-width="1.6"/><path d="M32 1 L32 11" stroke="#d0a6b9" stroke-width="0.7"/><circle cx="32" cy="4" r="2.4" fill="none" stroke="#c49aae" stroke-width="1.2"/><circle cx="32" cy="8.5" r="2.4" fill="none" stroke="#7d5c6c" stroke-width="1.2"/><path d="M32 11 Q19 16 17 30 Q16 41 24 45 L40 45 Q48 41 47 30 Q45 16 32 11 Z" fill="url(#plh_b)" stroke="#0e0810" stroke-width="1.2" stroke-linejoin="round"/><path d="M32 16 Q23 20 22 30 Q21 38 26 41 L38 41 Q43 38 42 30 Q41 20 32 16 Z" fill="#180d15" opacity="0.6"/><ellipse cx="26" cy="28" rx="5.5" ry="4.5" fill="url(#plh_e)"/><ellipse cx="39" cy="28" rx="5" ry="4" fill="url(#plh_e)"/><path d="M22 27 L29 29 L22 31 Z M43 27 L36 29 L43 31 Z" fill="#ffe8f6"/><path d="M18 27 L5 33 L7 38 L19 33 Z" fill="url(#plh_b)" stroke="#0e0810" stroke-width="0.9" stroke-linejoin="round"/><path d="M46 27 L59 33 L57 38 L45 33 Z" fill="url(#plh_b)" stroke="#0e0810" stroke-width="0.9" stroke-linejoin="round"/><path d="M24 45 L40 45 L36 50 L28 50 Z" fill="url(#plh_b)" stroke="#0e0810" stroke-width="0.9" stroke-linejoin="round"/><path d="M28 50 L36 50 L32 62 Z" fill="url(#plh_w)" stroke="#0e0810" stroke-width="1" stroke-linejoin="round"/><path d="M29 51 L33 51 L31 56 Z" fill="#f8dcea" opacity="0.65"/><path d="M32 11 Q19 16 17 30" fill="none" stroke="#f2c4d8" stroke-width="1.4" opacity="0.85"/><path d="M32 11 Q45 16 47 30" fill="none" stroke="#dba7c0" stroke-width="1.1" opacity="0.6"/><path d="M18 27 L5 33 M46 27 L59 33" fill="none" stroke="#d9a3bd" stroke-width="0.9" opacity="0.55"/></svg>',

/* Still drawing the floor you are standing on: tall, robed, one arm ended in a
   pair of dividers and a scribed arc still burning where it passed. */
ashen_architect: '<svg class="ev-icon" viewBox="0 0 64 64"><defs><linearGradient id="aar_r" x1="0.2" y1="0" x2="0.7" y2="1"><stop offset="0" stop-color="#b08b9c"/><stop offset="0.14" stop-color="#563749"/><stop offset="0.48" stop-color="#221420"/><stop offset="1" stop-color="#0f090f"/></linearGradient><linearGradient id="aar_m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8c0d0"/><stop offset="0.45" stop-color="#9d6980"/><stop offset="1" stop-color="#3a2130"/></linearGradient><radialGradient id="aar_e" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffe0f0"/><stop offset="0.42" stop-color="#dc69a8" stop-opacity="0.6"/><stop offset="1" stop-color="#c25f96" stop-opacity="0"/></radialGradient></defs><ellipse cx="31" cy="59" rx="16" ry="3" fill="#000" opacity="0.44"/><path d="M25 21 L40 21 L48 55 Q31 61 15 55 Z" fill="url(#aar_r)" stroke="#0d070d" stroke-width="1.2" stroke-linejoin="round"/><path d="M27 25 L38 25 L43 51 Q31 55 21 51 Z" fill="#170d15" opacity="0.65"/><path d="M27 32 L31 36 L35 32 M26 42 L31 47 L36 42" fill="none" stroke="#e0acc6" stroke-width="1.1" opacity="0.5"/><path d="M22 8 Q32 0 42 8 L45 22 Q31 28 19 22 Z" fill="url(#aar_r)" stroke="#0d070d" stroke-width="1.2" stroke-linejoin="round"/><ellipse cx="32" cy="17" rx="10" ry="6" fill="url(#aar_e)"/><path d="M26 14 L31 18 L26 20 Z M38 14 L34 18 L38 20 Z" fill="#ffeaf7"/><path d="M43 24 L54 14" stroke="#0d070d" stroke-width="3.4" stroke-linecap="round"/><path d="M43 24 L54 14" stroke="url(#aar_m)" stroke-width="2.2" stroke-linecap="round"/><path d="M52 12 L61 20 L58 24 L49 16 Z" fill="url(#aar_m)" stroke="#0d070d" stroke-width="0.9" stroke-linejoin="round"/><path d="M57 19 L63 26" stroke="#ffbfdd" stroke-width="1.5" stroke-linecap="round"/><path d="M58 24 L60 30" stroke="#0d070d" stroke-width="1.6" stroke-linecap="round"/><path d="M20 26 L7 36 L10 41 L23 32 Z" fill="url(#aar_r)" stroke="#0d070d" stroke-width="1" stroke-linejoin="round"/><path d="M8 40 Q19 51 33 53" fill="none" stroke="#ff9ecb" stroke-width="1.3" opacity="0.6" stroke-dasharray="3.5 3.5"/><path d="M22 8 Q32 0 42 8" fill="none" stroke="#f5c9dd" stroke-width="1.5" opacity="0.9"/><path d="M25 21 L40 21" fill="none" stroke="#dfa9c2" stroke-width="1.1" opacity="0.6"/><path d="M20 26 L7 36" fill="none" stroke="#d8a1bb" stroke-width="0.9" opacity="0.55"/></svg>',

/* A pillar of fused singing faces. Four open mouths up one column, the lowest the
   widest, and the sound visibly coming off it. */
hollow_choirstone: '<svg class="ev-icon" viewBox="0 0 64 64"><defs><linearGradient id="hcs_b" x1="0.2" y1="0" x2="0.7" y2="1"><stop offset="0" stop-color="#c396a6"/><stop offset="0.13" stop-color="#67404f"/><stop offset="0.46" stop-color="#28151f"/><stop offset="1" stop-color="#110910"/></linearGradient><radialGradient id="hcs_m" cx="0.5" cy="0.35" r="0.65"><stop offset="0" stop-color="#ffcfe6"/><stop offset="0.4" stop-color="#c2477f"/><stop offset="1" stop-color="#2e0a1e"/></radialGradient><radialGradient id="hcs_g" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ff9ecb" stop-opacity="0.55"/><stop offset="1" stop-color="#c9407f" stop-opacity="0"/></radialGradient></defs><ellipse cx="32" cy="59" rx="19" ry="3.2" fill="#000" opacity="0.47"/><path d="M25 3 L40 4 L45 19 L41 33 L47 50 L50 58 L15 58 L18 50 L23 33 L20 18 Z" fill="url(#hcs_b)" stroke="#0e0810" stroke-width="1.2" stroke-linejoin="round"/><ellipse cx="32" cy="34" rx="19" ry="21" fill="url(#hcs_g)"/><path d="M26 8 Q32 5 38 8 Q38 15 32 17 Q26 15 26 8 Z" fill="url(#hcs_m)" stroke="#0e0810" stroke-width="0.9"/><path d="M28 10 Q32 8 36 10 Q35 14 32 15 Q29 14 28 10 Z" fill="#210715"/><path d="M21 21 Q28 17 33 21 Q32 30 26 31 Q21 29 21 21 Z" fill="url(#hcs_m)" stroke="#0e0810" stroke-width="0.9"/><path d="M24 23 Q27 21 30 23 Q29 28 27 28 Q24 28 24 23 Z" fill="#210715"/><path d="M36 23 Q43 20 45 25 Q44 33 39 34 Q34 32 36 23 Z" fill="url(#hcs_m)" stroke="#0e0810" stroke-width="0.9"/><path d="M38 26 Q41 24 43 26 Q42 31 40 31 Q38 31 38 26 Z" fill="#210715"/><path d="M24 38 Q32 33 40 38 Q39 49 32 51 Q25 49 24 38 Z" fill="url(#hcs_m)" stroke="#0e0810" stroke-width="1"/><path d="M27 41 Q32 37 37 41 Q36 47 32 48 Q28 47 27 41 Z" fill="#210715"/><path d="M16 44 Q11 39 8 44 M48 44 Q53 39 56 44 M13 31 Q7 27 4 32 M51 31 Q57 27 60 32 M15 17 Q10 14 8 18 M49 17 Q54 14 56 18" fill="none" stroke="#ff9ecb" stroke-width="1.2" opacity="0.5"/><path d="M25 3 L40 4 L45 19" fill="none" stroke="#f3c5d9" stroke-width="1.4" opacity="0.88"/><path d="M20 18 L25 3" fill="none" stroke="#e0aac1" stroke-width="1" opacity="0.6"/></svg>',

/* Not a creature. The floor itself: a tilted slab with a maw split across it and
   two stone hands pulling it up off its own bearings. */
the_landing: '<svg class="ev-icon" viewBox="0 0 64 64"><defs><linearGradient id="tld_f" x1="0.1" y1="0" x2="0.55" y2="1"><stop offset="0" stop-color="#cba0b0"/><stop offset="0.12" stop-color="#6b4354"/><stop offset="0.5" stop-color="#281620"/><stop offset="1" stop-color="#100810"/></linearGradient><linearGradient id="tld_u" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2230"/><stop offset="1" stop-color="#0c0509"/></linearGradient><linearGradient id="tld_h" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0" stop-color="#9a6b7d"/><stop offset="0.3" stop-color="#341d29"/><stop offset="1" stop-color="#0d060c"/></linearGradient><radialGradient id="tld_m" cx="0.5" cy="0.25" r="0.75"><stop offset="0" stop-color="#ffc2e0"/><stop offset="0.35" stop-color="#c2477f"/><stop offset="1" stop-color="#210617"/></radialGradient></defs><ellipse cx="32" cy="59" rx="27" ry="3.4" fill="#000" opacity="0.44"/><path d="M2 25 L57 12 L62 39 L8 53 Z" fill="url(#tld_f)" stroke="#0b060c" stroke-width="1.3" stroke-linejoin="round"/><path d="M8 53 L62 39 L61 46 L9 58 Z" fill="url(#tld_u)" stroke="#0b060c" stroke-width="1" stroke-linejoin="round"/><path d="M13 23 L17 48 M27 20 L30 45 M42 16 L45 42" stroke="#1c0f18" stroke-width="1.2" opacity="0.7"/><path d="M10 33 L58 21" stroke="#1c0f18" stroke-width="1.2" opacity="0.6"/><path d="M11 31 Q23 24 33 27 Q46 30 56 25 Q48 41 33 42 Q18 42 11 31 Z" fill="url(#tld_m)" stroke="#0b060c" stroke-width="1.2" stroke-linejoin="round"/><path d="M14 30 L18 36 L23 29 L27 36 L32 29 L36 36 L41 29 L45 35 L50 28 L54 29" fill="none" stroke="#ffe6f4" stroke-width="1.6" stroke-linejoin="round"/><path d="M17 39 L21 34 L26 40 L30 34 L35 40 L39 34 L44 39" fill="none" stroke="#ffcbe5" stroke-width="1.4" stroke-linejoin="round" opacity="0.85"/><path d="M5 43 L2 55 L8 56 L12 45 Z" fill="url(#tld_h)" stroke="#0b060c" stroke-width="1" stroke-linejoin="round"/><path d="M2 55 L4 60 M5 54 L6 59 M8 53 L9 58 M11 51 L11 56" stroke="#0b060c" stroke-width="1"/><path d="M54 37 L59 47 L53 51 L48 41 Z" fill="url(#tld_h)" stroke="#0b060c" stroke-width="1" stroke-linejoin="round"/><path d="M56 48 L58 54 M53 50 L54 56 M50 48 L50 54" stroke="#0b060c" stroke-width="1"/><path d="M2 25 L57 12" fill="none" stroke="#f4c5da" stroke-width="1.6" opacity="0.9"/><path d="M57 12 L62 39" fill="none" stroke="#dda6bd" stroke-width="1.1" opacity="0.6"/><path d="M5 43 L12 45 M54 37 L48 41" fill="none" stroke="#d9a2ba" stroke-width="0.9" opacity="0.55"/></svg>',

};

const NAMES = {
  rubble_shade:'Rubble Shade', floorwarden:'Floorwarden', stairwraith:'Stairwraith',
  mortarfiend:'Mortarfiend', keystone_golem:'Keystone Golem', plumbhang:'Plumbhang',
  ashen_architect:'Ashen Architect', hollow_choirstone:'Hollow Choirstone',
  the_landing:'The Landing',
};
const NOTES = {
  rubble_shade:'F6+ · fast and light — half the health, swings twice as often',
  floorwarden:'F10+ · slow, armoured, telegraphs a Floor Drop',
  stairwraith:'F14+ · Vertigo — you lose 18% accuracy while it lives',
  mortarfiend:'F18+ · very high guard, and a damage check on a timer',
  keystone_golem:'F22+ · huge health, and it hits 60% harder below half',
  plumbhang:'F25+ · heals 3% of its health every 2.5s',
  ashen_architect:'F28+ · Redrawn (−18% Defence) plus a quicklime burn',
  hollow_choirstone:'F32+ · heals AND enrages — the worst ordinary floor there is',
  the_landing:'F30+ landing boss · two telegraphs, gives way below 40%',
};

if (process.argv.includes('--inject')) {
  const fs=require('fs');
  const P='cindervale.html';
  let h=fs.readFileSync(P,'utf8');
  const anchor="  null_warden: '<svg";
  if(h.indexOf('\n  rubble_shade:')>=0){ console.log('already injected'); process.exit(0); }
  const i=h.indexOf(anchor);
  if(i<0){ console.error('anchor not found'); process.exit(1); }
  let block='  /* -- The Sundered Spire\'s natives (0.9.124.26) ----------------------------\n'
    +'     Rose-grey stone, plum shadow, near-black edge, a cold rose light from inside\n'
    +'     the break. Dark body with an explicit lit rim along the top edges: the arena\n'
    +'     band is a dark radial with two dark drop-shadows stacked on it and swallows\n'
    +'     anything that is mid-tone all the way through. */\n';
  for(const k of Object.keys(NAT)) block+='  '+k+": '"+NAT[k].replace(/'/g,"\\'")+"',\n";
  h=h.slice(0,i)+block+h.slice(i);
  fs.writeFileSync(P,h,'utf8');
  console.log('injected '+Object.keys(NAT).length+' icons');
  process.exit(0);
}

/* ── preview ────────────────────────────────────────────────────────────────
   Judged on the real arena band, not a white grid. The gradient, the ground
   ellipse and the stacked drop-shadows are lifted off .cvarena-art / .cvstage so
   a portrait that dies on the live stage dies here too. */
const fs=require('fs');
const cells=Object.keys(NAT).map(k=>`
  <figure class="cell">
    <div class="band"><div class="art">${NAT[k]}</div></div>
    <figcaption><b>${NAMES[k]}</b><span>${NOTES[k]}</span></figcaption>
  </figure>`).join('');
const smalls=Object.keys(NAT).map(k=>`
  <div class="sm"><span class="s64">${NAT[k]}</span><span class="s32">${NAT[k]}</span><span class="s20">${NAT[k]}</span><i>${NAMES[k]}</i></div>`).join('');
fs.writeFileSync('_natart.html',`<!doctype html><meta charset="utf-8"><title>Spire natives</title>
<style>
 body{margin:0;padding:20px 24px;background:#0f0a0d;color:#e8d4bd;
   font:14px/1.5 'Crimson Pro',Georgia,serif}
 h1{font-size:21px;margin:0 0 3px;color:#f0c9dd;font-weight:600}
 p.sub{margin:0 0 16px;color:#9c8676;font-size:12.5px}
 .grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}
 .cell{margin:0}
 .band{position:relative;height:172px;border-radius:9px;overflow:hidden;
   border:1px solid #38242e;
   background:radial-gradient(ellipse 78% 62% at 50% 62%, #2b1c26 0%, #170f15 58%, #0c0810 100%)}
 .band:after{content:'';position:absolute;left:50%;bottom:15px;width:96px;height:15px;
   transform:translateX(-50%);border-radius:50%;
   background:radial-gradient(ellipse at 50% 50%, rgba(201,106,154,.26), rgba(0,0,0,0) 70%)}
 .art{position:absolute;left:50%;bottom:22%;transform:translateX(-50%);
   width:126px;height:126px;
   filter:drop-shadow(0 4px 6px rgba(0,0,0,.75)) drop-shadow(0 11px 16px rgba(0,0,0,.55))}
 .art svg{width:100%;height:100%;display:block}
 figcaption{padding:6px 2px 0;display:flex;flex-direction:column;gap:1px}
 figcaption b{color:#f2cfe0;font-size:14px;font-weight:600}
 figcaption span{color:#8f7787;font-size:11px;line-height:1.35;display:block}
 h2{font-size:14px;margin:20px 0 10px;color:#c99cad;font-weight:600;
   border-top:1px solid #2e2028;padding-top:13px}
 .row{display:flex;flex-wrap:wrap;gap:10px}
 .sm{display:flex;align-items:center;gap:8px;background:#181017;border:1px solid #2e2028;
   border-radius:8px;padding:6px 10px}
 .sm i{color:#9a8090;font-size:11.5px;font-style:normal}
 .s64 svg{width:56px;height:56px} .s32 svg{width:30px;height:30px} .s20 svg{width:20px;height:20px}
</style>
<h1>The Sundered Spire — nine natives</h1>
<p class="sub">On the real arena band: same radial gradient, same ground ellipse, same two stacked drop-shadows the live stage uses.</p>
<div class="grid">${cells}</div>
<h2>At 56 / 30 / 20px — the Monster Log rail and the gauntlet ribbon</h2>
<div class="row">${smalls}</div>`,'utf8');
console.log('wrote _natart.html');
