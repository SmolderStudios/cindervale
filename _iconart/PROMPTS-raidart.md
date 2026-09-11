# Raid art — the portraits, the backdrops, and one live bug

Enumerated from the live file with `node _artgaps.js`, not remembered.

| | state |
|---|---|
| Zone monsters | **57 painted, 0 on SVG** |
| **Raid foes** | **0 painted, 27 on SVG** |
| **Spire natives** | **0 painted, 9 on SVG** |
| Zone backdrops | **12 of 12** |
| **Raid backdrops** | **0 of 5** |
| Rally / Ruin / Brace icons | **none — text-only buttons** |

**Superseded in 0.9.124.26.** This used to say the Spire needed no new monsters,
because floors 1–40 already drew 21 recycled creatures. True about the count,
wrong about the problem: all 21 fought the same way. Nine natives landed in
0.9.124.26, the bands now open to every raid past floor 40, and the roster runs 32
distinct creatures over 80 floors. They are **Batch 1b** below.

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

## Batch 1b: the 9 Sundered Spire natives (SwarmUI, `mongen`)

Same pipeline, same recipe. Three things specific to this set:

- **NEAR-BLACK backdrop, all nine.** Every one of them is pale masonry. On the
  white plate the border flood-fill walks straight into them and punches holes,
  which is exactly what happened to the frost bear in probe 4.
- **Do NOT write "rose" or "pink" into the stone.** The Spire's accent
  (`#c96a9a`) arrives from the arena band's CSS lighting, and pushing it into the
  material is the "moss green haft" mistake that came back as an entirely green
  axe. Describe them as pale grey limestone, old plaster, weathered sandstone,
  dry mortar. The tower's colour is the light, not the rock.
- **These are architecture, not animals.** Across three passes of the SVG versions
  every one of them kept collapsing into a small humanoid robot. The fix each time
  was to name the building part it used to be and keep the silhouette lopsided:
  an arch, a column, a landing, a plumb line.

Seeds are **4101–4109**, clear of the 1101–2305 block the 57 zone monsters hold.
Give the 27 raid foes above the 3xxx block when they go in.

### Ready to paste into `subjects.js`

````js
  /* The Sundered Spire: pale masonry, all nine. NEAR-BLACK backdrop. */
  spr_rubble_shade: { seed: 4101, desc: 'a broken stone column caught in mid collapse and never allowed to finish, six or seven angular chunks of pale grey masonry hanging apart from one another with clear gaps of empty air between them, the whole stack leaning hard off its own axis, two small cold points of light buried deep in the largest chunk, no head and no limbs, hovering just clear of the ground with dust falling from it' },

  spr_floorwarden: { seed: 4102, desc: 'a squat load bearing archway grown into a warden, a wide low stone arch where its head and shoulders should be, one enormous slab of a forearm hanging almost to the floor and the other arm a short broken stump, pale limestone banded with dry mortar courses, a lit opening burning in the middle of its chest like a doorway with something behind it, planted wide and lopsided, feet set like footings' },

  spr_stairwraith: { seed: 4103, desc: 'a tall thin hooded figure in heavy grey stone robes with no face inside the hood, only two narrow slits of cold light, the front of the robe standing open onto a flight of pale stone stairs receding away into the body toward a vanishing point far behind it, the stairs lit from deep inside, the whole figure leaning off vertical as if the floor under it runs the wrong way, the hem trailing to the ground' },

  spr_mortarfiend: { seed: 4104, desc: 'a low wide sagging mass of wet grey mortar half set and still slumping, a thick crusted dried shell over the top and glossy wet mortar underneath, far broader than it is tall, two small sunken eyes of pale light, a wide jagged split across the front for a mouth, three stubby dripping feet planted on the ground, rivulets running off it' },

  spr_keystone_golem: { seed: 4105, desc: 'a massive hunched golem of pale dressed stone blocks, enormous slab shoulders with a small blunt head sunk down between them, arms far too long and hanging to the floor, a single wedge shaped keystone set into its chest burning with light from inside, hairline cracks radiating out from the keystone across the whole torso, standing heavy and still on thick legs' },

  spr_plumbhang: { seed: 4106, desc: 'a tapered stone weight the size of a body hanging dead straight from a fine chain that runs up out of the frame, smooth pale plaster narrowing to a heavy pointed plumb bob tip at the bottom, two small stubby useless arms, two cold slitted eyes set high on the taper, absolutely vertical and perfectly still, nothing touching the ground beneath it' },

  spr_ashen_architect: { seed: 4107, desc: 'a tall gaunt figure in long ash grey robes and a deep hood, one arm ending not in a hand but in a huge pair of open brass dividers raised high, the other arm holding a straightedge low at its side, a faint burning line scribed on the air where the dividers have already passed, pale dust falling off the robe, standing straight and narrow with the hem on the ground' },

  spr_hollow_choirstone: { seed: 4108, desc: 'a single fluted stone pillar taller than a man and widening toward its base, four human faces of different sizes fused into the shaft at different heights and angles, every one of them with its mouth stretched wide open and light pouring out of the throat, no eyes on any of them, thin ripples of sound visible coming off the stone, standing square on the ground' },

  spr_the_landing: { seed: 4109, desc: 'an entire stone floor slab of a stairwell landing torn free and rearing up off the ground at a steep tilt, pale flagstones and mortar joints still visible across its face, a long ragged split running the width of it lined with broken flagstone teeth and lit from inside like a mouth, two huge stone hands gripping the near edge and planted on the ground holding it upright, vast, no head and no body, colossal scale' },
````

<details><summary>id order for <code>mkjobs.js</code></summary>

```
spr_rubble_shade spr_floorwarden spr_stairwraith spr_mortarfiend spr_keystone_golem
spr_plumbhang spr_ashen_architect spr_hollow_choirstone spr_the_landing
```
</details>

**`mkjobs.js` asserts subjects.js covers exactly the live ids**, and the Spire's
foes are built on demand rather than sitting in a `stages` array, so these nine will
not be in whatever id list it walks. Feed them explicitly, or widen its source to
include `SPIRE_NATIVES`. Every per-floor copy (a Rubble Shade on floor 9, 23, 41...)
aliases back to the same key, so nine images cover every floor they appear on.

**Where the images go:** the ICONS key is the native's `art` field, which is the id
without the `spr_` prefix (`rubble_shade`, `the_landing`...). Paint against the
`spr_` ids above so they sort with the rest of the Spire; inject against the bare
ones.

Two that will fight you, judging by how the same nine went in SVG:

- **The Landing** is the only one with no head, no body and no feet, so `COMP`'s
  "feet at the bottom of the frame, entire creature visible" pulls against it. The
  stone hands planted on the ground are doing that job in the description on
  purpose. If it still comes back as a creature standing on a slab, drop "full
  body" from COMP for this one entry only.
- **Rubble Shade** wants to become a golem. If the chunks fuse into one body, push
  the gaps harder ("wide gaps of empty black air between every piece") before
  touching anything else.

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
