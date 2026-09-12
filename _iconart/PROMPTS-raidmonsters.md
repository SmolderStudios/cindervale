# The 27 raid monsters, as ChatGPT sheets

The four raids still draw their foes as hand-drawn SVG. These are the same 27
creatures written as ChatGPT contact sheets, the pipeline that produced every item
icon, the nine Spire natives and the 57 zone monsters.

**One sheet per raid.** Six for the Barrow, six for the Emberforge, seven for the
Abyssal Throne, eight for the Empyrean. Drawing a raid's foes together is what
guarantees they are tellable apart from each other at 26 pixels.

Paste the **creature block** from `PROMPTS-monsters.md` once in a new chat, then
feed one sheet at a time.

## What these sheets are guarding against

Written, then reviewed twice against the shipped art and the arena CSS. Four
things came out of that review and are baked in below:

- **Never write the raid's own colour into the creature.** The arena lights the
  portrait in the raid's accent through CSS, and the light comes from BELOW: an
  accent ellipse sits right under the feet and a 30px accent drop-shadow wraps the
  whole outline. So the Barrow is lit teal, the Emberforge orange, the Abyssal
  violet, the Empyrean gold. A creature already painted that colour comes out
  radioactive. This is easy to break by accident: "river weed" is green under teal,
  "cooling slag" glows orange under orange, "a dead ember for a face" is the accent
  sitting on the one part that survives to 26px. All three were caught and changed.
- **Silhouettes have to differ ACROSS sheets, not just within one.** The first draft
  had two wide knuckle-walking giants with the head sunk between the shoulders, in
  the two warm-lit raids a player meets back to back. It also had two rigid guards
  at attention with a tall rectangular shield, and two gaunt verticals blowing a
  horn. All three pairs are broken below.
- **Three of four bosses wore a broken crown.** Xor'Vael lost his, because the
  throne growing out of his own spine is already the best prop in the set.
- **The mini-bosses are Molten Sentinel, Null Warden and Seraph Warden**, not the
  Colossi. The first draft sold the Colossus as the big one, which would have made
  the art contradict the fight. Yardsticks now match the HP.

Say the ban positively where you can. "Every creature here is black, bone or
drained grey" works; "no purple anywhere" tends to summon purple.

## After the art lands

Row layouts and id lists are already registered, so the sheets drop straight in:

```bash
node _iconart/_monseg.js mon_sunken_barrow mon_emberforge mon_abyssal_throne mon_empyrean_throne --contact
node _iconart/injectmon.js --dry
node _iconart/injectmon.js
```

Save them as `mon_sunken_barrow.png`, `mon_emberforge.png`, `mon_abyssal_throne.png`
and `mon_empyrean_throne.png` in `_iconart/sheets/`.

---

## Sheet 1: The Sunken Barrow (6, three across then three)

````
SHEET: The Sunken Barrow. 6 cells, three across the top row and three on the
bottom row. A warrior king's tomb drowned when the old dam broke, and the honour
guard never stood down. Waterlogged everything: rust brown mail, silt grey bone,
dull tarnished bronze, grave cloth heavy with black water, and any weed or growth
rotted black rather than green. Four of these wear armour, so height and stance
have to tell them apart.

CELLS:
  1. Barrow Sentry     - a drowned tomb guard standing rigid at attention,
                         tarnished bronze scale over waterlogged grave wrappings,
                         a tall narrow shield gripped at its side, a pitted spear
                         held upright, an empty helm with two cold white pinpoints
                         inside.
  2. Drowned Footman   - a bloated dead soldier listing heavily to one side, a
                         swollen waterlogged gambeson split at the seams, a dented
                         kettle helm askew over a grey drowned face, a short
                         stabbing sword held low, black water running out of both
                         sleeves.
  3. Tomb Revenant     - a lean long limbed corpse half risen out of its own grave
                         linen, dry brown bone showing through shredded wrappings,
                         both arms stretched far forward, jaw hanging loose, the
                         body kept low and dragging behind the reach.
  4. Barrow Champion   - a massive grave champion, half again the height of the
                         others, dented ceremonial plate crusted with silt and
                         river shells, an enormous stone headed war hammer hauled
                         up overhead in both fists, legs braced wide, hoarfrost
                         creeping across a torn surcoat.
  5. Warden's Herald   - a tall gaunt horn bearer, thin as a post in a sodden
                         tabard, a wide antlered helm, a long corroded horn swung
                         out wide from its mouth on one lifted arm, ribbons of wet
                         cloth trailing from both elbows.
  6. The Barrow Warden - the dead warrior king, twice the bulk of any soldier
                         here, barnacled black plate under a heavy mantle of
                         rusted chain and matted black weed, a broken iron crown
                         fused into the helm, an immense two handed sword held
                         point down in both gauntlets.
````

---

## Sheet 2: The Emberforge Deep (6, three across then three)

````
SHEET: The Emberforge Deep. 6 cells, three across the top row and three on the
bottom row. A forge drowned an age ago and rekindled, worked now by things built
out of its own material rather than by anything alive. Slag gone cold and grey,
fire cracked black basalt, burnt bronze plate gone brown under soot, iron chain,
hammered blooms of pitted grey metal, cinder and clinker. Keep them dark and
ashen and show the heat only as thin seams and hairline cracks between the
plates, nowhere else.

CELLS:
  1. Forge Thrall            - a small broken smith, stooped and lopsided under a
                               leather apron burnt to black scale, one arm ending
                               in a hammer head fused at the wrist, a snapped
                               shackle on the other, thin pale seams in the soot
                               grey skin, head hanging.
  2. Cinder Golem            - a squat boulder of a construct crouched wide and
                               low on stubby limbs, no neck, its body packed from
                               clinker and grey cinder bound in rusted banding,
                               hairline cracks of pale heat between the stones, a
                               blind socket of cold black slag for a face.
  3. Ashbound Brute          - a long limbed brute mid lunge with one enormous
                               fist swung far out to the side, caked pale ash over
                               scorched hide, lengths of iron chain sunk into the
                               shoulders, a small sunken head, thin pale seams
                               down the spine.
  4. Molten Sentinel         - a headless guardian braced forward behind a huge
                               slab shield of fire cracked black basalt, half
                               again the height of the thralls, shoulders dropped
                               low behind the rim, narrow burnt bronze plates held
                               a finger apart with thin seams between them.
  5. Emberforged Colossus    - a construct shaped like an anvil, top heavy and
                               enormously wide on short thick legs, a tiny fused
                               head sunk between the shoulders, the torso one
                               riveted bloom of pitted grey iron, a shut furnace
                               door in its chest, arms hanging like counterweights.
  6. Ignar, the Forge-Tyrant - a forge tyrant twice the height of anything here,
                               shoulders like a pair of bellows, a crown of driven
                               nails fused to his brow, burnt bronze plate crusted
                               with cold grey slag, thin white heat in the rib
                               cracks, one immense hammer over the shoulder.
````

---

## Sheet 3: The Abyssal Throne (7, four across then three)

````
SHEET: The Abyssal Throne. 7 cells, four across the top row and three on the
bottom row. Past the last sanctum, where reality has worn through. Every creature
here is a WRONG shape: too many joints, parts that do not connect, edges that stop
dead in clean straight cuts. Matte black that swallows light, bleached bone, wet
dark chitin, drained grey, and a sickly non colour that is not quite grey and not
quite green. Every creature here is black, bone or drained grey and nothing else,
the matte black and the bleached bone carry them. No two stand the same way: one
crawls, one runs, one hovers, one stands tall, one is planted square, one leans,
one sits.

CELLS:
  1. Void Wretch        - a thin flayed wretch dragging itself on six too long
                          arms and no legs at all, wet parchment skin in a sickly
                          grey going to old bile, joints bending the wrong way, a
                          lipless mouth of needle teeth, head hung low.
  2. Rift Stalker       - a lean four legged stalker stretched out mid stride,
                          matte black hide that swallows light, legs far too long
                          and jointed twice over, a narrow eyeless head, one hind
                          leg trailing behind as if the back half has not caught
                          up yet.
  3. Abyssal Maw        - a hovering ring of wet dark chitin lined with three rows
                          of bleached bone teeth, no body and no eyes behind it,
                          the gullet a flat dead white with nothing in it, short
                          ragged tendrils hanging beneath.
  4. Void Herald        - a tall upright herald in black robes, a hollow hood with
                          no face in it, both thin arms spread wide mid
                          announcement, hands with far too many bone white
                          fingers, the robe ending in a hard flat edge with
                          nothing below it.
  5. Null Warden        - a broad squat warden half again the bulk of the herald,
                          twice as wide as it is tall, slabs of matte black stone,
                          no head and no face, a huge sealed door of bone and
                          black iron strapped across one forearm, planted square
                          and immovable.
  6. Riftbound Colossus - an enormous colossus of bleached bone and black basalt,
                          whole chunks of its chest and shoulders hanging apart
                          with clear gaps between them, heavy black chains bolted
                          through its wrists and trailing off, leaning forward
                          under its own weight.
  7. Xor'Vael, the Void Sovereign - the vast seated sovereign, three times the
                          scale of the others, long bone white limbs folded, a
                          small featureless head, one enormous eye open in his
                          chest, the throne of torn unmade world growing out of
                          his own spine rather than standing under him.
````

---

## Sheet 4: The Empyrean Throne (8, four across then four)

````
SHEET: The Empyrean Throne. 8 cells, four across the top row and four on the
bottom row. Holiness gone wrong. Bone white, bleached marble, ash grey and
scorched black, cracked porcelain and burnt feathers, with white hot filament
showing in the splits. Trim is old metal gone brown and flaking, only ever a thin
edge, never a bright surface and never a whole body. Too many wings, too many
eyes, haloes worn like restraints. Nothing here is clean or new.

CELLS:
  1. Dawnling                   - a hunched cherub thing smaller than anything
                                  else here, no bigger than a child, crazed
                                  porcelain skin, four stubby burnt wings folded
                                  over it like a shell, no face above the wide
                                  mouth, curled tight with its head bowed.
  2. Radiant Wisp               - barely a body at all, a drifting ribbon of
                                  scorched linen wound around a thread of white
                                  hot filament, one blind eye set in the knot at
                                  its top, tattered streamers trailing down to
                                  nothing.
  3. Astral Hound               - a long low four legged hound of bleached marble,
                                  split hide showing the ribs, a cracked porcelain
                                  mask fused over its face, dead violet in the
                                  mask seams, a ridge of burnt feathers along its
                                  spine, head dropped low.
  4. Lightbringer Herald        - a towering thin herald on stilt legs, ash grey
                                  robes hanging off a frame of bare marble, six
                                  small wings pinned flat to its spine, an
                                  enormous cracked bone trumpet grown out of its
                                  face where a mouth should be, hands hanging
                                  empty.
  5. The Fallen Choir           - a single wide swaying mass of fused singers, a
                                  bell shaped trunk of grey robes with five bone
                                  white heads growing out of it, every mouth
                                  stretched open mid note, stunted wings bristling
                                  along the shoulders, no legs at all.
  6. Seraph Warden              - a huge armoured warden, half again the size of
                                  the rest, rearing upright with four burnt
                                  feather wings thrown wide, scorched black plate
                                  over marble limbs, a barred halo clamped across
                                  its blank faceplate, one slab shield as wide as
                                  its own body held out front.
  7. Empyrean Colossus          - a colossal squat giant hauling itself forward on
                                  one vast marble arm, the other sheared off
                                  clean, shoulders of broken cathedral stone, a
                                  ring of small blind faces circling the stump of
                                  its neck, white hot cracks across its chest.
  8. Aureon, the Dawnbroken God - the first god, twice the size of anything else,
                                  slumped forward asleep with knees drawn up and
                                  one arm hanging slack, six ruined wings
                                  drooping, ash grey skin split by white hot
                                  seams, a shattered halo ring broken across his
                                  shoulders like a yoke.
````
