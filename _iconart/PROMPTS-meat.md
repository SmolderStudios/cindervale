# Monster meat — nine cuts  ·  DONE (0.9.122.33)

Nine items added in 0.9.122.33 for ticket #62 ("food made out of tusks (bones) and
skins don't sound like they would be good"). The sheet came back the same day, so
they never shipped on the palette-swapped SVG the first cut of this file describes —
that generator and its palette table are gone, and `SVG_OK` is empty again.

Sliced with:

```bash
node _iconart/slice.js sheets/meat.png sheets/meat.txt --grid 3x3
```

No crop and no inset: the sheet came back with no frame and no captions, which is the
easiest kind to cut and worth asking for.

The nine, in reading order, and what the colour has to do:

| id | name | the creature | the read |
|---|---|---|---|
| `boar_meat`   | Boar Meat   | thicket boar        | pale pink pork |
| `goblin_meat` | Goblin Meat | cave goblin         | olive, sickly |
| `wolf_meat`   | Wolf Meat   | dire wolf           | bright blood red |
| `ogre_meat`   | Ogre Meat   | ogre                | tan, yellow-fatted |
| `elk_meat`    | Elk Meat    | tundra elk          | deep burgundy venison |
| `troll_meat`  | Troll Meat  | cave troll          | grey-green |
| `rhino_meat`  | Rhino Meat  | scorch rhino        | grey-mauve, plated |
| `drake_meat`  | Drake Meat  | crag drake          | orange, hot |
| `demon_meat`  | Demon Meat  | sanctum demon       | crimson, smouldering |

The colours are the whole job. Five of the first nine I drew were the same reddish
brown and were indistinguishable in the satchel at twenty pixels, which is the only
size that matters. **Shrink the sheet to thumbnails and check you can name all nine
before accepting it.**

````
SHEET: Nine cuts of raw meat for a dark-fantasy RPG. 3 cells across, 3 down.

Hand-painted with a dark ink outline holding the silhouette and cel-like shading in
three or four value steps. NOT flat vector, NOT a photograph, NOT a 3D render.

Every cell is the same subject drawn the same way: a RAW cut on the bone, seen from
the side, the bone jutting up and to the right, the meat hanging broad and heavy at
the bottom. Same angle, same light, same size in frame, every cell — these sit in a
row in an inventory and any one that is drawn bigger or lit differently reads as a
mistake.

Each object drawn LARGE, filling about 90% of its cell, no empty margin. No plate,
no board, no background, no garnish, no smoke.

What changes between cells is the COLOUR OF THE MEAT and nothing else. Push them
apart — at thumbnail size these must be nine different things, not one thing in nine
shades of brown:

  1. Boar Meat    — pale pink, the colour of raw pork, cream fat
  2. Goblin Meat  — olive drab, greenish and unappetising
  3. Wolf Meat    — bright blood red, lean, almost no fat
  4. Ogre Meat    — tan and yellow, heavily marbled with thick yellow fat
  5. Elk Meat     — deep burgundy, nearly purple, dense venison
  6. Troll Meat   — grey-green, faintly luminous, wrong-looking
  7. Rhino Meat   — grey-mauve, coarse and plated at the edge
  8. Drake Meat   — hot orange-red, a faint ember glow deep in the cut
  9. Demon Meat   — dark crimson going to black, thin smoke at the cut face

Flat pure white background behind the whole sheet, edge to edge.
````

<details><summary>id order for <code>sheets/meat.txt</code></summary>

```
boar_meat
goblin_meat
wolf_meat
ogre_meat
elk_meat
troll_meat
rhino_meat
drake_meat
demon_meat
```
</details>

## After they land

```bash
node _iconart/slice.js sheets/meat.png sheets/meat.txt --grid 3x3
node _iconart/key.js --only "boar_meat,goblin_meat,wolf_meat,ogre_meat,elk_meat,troll_meat,rhino_meat,drake_meat,demon_meat"
# add the nine ids to picks.json, then:
node _iconart/pack.js --picks _iconart/picks.json && node _iconart/inject.js
```

Then take all nine out of `SVG_OK` in `_audit_tests.js`, and delete `MEAT_PAL` and
`_meatSVG` from `cindervale.html` — the art block assigns over `ICONS` last, so the
generated SVGs would be dead weight sitting in the file rather than a fallback.
