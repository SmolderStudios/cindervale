# Stormcrest Aerie, the bird hunting ground

Ticket #110 and Jordan, 2026-09-13: "add bird monsters somewhere or a new zone with
gryphons or birds like eagles, phoenix etc maybe better feathers".

The zone is **built and switched off** (`AERIE_LIVE` beside `ZONES` in
cindervale.html). Every monster ships with a painted portrait, so it waits on these
sheets. Preview it any time with `?cvdev=1&aerie=1`, and `node _aerietest.js` proves
the data, drops and balance with it switched on.

| Id | What | Level | Notes |
|---|---|---|---|
| `crag_hawk` | Crag Hawk | 26 | fills the gap between Thornwood (22) and Frostfang (35) |
| `storm_eagle` | Storm Eagle | 45 | sits beside the Snow Leopard and Tundra Elk |
| `gryphon` | Gryphon | 60 | fills the gap between Frostfang (55) and the Steppe (65) |
| `phoenix` | Phoenix | 90 | the top of the hunting grounds, above the Scorch Rhino (88) |
| `pet_gryphling` | Gryphling | pet | 5% on a rare kill, like every zone pet |
| `storm_plume` / `gryphon_plume` / `phoenix_plume` | plumes | items | Fletching splits them into 12 / 24 / 50 feathers |
| `aerie` | zone backdrop | plate | `ZONE_BG.aerie` |

Five creature cells, three item cells, one plate.

---

## Sheet 1: Stormcrest Aerie creatures (5, 3 across then 2)

Paste **the creature block** from `PROMPTS-monsters.md` first if it is a new chat.

````
SHEET: Stormcrest Aerie. 5 cells, three across the top row and two on the bottom
row. Great birds of a windswept cliff above the clouds. Each is a different
silhouette: perched and hunched, wings half spread, a four legged beast with wings,
a bird made of fire, and a small round chick. Wings must stay inside the cell.

CELLS:
  1. Crag Hawk   - a big rough hawk perched and hunched forward, mottled brown and
                   cream feathers ruffled by wind, a hooked yellow beak, fierce
                   yellow eyes, heavy talons gripping, wings folded tight.
  2. Storm Eagle - a huge grey and white eagle with its wings half raised to strike,
                   storm grey back, white head with a ragged crest standing up like
                   wind torn feathers, hooked gold beak open, a faint crackle of pale
                   blue static along the leading edge of each wing.
  3. Gryphon     - a gryphon standing on all fours, the head, chest and front talons
                   of a golden eagle, the back half and tail of a tawny lion, big
                   feathered wings folded along its sides, one front talon raised,
                   proud and heavy.
  4. Phoenix     - a phoenix rearing up with its wings spread wide and upward, its
                   feathers made of living flame from deep crimson at the body to
                   bright gold at the tips, long trailing tail plumes of fire, a small
                   hard bright face, embers breaking off the wings.
  5. Gryphling   - a baby gryphon, tiny and round, oversized head and big eyes, fluffy
                   golden down, stubby wings too small to fly, little lion paws and a
                   short tufted tail, sitting and looking up. Cute, not fierce.
````

Save as `sheets/mon_aerie.png` with `mon_aerie.txt` holding
`crag_hawk storm_eagle gryphon phoenix pet_gryphling`, one per line. Cut, key and
merge the way the zone sheets were done (see `cindervale-item-art-sheets` notes:
creature sheets need an explicit crop band per row):

```bash
node _iconart/cutall.js mon_aerie
cp _iconart/raw/crag_hawk.png _iconart/raw/storm_eagle.png _iconart/raw/gryphon.png _iconart/raw/phoenix.png _iconart/raw_mon/
CVRAW=raw_mon CVCUT=cut_mon node _iconart/key.js --size 256
node _iconart/injectmon.js --dry
node _iconart/injectmon.js
```

The Gryphling goes to `ART_PET`, not `ART_MON`, at 128px like the other pets.

---

## Sheet 2: plumes (3, 3 across)

Paste **the style block** from `PROMPTS.md` first if it is a new chat.

````
SHEET: Plumes. 3 cells, 3 across and 1 down. Each cell is one single large feather
lying on its side, drawn alone on nothing, the way the Feather on the fletching
sheet was drawn. Three tiers of the same shape, each clearly grander than the last.

CELLS:
  1. Storm Plume   - one long grey flight feather, pale grey fading to a darker
                     storm grey at the tip, a few white bars, a thin line of pale
                     blue light running along its spine.
  2. Gryphon Plume - one broad stiff feather, rich gold at the quill fading to deep
                     bronze brown at the tip, glossy, heavier and wider than the
                     storm plume.
  3. Phoenix Plume - one long curling feather made of flame, crimson at the quill,
                     orange through the middle, bright gold at the tip, with small
                     embers drifting off the edges and a soft warm glow around it.
````

Save as `sheets/aerie_plumes.png` with `aerie_plumes.txt` holding
`storm_plume gryphon_plume phoenix_plume`, then the item pipeline: cut, key, add the
three ids to `_iconart/picks.json` **by hand**, `pack.js --picks _iconart/picks.json`,
gate, `inject.js`. Never run `picks.js`.

---

## Plate: the Aerie backdrop

````
Paint a single background plate for a dark-fantasy RPG combat arena, in TALL
portrait format (2:3, 1024x1536). A creature will be drawn on top of it in the
lower middle, so this picture has to LOSE that fight on purpose.

THE PLACE: a high cliff ledge above the clouds where great birds nest. Sheer grey
crags rise on both sides, streaked white where birds roost. Huge untidy nests of
branches and bones are wedged into the rock high up. A sea of cloud fills the
distance below the ledge, and a grey storm sky hangs over everything, with a
thin cold light breaking through one gap.

PALETTE: weathered stone grey, bone white, dull straw brown for the nests, and a
cold grey blue sky (#9ab4c8 at its brightest, only in the gap in the cloud). No
green, nothing warm, nothing vivid.

RULES:
- Low contrast, soft haze, lots of depth. No focal point anywhere.
- The MIDDLE third holds the crags and the nests. Some views of this picture show
  only that band, so it has to say "cliff nests above the clouds" on its own.
- The bottom third is a flat dark rock ledge. Nothing interesting there, and it is
  the darkest part of the picture.
- Darker overall than a normal painting: it sits behind lit creatures on a dark
  screen.
- No creatures, no birds in flight, no people, no text, no frame, no border, no
  watermark.
- Painted in the same hand as the creature art. Not a photo, not a 3D render.
````

```bash
node _iconart/injectmon.js --bg icons-inbox/aerie.png aerie
```

---

## Switching it on

1. Inject the portraits, pet, plumes and backdrop above.
2. In cindervale.html set `const AERIE_LIVE = true`. The `?aerie=1` check can go.
3. `_spiretest.js` counts 16 Spire places; the Aerie makes 17. `_audit_tests.js`
   checks every zone monster has its own portrait and every item its painted icon.
4. Run the whole pipeline plus `node _aerietest.js`, and add `_aerietest.js` to it.
5. Watch the file size: four 256px portraits, a pet and a plate are roughly 150 KB.
