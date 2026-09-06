/* Find the end of a top-level object literal that starts at `open` (the index of its
 * `{`), skipping braces that live inside strings. Returns the index of the closing
 * brace, or -1.
 *
 * Both injectnodes.js and banner.js first looked for the next newline-plus-"};"
 * instead. That is true of SKILL_ART and NOT of NODE_ART, whose 160 entries are one
 * per line and whose last one closes right after its string on the same line — so the
 * search sailed past the whole literal and appended thirteen paintings to the end of
 * PASSIVE_TIPS, 16,000 lines further down. It parsed as a doubled comma and took the
 * file out. Cheap to do properly; expensive not to.
 */
'use strict';
const BACKSLASH = String.fromCharCode(92);

module.exports = function literalEnd(s, open) {
  let depth = 0, q = null;
  for (let i = open; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === BACKSLASH) { i++; continue; }   // escaped char, whatever it is
      if (c === q) q = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { q = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return i; }
  }
  return -1;
};
