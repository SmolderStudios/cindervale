# The 57 zone monsters, redone as ChatGPT sheets

The arena portraits in the game today came off local SwarmUI, and they read weird.
These are the same 57 creatures rewritten as ChatGPT contact sheets, the pipeline
that produced every item icon and the nine Spire natives.

**One sheet per zone.** Five foes to a dungeon sheet, four to a hunting ground, and
the five share one image on purpose: a zone's creatures have to be tellable apart
from *each other* at a glance, and drawing them together is what guarantees that.
The last cell of each dungeon sheet is the boss.

Paste the **creature block** once in a new chat (it is the same one Sheet D used in
`PROMPTS-spire.md`), then feed one sheet at a time.

## The creature block (paste once)

````
You are drawing creature portraits for the combat arena of a dark-fantasy RPG. I
will give you one SHEET at a time. Draw every creature on that sheet in ONE image,
as a labelled grid, on a single flat pure-white background, with the creature's
short label in small plain text under each cell.

STYLE, identical on every cell
Hand-painted stylised fantasy game art. Bold clean shapes with a thick dark ink
outline holding the whole silhouette closed. Flat cel-like shading, three or four
value steps, NOT smooth gradients. Chunky, slightly exaggerated proportions. Strong
rim light along the top edges, deep shadow underneath. Rich colour.

It must read as painted game art, NOT a photograph, NOT photorealistic, NOT a 3D
render. Use LESS detail than feels right: each creature is shown large in the arena
but also as a 26 pixel thumbnail, so one big readable silhouette and two or three
big shapes matter more than texture. Never draw fur strand by strand.

FRAMING
Exactly ONE creature per cell, whole body visible, three quarter view facing the
viewer, filling about 85% of its cell, its lowest point near the bottom of the
cell. No ground, no floor line, no cast shadow, no scenery, no pedestal, no weapon
racks, no second creature.

BACKGROUND
Flat pure white, edge to edge. No gradient, no vignette, no drop shadow.

The five creatures on a sheet must be tellable apart at thumbnail size, so give
each a different silhouette: hunched, rearing, long-limbed, squat, winged.
````

Two rules that carry over from the item sheets:

- **Never write the zone's colour into the creature.** The arena lights the
  portrait in the zone's accent through CSS, so a green-tinted goblin comes out
  radioactive. Describe the creature's own materials and let the lighting do it.
- **Bosses get scale language and one signature prop.** They are the payoff of a
  zone and should read as bigger at 26px, not just as another animal.

---

## Sheet 1: Rat Warrens (5, 3 across then 2)

````
SHEET: Rat Warrens. 5 cells, three across the top row and two on the bottom row.
Vermin under a flooded mill. Wet matted fur, pink naked tails, grey brown and sick
pale pinks. The queen is the only one that stands upright.

CELLS:
  1. Cave Rat         - a mangy oversized cave rat, wet matted grey brown fur, long
                        naked pink tail, yellow chisel teeth bared, one torn ear,
                        hunched low on all fours, small red eyes.
  2. Plague Rat       - a diseased rat, patchy fur falling out in clumps, weeping
                        sores and swollen boils across its flank, one milky blind
                        eye, sickly grey green skin showing through, crouched low
                        and trembling.
  3. Dire Rat         - a dog sized dire rat, heavy corded muscle under coarse black
                        fur, oversized incisors, scarred snout, claws splayed,
                        shoulders raised in a stalking crouch.
  4. Rat Brood Mother - a bloated brood mother, swollen belly dragging low, thin
                        patchy fur stretched over pale skin, many tiny pink pups
                        clinging to her flanks, squatting heavily on splayed legs.
  5. Rat Queen        - a monstrous rat queen, immense and grotesque, standing tall
                        on her hind legs, tattered fur, a crude crown of bone shards
                        and rusted nails pressed into her skull, many rat tails
                        knotted together behind her, jaws open wide.
````

## Sheet 2: Spider Hollow (5, 3 across then 2)

````
SHEET: Spider Hollow. 5 cells, three across the top row and two on the bottom row.
Cave spiders. Glossy chitin, too many legs, silk. Keep the leg arrangement
different on each one so they are not five of the same shape.

CELLS:
  1. Cave Spider      - a bristling cave spider the size of a dog, glossy black
                        chitin, eight thick hairy legs braced wide, a cluster of
                        small glassy eyes, dripping fangs, low to the ground.
  2. Web Weaver       - a pale grey spider with a swollen silk gland abdomen, long
                        thin delicate legs, sticky white silk trailing from its
                        spinnerets, raised high on its legs, translucent bristles.
  3. Venomfang        - a lean predatory spider with enormous curved fangs dripping
                        luminous green venom, deep purple black carapace with pale
                        chevron markings, front legs raised in a strike.
  4. Brood Matron     - a heavy bodied spider with a huge egg sac clutched beneath
                        her, hundreds of tiny spiderlings swarming over her back and
                        legs, dusty brown chitin, squat and wide, legs planted.
  5. Silkweaver Queen - a colossal spider queen, armoured carapace of iridescent
                        black and deep violet, a crown of eight burning red eyes,
                        immense legs arched high above her body like a cathedral, a
                        silk shroud hanging from her abdomen, reared up.
````

## Sheet 3: Goblin Cave (5, 3 across then 2)

````
SHEET: Goblin Cave. 5 cells, three across the top row and two on the bottom row.
A small unfriendly tribe. Sallow green grey skin, scavenged gear, nothing matching.
Each one has a different weapon and a different posture.

CELLS:
  1. Goblin           - a scrawny goblin, sallow green grey skin, huge pointed ears,
                        hooked nose, yellow crooked teeth in a sneer, filthy leather
                        scraps and a rope belt, gripping a rusted crude dagger,
                        hunched and wiry.
  2. Goblin Archer    - a lean goblin skirmisher in patched hide, a crude short bow
                        of bent wood and sinew drawn back, a quiver of ragged
                        arrows on its hip, one eye squinted, weight on the back foot.
  3. Goblin Brute     - a thickset goblin brute, broad slab shouldered and heavy
                        gutted, mismatched scavenged iron plates strapped over its
                        chest, a bone studded club on one shoulder, jutting
                        underbite, planted wide and heavy.
  4. Goblin Shaman    - a stooped goblin shaman draped in bones, feathers and dried
                        rat skulls, a gnarled totem staff topped with a horned skull
                        raised high, milky eyes, white handprints painted on its
                        face.
  5. Goblin Warchief  - a hulking goblin warchief, scarred and heavily muscled, a
                        horned helmet of scavenged plate, a war banner of stitched
                        hides lashed to his back, a huge notched cleaver in one
                        fist, chest out, roaring.
````

## Sheet 4: Skeleton Crypt (5, 3 across then 2)

````
SHEET: Skeleton Crypt. 5 cells, three across the top row and two on the bottom row.
The restless dead. Bone, rotted cloth, cold blue and violet light in empty sockets.
Bone white and grey only, no living flesh tones.

CELLS:
  1. Skeleton      - an animated skeleton warrior, yellowed cracked bones, shreds of
                     rotted linen wrapping, a dented round shield and a pitted short
                     sword, jaw hanging open, standing crooked.
  2. Skeletal Archer - a skeletal archer, brittle bleached bones, a warped longbow of
                     dark wood held drawn, arrows of sharpened bone in a rotted
                     quiver, ribcage visible through hanging rags, one knee bent.
  3. Crypt Wight   - a desiccated wight, leathery shrunken grey skin stretched over
                     bone, sunken pits burning with cold blue light, long grasping
                     clawed fingers, a grave shroud in tatters, arms reaching
                     forward, stooped.
  4. Bone Knight   - a towering skeletal knight in pitted blackened plate armour,
                     empty sockets glowing faint cold blue, a tattered dark surcoat,
                     gripping a heavy notched greatsword point down, one gauntlet on
                     the pommel.
  5. Lich          - a robed lich, skull face beneath a heavy dark hood, pinpoints of
                     cold violet fire in its sockets, skeletal hands raised with pale
                     arcane light gathering between the fingers, ornate tattered
                     robes trimmed in tarnished gold, a crown of thin black iron,
                     hovering just clear of the ground.
````

## Sheet 5: Wolf Den (5, 3 across then 2)

````
SHEET: Wolf Den. 5 cells, three across the top row and two on the bottom row.
Five wolves, which is the hard part: they must NOT be five of the same dog. Vary
the build, the coat and the pose hard. Greys, silver, charcoal, iron.

CELLS:
  1. Dire Wolf    - a dire wolf, lean and long legged, shaggy charcoal grey fur,
                    hackles raised along the spine, lips peeled back from long white
                    fangs, amber eyes, head lowered in a stalking crouch.
  2. Frost Wolf   - a wolf with thick pale silver white fur rimed with frost, ice
                    crystals clinging to its ruff, breath steaming, piercing pale
                    blue eyes, paws planted in a wide stance, snarling.
  3. Alpha Wolf   - a huge scarred alpha wolf, dark grey black fur with a heavy mane
                    at the shoulders, a torn ear and old claw scars across the
                    muzzle, standing tall and square, head up, commanding.
  4. Pack Hunter  - a rangy hunting wolf mid stride, whip thin and fast, mottled
                    brown grey coat, tongue lolling past bared teeth, one forepaw
                    lifted, body coiled low and forward as if breaking into a run.
  5. Ironfang     - a monstrous alpha wolf the size of a horse, black fur streaked
                    with iron grey, jagged metallic fangs like blades, heavy iron
                    chain links torn and still hanging from its neck, glowing pale
                    eyes, forelegs braced, roaring.
````

## Sheet 6: Ogre Stronghold (5, 3 across then 2)

````
SHEET: Ogre Stronghold. 5 cells, three across the top row and two on the bottom row.
Big dull brutes. Mottled grey green and olive hide, stitched hides, scavenged iron.
Vary the gut, the stoop and what each one carries.

CELLS:
  1. Ogre Grunt       - a lumpy ogre grunt, sagging mottled grey green hide, small
                        dull eyes set deep, a filthy loincloth of stitched hides,
                        dragging a heavy knotted wooden club, slouched and slack
                        jawed.
  2. Ogre             - a full grown ogre, immense sloping shoulders and a heavy gut,
                        thick warty olive hide, tusked underbite, crude iron rings
                        through one ear, both fists closed, standing square.
  3. Ogre Houndmaster - a broad ogre in studded leather straps, a fistful of heavy
                        chains taut in one hand, a spiked collar and lash at his
                        belt, scarred forearms, leaning back against the pull of the
                        chains, snarling.
  4. Ogre Seer        - a gaunt hunched ogre seer, one enormous milky white eye and
                        the other sewn shut, robes of stitched hide hung with charms
                        and finger bones, a crooked staff of bound branches.
  5. Ogre Warlord     - a colossal ogre warlord in scavenged plate lashed together
                        with rope and chain, a horned iron helm, an enormous two
                        handed maul of stone and banded iron raised on one shoulder,
                        war paint across his chest, feet planted wide.
````

## Sheet 7: Troll Caverns (5, 3 across then 2)

````
SHEET: Troll Caverns. 5 cells, three across the top row and two on the bottom row.
Trolls made of different materials: rubber, granite, moss, pale blind flesh, scarred
stone. That material difference is what tells them apart, so make it obvious.

CELLS:
  1. Cave Troll    - a long limbed cave troll, rubbery grey hide, disproportionately
                     long arms reaching the floor, a small head with a wide toothy
                     mouth and tiny black eyes, knuckles down, hunched forward.
  2. Stone Troll   - a troll with skin like cracked granite, jagged mineral growths
                     along its spine and forearms, deep set glowing pale eyes, blunt
                     heavy fists, standing solid and immovable, boulder shouldered.
  3. Moss Troll    - a hulking troll overgrown with thick green moss, lichen and
                     small ferns rooted in its hide, gnarled bark like skin beneath,
                     a long mossy beard, a torn tree limb held as a club.
  4. Cavern Troll  - a pale blind cavern troll, sickly white translucent skin showing
                     dark veins, no eyes at all, enormous ragged ears flared wide,
                     long clawed fingers spread, head tilted listening, crouched.
  5. Troll King    - an enormous troll king, slabs of grey stone hide banded with old
                     scars, a crude crown of hammered iron and embedded gemstones
                     jammed onto his brow, an uprooted stone pillar gripped as a
                     weapon, chest thrown out, towering.
````

## Sheet 8: Wyvern Roost (5, 3 across then 2)

````
SHEET: Wyvern Roost. 5 cells, three across the top row and two on the bottom row.
Drakes and wyrms around a crater. Slate greys through to charred black cracked with
molten orange. Vary the body plan: four legged, two legged and winged, serpentine.

CELLS:
  1. Crag Drake   - a wingless four legged drake the size of a horse, slate grey
                    pebbled scales, a blunt horned head, thick tail lashing, claws
                    gripping, low and reptilian, jaws parted.
  2. Ashwing Wyvern - a two legged winged wyvern, dusty grey brown membranous wings
                    half spread, a long barbed tail arched over its back, a narrow
                    horned skull, perched forward on its wing claws, hissing.
  3. Cinder Drake - a drake with dark charred scales cracked to reveal glowing orange
                    embers beneath, smoke leaking from its nostrils and teeth, wings
                    edged with burning cinders, head low and forward.
  4. Magma Wyrm   - a serpentine wyrm of blackened crust with rivers of molten orange
                    running through the cracks, no wings, a long coiling body reared
                    up tall, small clawed forelimbs, jaws open on a glowing throat.
  5. Emberwyrm    - a huge winged wyrm, cracked charcoal scales glowing molten orange
                    between them, ragged membranous wings spread wide, a long horned
                    skull, smoke curling from its jaws, clawed forelimbs planted,
                    tail sweeping behind.
````

## Sheet 9: Demon Sanctum (5, 3 across then 2)

````
SHEET: Demon Sanctum. 5 cells, three across the top row and two on the bottom row.
Deep reds, charcoal, black horn, burning fissures. The last one is the hardest thing
in the game and must read as it.

CELLS:
  1. Hellhound     - a hellhound, charred black hide split with glowing red fissures,
                     no fur across its ribs and shoulders, embers falling from its
                     jaws, four burning eyes, head low, bone spurs raised, stalking.
  2. Sanctum Demon - a tall gaunt demon, deep red grey hide, a pair of curved black
                     horns, cloven hooves, long clawed arms, glowing pale yellow
                     eyes, ribs and hip bones pushing against the skin, upright and
                     still.
  3. Abyssal Fiend - a mass of writhing dark flesh with too many limbs, a lipless
                     mouth of needle teeth splitting its torso, tendrils of black
                     smoke coming off it, several mismatched eyes, hunched and
                     asymmetric.
  4. Dread Knight  - a dread knight in heavy fluted black armour, a slitted horned
                     helm with a red glow behind the visor, a ragged crimson cloak,
                     an enormous cruel blade held in both hands point down,
                     motionless and imposing.
  5. Demon Lord    - a colossal demon lord, deep crimson hide over immense muscle, an
                     enormous crown of curling black horns, vast leathery wings
                     spread behind him, a great flaming sword in one hand, burning
                     cracks running across his chest.
````

## Sheet 10: Thornwood Thicket (4, 2x2)

````
SHEET: Thornwood Thicket. 4 cells, two across and two down.
Ordinary woodland animals, drawn as real animals rather than monsters. Browns,
russet, moss green. Brambles and thorns are the thread between them.

CELLS:
  1. Wild Boar      - a wild boar, coarse bristled brown black hair, curved yellow
                      tusks, a heavy muscled shoulder hump, small furious eyes, snout
                      lowered, front hooves braced to charge.
  2. Timber Wolf    - a timber wolf, thick brown grey coat, alert pricked ears, lean
                      and healthy, gold eyes fixed forward, standing squarely with
                      its head slightly lowered.
  3. Thornback Stag - a great stag with an enormous rack of antlers tangled with
                      thorny briar and dead vines, dark russet coat, muscular neck,
                      head raised proud, hooves planted, breath misting.
  4. Briar Lynx     - a large lynx with tufted black ear tips and a ruff of spotted
                      grey brown fur, brambles caught in its coat, green gold eyes,
                      body low and coiled, one paw forward mid stalk.
````

## Sheet 11: Frostfang Tundra (4, 2x2)

````
SHEET: Frostfang Tundra. 4 cells, two across and two down.
Cold-weather animals. White, pale grey, frost blue. Ice and steaming breath on all
four, but four completely different body plans.

CELLS:
  1. Frost Bear   - a massive shaggy white bear, thick ice crusted fur, rearing up on
                    its hind legs, long black claws spread, frost steaming from its
                    jaws, small cold black eyes, scarred muzzle.
  2. Snow Leopard - a snow leopard, pale smoke grey rosetted fur and an enormously
                    thick tail, ice dusting its shoulders, pale green eyes, crouched
                    low with the shoulder blades raised, ready to spring.
  3. Tundra Elk   - a huge elk, broad palmate antlers heavy with frost, a shaggy dark
                    mane at the throat, steam pouring from its nostrils, standing
                    tall and square, snow on its back.
  4. Ice Mammoth  - an enormous woolly mammoth, long matted red brown hair hanging to
                    the ground and stiff with ice, immense curling yellowed tusks,
                    trunk raised and curled, front legs like pillars, trumpeting.
````

## Sheet 12: Ashen Steppe (4, 2x2)

````
SHEET: Ashen Steppe. 4 cells, two across and two down.
Cracked red earth and ash. Dust greys, scorched black, dull ember orange. One of
these is not a normal animal and should feel wrong next to the other three.

CELLS:
  1. Ash Jackal   - a lean jackal, dusty ash grey fur with a dark saddle marking,
                    oversized pointed ears, ribs showing, dark rings around cunning
                    yellow eyes, head lowered, one paw raised mid step.
  2. Cinder Boar  - a heavy boar with scorched black bristles and skin cracked with
                    faint glowing embers along its spine, tusks blackened and
                    chipped, ash falling from its hide, shoulders bunched to charge.
  3. Dust Stalker - a lean six limbed predator with dust coloured scaled hide, a
                    narrow eyeless head with a wide fanged split jaw, long grasping
                    forelimbs, a whip tail, crouched low and forward, dust sliding
                    off its back.
  4. Scorch Rhino - a colossal rhinoceros with cracked baked earth hide plated like
                    armour, a huge scorched horn and a second smaller one, glowing
                    fissures at its joints, head lowered, front hooves gouging the
                    ground.
````

---

## Cutting them

Ids are in reading order. Dungeon sheets are `rowcols: [3,2]`, hunting grounds are
`grid: '2x2'`. Monster art is 256px into `ART_MON`, not 96px into the item block:

```bash
node _iconart/cutall.js <name>
cp the new raw files into raw_mon/
CVRAW=raw_mon CVCUT=cut_mon node _iconart/key.js --size 256
node _iconart/injectmon.js          # --dry first, read the "N -> N" line
```

<details><summary>ids per sheet, in reading order</summary>

```
rat_warrens      rat plague_rat dire_rat brood_rat rat_queen
spider_hollow    spider web_weaver venomfang brood_matron silkweaver_queen
goblin_cave      goblin goblin_archer goblin_brute goblin_shaman goblin_warchief
skeleton_crypt   skeleton skel_archer crypt_wight bone_knight lich
wolf_den         wolf frost_wolf alpha_wolf pack_hunter ironfang
ogre_stronghold  ogre_grunt ogre ogre_houndmaster ogre_seer ogre_warlord
troll_caverns    cave_troll troll moss_troll cavern_troll troll_king
wyvern_roost     drake wyvern cinder_drake magma_wyrm emberwyrm
demon_sanctum    hellhound demon abyssal_fiend dread_knight demon_lord
thornwood        wild_boar timber_wolf thornback_stag briar_lynx
frostfang        frost_bear snow_leopard tundra_elk ice_mammoth
ashen_steppe     ash_jackal cinder_boar dust_stalker scorch_rhino
```
</details>

Still Swarm-formatted and not yet converted: the 27 raid foes and the 5 raid
backdrops in `PROMPTS-raidart.md`.
