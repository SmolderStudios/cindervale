# Item icon art

Painted replacements for the inline-SVG item icons, generated locally with
SwarmUI. Batch one is the skilling materials: logs, ores, bars, fish, herbs,
firemaking oddments, and gems rough and cut — 72 items, two style directions each.

## The one fact that drives every decision

`node measure.js` reports what an item icon actually renders at, in the live game:

| where | size |
|---|---|
| activity card output chip (`.chip`) | **12px** |
| satchel grid (`.inv-ic`) | **15px** |
| drop rows and tooltips (`.icon`) | **19px** |
| activity card (`.act-icon`) — the largest | **31px** |

At 15px there is no detail, only a silhouette, two or three values and a colour.
That is why the prompts name one object filling the frame and never a pile, why
tier families share a silhouette and differ by palette, and why `sheet.js` judges
everything on the real satchel tile at the real size. Art that reads on a white
contact sheet and dies in the grid is not a usable asset — the monster pass paid
for that lesson already.

## Pipeline

```bash
node measure.js                 # what size are we drawing for (re-run if the UI changes)
node survey.js                  # what items exist -> items.json
node gen.js --probe             # 6 items, both styles, before committing to a full run
node gen.js                     # everything in subjects.js (~9.5s an image)
node gen.js --family ores       # or one family
node gen.js --only iron_ore     # or a re-roll
node key.js                     # backdrop -> alpha, trim, square, 128px -> cut/
node verify.js                  # automated flags: hue, value, contrast, coverage
node sheet.js                   # review PNG at real sizes on the real tile
node picker.js                  # pick.html — click A/B, exports picks JSON
node pack.js --picks picks.json # -> pack.json, and prints the file-size cost
node inject.js                  # splice into cindervale.html (idempotent)
node inject.js --remove         # take it back out
```

**Jewelry (0.9.124.54).** The jewellery sheet's backdrop carried a soft ground shadow,
so key.js left a pale rim and a cream blob on every ring and pendant, and its enclosed
white-hole rule cut the white faces out of the diamonds. After key.js, run
`node defringe_jewel.js` (reads `cut_prejewelfix/`, the untouched cuts, and writes
`cutfix/`), copy `cutfix/` over `cut/`, then `node pack.js --picks _iconart/picks.json
--out pack54.json` and `node splice54.js _iconart/pack54.json`, which swaps ONLY those
ids into the live block and fails if any other entry changes. Do not re-inject the
whole block with inject.js: this machine's Chrome encodes every icon to different
bytes (gate54.js: 0 of 873 identical, +0.37 MB).

**Magic and Runecrafting (0.9.127.6): new ids are MERGED, and keyed by their keyline.**
87 icons and a banner off 14 sheets (`sheets/mg_*.png`, `sheets/rn_*.png`). Three
things about this batch are now the way every batch of new items goes in:

- **Cut with measured rows.** These sheets are not a uniform grid and the caption
  trim reads a thin tail as text: the wraps came out with their ties cut off. Each
  sheet's `cutall.js` entry carries `noeat: true` (which is `slice.js --noeat`: keep
  every band the crop holds) and a `crop` for each row that stops above the
  captions. `node _iconart/cutall.js mg_wraps` re-cuts one sheet.
- **Key with `keyline.js`, not `key.js`.** `key.js` cuts enclosed near-white as a
  hole, and here that is the glow in a rune, the middle of the Frost mark and every
  highlight on the white Spidersilk: 30 of the 87 came out holed. `keyline.js` uses
  the dark ink outline as the wall instead; its header says how, step by step.
  `keyline.json` lists the ids it owns (`key.js` skips them unless `--force`), the
  three plates whose ink-walled white really is a hole (`holes`), and any per-id
  setting. A new batch with bright or white art: add its ids there.
- **Merge with `mergeitems.js`, never `inject.js`.** `inject.js` rewrites the whole
  block from a full pack, and a full pack is different bytes on this machine (see
  Jewelry above). Pack ONLY the new ids and merge them:

```bash
# from the repo root: pack.js reads --picks from where you stand
node _iconart/cutall.js mg_runes                    # one PLAN entry a sheet -> raw/
node _iconart/keyline.js                            # every id in keyline.json -> cut/
node _iconart/pack.js --picks _iconart/picks_magic.json --out pack.magic.json
node _iconart/mergeitems.js --pack pack.magic.json --dry    # "live 873 icons, pack 71: 71 new, 0 replaced"
node _iconart/mergeitems.js --pack pack.magic.json
node _iconart/pack.js --picks _iconart/picks_rn_nodes.json --out pack_nodes.json --size 112
node _iconart/injectnodes.js --pack pack_nodes.json         # merges into NODE_ART
node _iconart/banner.js sheets/rn_banner.png runecrafting --band 0.28,0.59 --q 0.72
```

  `picks_magic.json` and `picks_rn_nodes.json` name just this batch. The 71 item ids
  were also appended to `picks.json` by hand, so a full pack still knows them.
  `mergeitems.js` reads the block by line, refuses to write unless every entry that
  was live reads back whole, and keeps the ids sorted. A pack id that already has an
  entry is replaced and named in the output, so one icon can be re-cut and swapped
  the same way; every entry the pack does not name stays byte for byte as it was.

## How the swap works

`iconHTML(id)` returns `ICONS[id]` verbatim at every render site, so replacing an
SVG string with an `<img>` string needs no change at any call site. `inject.js`
writes an `ART_ITEM` map between `==ITEM-ART-START==` / `==ITEM-ART-END==` markers
and assigns it over `ICONS`. **An id not in the pack keeps its SVG**, so a partial
pass still boots — the same mechanism the monster `ART_MON` and pet `ART_PET`
packs already use.

Re-running `inject.js` replaces the previous block rather than stacking, which is
what makes "regenerate one family, re-inject" safe to repeat.

## Traps, each one paid for

- **Never snapshot-diff `E:/SwarmUI/Output`.** `swarm.js` uses `donotsave: true`
  and gets the PNG inline. A concurrent batch in another session poisoned a
  52-image IRONGATE run through that shared folder; every log line said OK.
- **No body parts as scale references.** "A single fist sized chunk of ore" got
  drawn: copper ore came back as a clenched human fist, and iron ore picked up
  knuckles that read as a face at 15px. Say "rough broken lump".
- **Z-Image-Turbo at cfg 2.4.** SDXL will not isolate a subject — it invents a
  plinth, a forest, a sunset. Turbo's default cfg 1.5 ignores the style clause;
  cfg 4 gives black voids and coin-sized subjects.
- **Value-inverse backdrop.** Pale subjects get a near-black backdrop, dark ones
  white — `pale: true` in `subjects.js`. A pale subject on white loses its edges
  and the key-out flood fill walks into it. `key.js` re-detects from the corners
  rather than trusting the flag, because a prompt can be ignored and a corner
  cannot.
- **Key by flood fill from the border, never a global threshold.** A global cut
  also removes the white highlight on a silver bar and the black core of a coal
  lump.
- **Watch the file size.** `cindervale.html` is one self-contained document the
  wrapper re-downloads in full on every version change, behind a 6s hard abort
  that is not an idle timeout. `pack.js` prints the added weight and the Mbps it
  implies before anything is injected. Default is 96px WebP — 3x the largest
  on-screen size, which is plenty.

## Files

| | |
|---|---|
| `swarm.js` | SwarmUI client (copied from irongate; `donotsave`) |
| `recipe.js` | style clauses, negative prompt, backdrop rule, model/sampler |
| `subjects.js` | one bespoke description per item + the `pale` flag |
| `gen.js` | batch generator, writes `raw/` and `raw/_log.json` |
| `key.js` | backdrop removal, trim, square, downscale -> `cut/` |
| `keyline.js`, `keyline.json` | the same job by the ink outline, for art with glow or white in it |
| `cutall.js`, `slice.js` | every sheet's grid and crops, and the slicer they drive |
| `mergeitems.js` | add new ids to the live `ART_ITEM` block, the rest untouched |
| `injectnodes.js`, `banner.js` | merge tree plates into `NODE_ART`, a banner into `SKILL_ART` |
| `verify.js` | automated hue/value/contrast/coverage flags |
| `sheet.js` | review PNG on the real satchel tile at real sizes |
| `picker.js` | `pick.html`, the A/B chooser |
| `pack.js` | WebP encode + file-size report -> `pack.json` |
| `inject.js` | splice into / remove from `cindervale.html` |

`raw/`, `cut/`, `pack.json`, `pick.html` and the review PNGs are generated and
git-ignored.
