# Raid art — the portraits, the backdrops, and one live bug

Enumerated from the live file with `node _artgaps.js`, not remembered.

| | state |
|---|---|
| Zone monsters | **57 painted, 0 on SVG** |
| **Raid foes** | **0 painted, 27 on SVG** |
| Zone backdrops | **12 of 12** |
| **Raid backdrops** | **0 of 5** |
| Rally / Ruin / Brace icons | **none — text-only buttons** |

**The Spire needs no new monsters.** Floors 1–40 draw 21 distinct creatures, all
recycled from the four fixed raids, and past floor 40 the bands repeat while the
curve carries the difficulty. Painting the 27 below covers the Spire completely.

---

## First: a bug, not an art job

```js
${(typeof ZONE_BG!=='undefined'&&ZONE_BG[state.zone])?`<img class="cvstage-bg" ...`}
```

The arena backdrop reads `state.zone`. During a raid that is still whatever zone
you last fought in, so **the Spire currently shows the Demon Sanctum** (or Rat
Warrens, or wherever you were). It is why the Frostfang mock and the live Spire
screenshot had a stone tunnel behind them.

It wants a raid branch whether or not the five backdrops ever get painted — even
falling back to no image is better than the wrong place. Say the word and I'll fix
it in a minute; it is one line.

---

## Batch 1 — the 27 raid foes (SwarmUI, `mongen`)

Same pipeline and the same validated recipe as the 57 zone portraits:
`gen.js` → `key.js` → `sheet.js` → `review.js`, subjects in `subjects.js`.

Everything from [[monster-art-generation]] still applies, and two rules matter
more here than they did for the zone set:

- **Z-Image-Turbo, not SDXL**, and do NOT raise its CFG. SDXL invents a forest
  behind every subject and no negative battery stops it.
- **Value-inverse backdrop, and this batch splits hard.** The Barrow and the
  Empyrean are *pale* — bone, wraithcloth, dawn-gold, radiant white — so they need
  the **near-black** backdrop or the border flood-fill walks into them and punches
  holes. The Emberforge and Abyssal sets are dark and take the **white** one.
- **Light every subject.** The arena band is a dark radial gradient with two dark
  drop-shadows stacked on top; a "deep shadow in the core" creature is invisible
  there. Palette stays dark-fantasy, VALUES stay up, rim light tracing the
  silhouette.

Full body, feet at the bottom — the band draws a lit ground ellipse to stand on.

### Ready to paste into `subjects.js`

````js
// ── The Sunken Barrow — pale, drowned, bone and wet cloth. NEAR-BLACK backdrop.
barrow_sentry:    'a drowned tomb guard in corroded bronze scale, standing at attention with a rusted spear, waterlogged grave-wrappings hanging off the limbs, empty helm with two cold points of light inside',
drowned_footman:  'a bloated dead footman in a waterlogged gambeson, kettle helm askew, short stabbing sword held low, black water still running out of the sleeves',
barrow_champion:  'a huge armoured revenant champion in dented ceremonial plate, greatsword point-down in both hands, a torn heraldic surcoat, cold blue light in the visor slit',
tomb_revenant:    'a lean skeletal revenant wrapped in grey grave-linen, one arm raised, jaw hanging open, dry bone showing through the wrappings',
wardens_herald:   'a tall gaunt herald in a drowned tabard holding a corroded horn, antlered helm, ribbons of wet cloth trailing from the arms',
barrow_warden:    'a towering barrow-king in barnacled black plate, an enormous two-handed maul over one shoulder, a broken crown fused to the helm, pale grave-light bleeding from every joint',

// ── The Emberforge Deep — dark iron and molten orange. WHITE backdrop.
forge_thrall:     'a shackled forge slave of blackened iron, hunched, one arm ending in a hammer head, glowing orange cracks across the chest',
cinder_golem:     'a squat golem built of fused slag and cooled lava, blocky limbs, deep orange glow in every seam, a dull ember where a face would be',
molten_sentinel:  'a tall armoured sentinel of black iron plates floating a hand apart, molten orange light pouring out between them, a heavy pauldron and a slab shield',
ashbound_brute:   'a heavy brute of caked ash and scorched hide, hunched shoulders, two enormous fists, embers falling off it as it moves',
ember_colossus:   'a huge forge-colossus of riveted black iron, chimney stacks on its back venting flame, a furnace door in the chest standing open on white heat',
ignar:            'a crowned fire tyrant of molten bronze and black iron, enormous, a smith hammer in one hand, a beard and mane of live flame, the forge-fire visible inside the ribcage',

// ── The Abyssal Throne — dark void purple. WHITE backdrop.
void_wretch:      'a thin flayed void creature on long spidery limbs, skin like torn night sky, too many joints, a lipless mouth of needle teeth',
rift_stalker:     'a lean four-legged stalker made of solid shadow with violet rifts opening across its flanks, low to the ground, mid-stride',
null_warden:      'a broad faceless warden in slabs of black void-stone, a violet singularity where the head should be, two heavy fists',
abyssal_maw:      'a hovering circular maw of ringed teeth, no body, violet light down the throat, small void tendrils trailing beneath it',
void_herald:      'a tall robed herald whose robes are a hole in reality, violet stars visible inside the hood, long thin hands held out',
riftbound_colossus:'an enormous colossus of shattered black basalt held together by violet energy, chunks of it floating out of place, slow and heavy',
xorvael:          'a crowned void sovereign on long limbs, a mantle of unmaking trailing behind, a violet singularity crown, one enormous eye in the chest',

// ── The Empyrean Throne — radiant gold and white. NEAR-BLACK backdrop.
dawnling:         'a small radiant winged figure of living gold light, a bright core with a hazy body around it, four small burning wings',
radiant_wisp:     'a fast darting wisp of white-gold fire trailing a comet tail, a bright hot core, no face',
seraph_warden:    'a tall six-winged seraph in white and gold plate, a blank golden faceplate with no features, a burning spear held upright',
astral_hound:     'a four-legged hound of white starlight and gold plate, constellations visible inside the body, a bright mane of light',
lightbringer_herald:'a golden herald in flowing radiant robes holding a lantern of trapped sunrise, wings of pure light folded behind',
empyrean_colossus:'an enormous golden statue-colossus, temple architecture built into its shoulders, cracks across it leaking white light',
fallen_choir:     'a single mass of many overlapping golden angelic faces and hands fused into one hovering column, wings sprouting at wrong angles, unsettling',
aureon:           'a colossal dawn-god on a throne of dead suns, crowned in a solar corona, one eye a burning sunrise and the other a dead violet void, cracked golden skin leaking light',
````

<details><summary>id order for <code>mkjobs.js</code></summary>

```
barrow_sentry drowned_footman barrow_champion tomb_revenant wardens_herald barrow_warden
forge_thrall cinder_golem molten_sentinel ashbound_brute ember_colossus ignar
void_wretch rift_stalker null_warden abyssal_maw void_herald riftbound_colossus xorvael
dawnling radiant_wisp seraph_warden astral_hound lightbringer_herald empyrean_colossus fallen_choir aureon
```
</details>

**Judge on the real background.** `sheet.js` rebuilds the actual band gradient,
ground ellipse and drop-shadow filter. A portrait that looks great on a white grid
and dies on the live band is not a usable asset — that is the whole lesson of the
first 57.

---

## Batch 2 — the 5 raid backdrops (`mkzonebg.js`)

Portrait **832x1216**, same contract as the twelve zones: this sits behind a bold
high-contrast creature and must lose that fight on purpose. Low contrast, haze,
depth, **no focal point**, and an **empty floor across the bottom third** where the
creature stands.

### Ready to paste into the `ZONES` map in `mkzonebg.js`

````js
sunken_barrow:   'a flooded underground tomb hall, black water knee-deep across a stone floor, drowned carved pillars, hanging rotted funeral banners, cold green-grey light from above',
emberforge:      'the inside of an enormous ruined forge, black iron gantries and dead chains overhead, a river of molten orange far below throwing up heat haze, soot-black walls',
abyssal_throne:  'a void where reality has thinned to nothing, broken slabs of black stone floating in violet emptiness, distant torn rifts, no horizon and no sky',
empyrean_throne: 'a vast ruined temple of white and gold above the clouds, broken colonnades, a blinding hazy sunrise behind everything, motes of gold light drifting',
sundered_spire:  'the inside of a fallen tower lying on its side, floors and stairs running at the wrong angle, rose-grey masonry sheared through, pale pink dust hanging in the air, cold light from a crack far above',
````

Keep the existing `STYLE` and `NEG` strings exactly as they are. The negatives are
what stop a creature or a bright hotspot appearing, and both would ruin the plate.

---

## Batch 3 — Rally, Ruin and Brace

These are **not** a generation job. They belong to the `ui_*` chrome SVG set from
the emoji purge — hand-drawn, inline, 64x64, gradient-rich, sized to 1em — and the
three ability buttons in the raid HUD are currently text-only.

Three icons, and each should say what the ability answers rather than what it is:

- **Rally** — a heart or chalice with an upward chevron through it. The answer to
  attrition.
- **Ruin** — a downward-splitting fault or a struck blade throwing sparks. The
  answer to a damage check.
- **Brace** — a shield taking an impact, braced at an angle rather than flat. The
  answer to a telegraph.

Say the word and I'll draw them and show you all three at 64, 32 and 20px before
anything ships.
