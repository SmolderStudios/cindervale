# Item icon subject audit — 0.9.121.20

Every one of the 674 shipped icons was put on a labelled contact sheet and judged by
eye against its own display name. This is the pass `picks.js` has always said was
needed — *"verify.js has no idea whether the picture is of the right THING"* — and
which had never been run. A second, deliberately sceptical reviewer re-checked every
flag at full size and threw out 35 as over-flagging.

## Numbers

| | |
|---|---|
| icons judged | 673 / 674 |
| read correctly | 514 |
| called weak | 130 |
| called flat wrong | 29 |
| survived the sceptic | 51 |
| rejected as over-flagged | 35 |
| **regenerated in subjects6.js** | **62** |

## The one failure mode

Z-Image-Turbo at cfg 2.4 answers the strongest noun from its own prior and ignores
the qualifiers around it. The correcting words are usually already present:

```
rat_fang         asked for a fang    ->  a whole rat with one big tooth
rat_tail         asked for a tail    ->  a whole rat, tail as one feature
spinneret        asked for an organ  ->  a whole spider
wyrmscale        asked for a scale   ->  a dragon head on a pile of scales
abyssal_scale    "One scale - not a fish"      ->  a whole fish
leviathan_scale  "not a creature, not armour"  ->  a suit of plate armour
frostfur         "Fur only - no animal, no face" -> a beast's head with a scowl
moonstone_eye    asked for a gem     ->  the actual moon, craters and all
moonpetal        asked for a flower  ->  a crescent moon
ogre_tusk        asked for a tusk    ->  a gold boot
riftcrusher      asked for a hammer  ->  a lit lamp post
troll_maul       asked for a maul    ->  a double-bitted battle axe
void_cinder      asked for a cinder  ->  a keyhole
cut_bloodstone   asked for a stone   ->  an eyeball
*_buckler        "a small round buckler" inside a sentence starting
                 "A single shield..."         ->  five knight heater shields
```

Note the negatives in `abyssal_scale`, `leviathan_scale` and `frostfur`: all three
already said the right thing and were ignored. Negatives do not work on this model —
only removing the offending noun and describing the shape does.

The prior attaches to the FIRST strong noun. Putting `shield` at the front of a
buckler prompt loses every time, no matter what follows it.

## Still open — 62 called weak, never sceptic-checked

The audit run hit the session limit before these got a second opinion. They are
lower-confidence than the 62 already fixed; re-run the sceptic stage before acting.

- `rough_gloves` — Roughhide Bracers — open tan glove, fingers splayed
- `rough_legs` — Roughhide Chaps — pair of tan greaves ending in full feet
- `runite_hammer` — Runite Hammer — green blocky cross, haft running through the head
- `void_boots` — Voidhide Boots — pair of dark purple boots with a large orange flare over the shafts
- `void_legs` — Voidhide Chaps — pair of shin guards, top third solid bright orange, lower half black and violet
- `voidrend` — Voidrend — a black amorphous lump with a violet-outlined wedge across it
- `wooden_trowel` — Wooden Trowel — two trowels crossed in an X — a broad tan wooden scoop behind a dark grey pointed metal blade
- `thornvine` — Thornvine — a spiked green vine curl rising out of a wide glossy green dome base
- `berserker_2` — Berserker's Brew II — corked round potion bottle of dark red liquid
- `ironhide_2` — Ironhide Potion II — corked round bottle of bright cyan blue liquid
- `voidbloom` — Voidbloom — black five-petal flower with a burning orange centre and faint violet slits
- `warband_torc` — Warband Torc — thick closed bronze band with a small animal head on the rim
- `ancient_log` — Ancient Log — golden tree stump with splayed root flares and growth rings on top
- `shadow_log` — Shadowwood Log — near-black log with a bright orange-red glowing end grain
- `ag_boots` — Runner's Shoes — pair of pale grey work boots with a large black slab behind them
- `ember_resin` — Ember Resin — a glossy amorphous orange blob
- `golden_spore` — Golden Spore — a glossy gold sphere with a tiny nub at the base
- `drowned_coin` — Drowned Coin — a clean bright gold coin, blank face
- `kelp_frond` — Kelp Frond — an irregular dark green mass with pale streaks
- `siren_scale` — Siren Scale — a shield-shaped patch covered in many small blue-green scales
- `tide_glass` — Tide-Worn Glass — a faceted cut pale-green gemstone
- `trove_far` — Scale of the Old Thing — a puffy blue rounded square, like a small cushion or pillow
- `voidwood` — Voidwood — an amorphous black hook-shaped blob with an orange streak through it
- `wraith_gloves` — Wraithhide Bracers — a single pale grey five-fingered glove with a wide cuff
- `wraith_legs` — Wraithhide Chaps — a pair of riveted STEEL plate greaves with buckles
- `wraithbound_cowl` — Wraithbound Cowl — a solid black hooded silhouette with shouldered cape, empty hood
- `topaz_flaw` — Flawless Topaz — a golden amber brilliant-cut gem with two black notches punched into it
- `ag_legs` — Runner's Shorts — full-length light grey trousers
- `al_chest` — Alchemist's Robe — dark purple sleeveless romper with short legs
- `al_hat` — Alchemist's Hood — purple wide-brimmed floppy hat with a glowing crown
- `co_chest` — Chef's Jacket — hollow outline of a sleeveless romper on a wire hanger
- `co_hat` — Chef's Hat — dark bucket hat with one cream panel
- `co_legs` — Chef's Trousers — hollow outline trousers pegged to a clothesline
- `cr_chest` — Forgemaster's Apron — dark red sleeveless overalls with shoulder straps and short legs
- `drowned_jewel` — Drowned King's Jewel — a gold crown with green enamel and a green gem in the brow band
- `drowned_locket` — Drowned Locket — smooth rounded brass disc with a hinge loop and a chain bail
- `silkweave_band` — Silkweave Band — a plain wide white-silver ring with faint diagonal strands
- `fm_hat` — Pyromancer's Hood — pointed red witch/wizard hat with floppy brim
- `jw_chest` — Lapidary's Apron — teal buttoned waistcoat with gold buttons and welt pockets
- `mi_hat` — Prospector's Helm — soft grey felt fedora with brown leather band and buckle
- `sm_chest` — Blacksmith's Apron — near-black sleeveless one-piece romper with short legs, orange edge glow
- `sm_hat` — Blacksmith's Helm — very dark floppy wide-brim hat with orange rim light
- `rhino_bulwark` — ? — round viking shield of wood planks with a steel dome boss and rivets
- `abyssal_pendant` — Abyssal Pendant — a bare teal-green faceted crystal, no chain, bail or setting
- `iron_rod` — Iron Rod — very thin navy-blue fishing rod on a diagonal
- `iron_tinder` — Iron Tinderbox — open red-and-cream box with a striker and a wooden-handled tool inside
- `mithril_trowel` — Mithril Trowel — a bright blue D-handle digging spade
- `moonrod` — Moon Rod — a thin polished silver pole with a small hook at the top
- `void_alembic` — Void Alembic — a round-bottomed corked flask of violet liquid
- `void_lens` — Void Lens — a solid opaque violet disc inside a thick black ring with a stubby handle
- `voidrod` — Void Rod — a very thin coppery brown rod with a hook, on a diagonal
- `voidbloom_seed` — Voidbloom Seed — pure-black pouch lit by a fiery orange glow, small violet seed above
- `voidmoss_seed` — Riftmoss Seed — pure-black pouch with the same fiery orange glow, tiny purple nub on top
- `bronze_axe` — Bronze Axe — axe with a charcoal-grey head on a gold-brown wooden haft
- `eclipse_forge` — Eclipse Forge — stone arched forge with warm orange flames in the mouth
- `eclipse_hearth` — Eclipse Hearth — dark stone fireplace with warm orange fire and logs
- `eclipse_treads` — Eclipse Treads — pair of flat black boot silhouettes lit by an orange fire glow
- `eclipse_trowel` — Eclipse Trowel — flat black long-handled digging spade with a thin orange rim light
- `everflame_pick` — Everflame Pick — pick head sitting on top of a large black rounded-square mass with an orange diagonal stripe
- `everflame_rod` — Everflame Rod — thin diagonal pole with a flame burning partway along it
- `everflame_satchel` — Everflame Satchel — dark drawstring sack swallowed by orange flame
- `flint` — Flint & Steel — grey-white faceted stone with a thin black curl beside it

## Rejected by the sceptic (first pass over-flagged these)

- `granite_core` — Live variant is __painted (picks.json maps granite_core -> painted); the __emblem alternate is a blanker pale dome but is not in use. The fi
- `dawnsteel_buckler` — Right object class, right slot, right material read. The whole buckler line uses this same shape, and the big centre boss is exactly what se
- `grave_iron` — First pass over-flagged. I re-rendered the sheet variant (grave_iron__emblem) at 15/20/31px on the actual card ground and both of its concre
- `cooked_voideel` — First pass's central claim does not survive checking. Rendered at true 15px and 31px next to cooked_trout and cooked_tuna, this icon is plai
- `demon_gloves` — First pass is mistaken. "Bracers" is not a description of the object here, it is the leather family's flavour noun for the HANDS slot: cinde
- `iron_buckler` — The silhouette observation is right — it is a heater shield, not the small round disc a buckler literally is — but the conclusion overstates
- `mithril_buckler` — The first pass described the picture correctly but I don't think it's a defect. Three checks: (1) It reads unambiguously as a shield, and a 
- `chitin_maul` — Not a defect. The shipping pick is the emblem variant (picks.json:287, chosen deliberately over painted), and it is exactly what the prompt 
- `bronze_legs` — Not confirmed. The painted variant (the one picks.json selects) is a legitimate articulated leg harness — cuisse, poleyn, greave — mirrored 
- `chitin_legs` — Not confirmed. Item is "Chitinweave Chaps" and the icon plainly shows paired leg armour. I re-rendered it beside chitin_boots and bronze_leg
- `cinderfang` — NOT CONFIRMED - do not regenerate. The first pass's observation is factually correct and I verified it by counting pixels: both files contai
- `gravesteel_hammer` — First pass is mistaken on its central claim. Measured on the painted PNG (128x128, object bbox x36-91 y6-121), the top-third block head is 3
- `moltensteel_buckler` — The shape observation is accurate but does not amount to a failure. The icon depicts a shield, the item is a shield, and no player would nam
- `chitin_gloves` — Both first-pass objections fail on inspection. (1) The "Bracers vs glove" mismatch is a game-wide naming convention, not an art defect: cind
- `bone_reaper` — First pass over-flagged, and two of its three factual claims do not hold. Name is "Bone Reaper", prompt "A single scythe, one long curved pa
- `mithril_hammer` — First pass overcalled. Its core claim - "no hammer head, nothing protrudes sideways" - is measurably false. From the alpha channel of the 12
- `moltensteel_hammer` — First pass's reason is measurably false. Head spans 38px (x45-82) over a 16px shaft (x56-71) — an 11px overhang each side, ratio 2.38, mid-p
- `tanned_hide` — Inspected the picked variant (picks.json says painted) at 512px and re-rendered at 15/20/31px. This is not a sack. The silhouette is widest 
- `deep_amber` — First pass was mistaken. A warm orange-gold teardrop is the standard shorthand for amber — amber IS fossilised tree resin, and resin drops a
- `steel_dagger` — The first pass saw it accurately at full size — the blade really does continue past the crossbar to a second point, so there is no handle, a
- `nullward` — Not a miss. The item IS a shield (cslot:'shield', T9, def 78) and the icon is unambiguously a shield — the silhouette is the cleanest in the
- `cooked_shark` — Not confirmed. The icon depicts exactly what its prompt asked for and what the item is: a cooked fish. Cooked Shark is food, not a live anim
- `raw_voideel` — Live pick for this id is the EMBLEM variant (confirmed in _iconart/picks.json: raw_voideel -> emblem), which is what the first pass saw. I r
- `chitin` — Live pick is the emblem (picks.json: chitin => emblem), and that is the one the first pass saw. Downsampled it myself to 16/20/31px on the d
- `ogre_legs` — First pass over-flagged; its three specific claims do not survive checking the file at 3x against its neighbours. (1) "Hard highlights and r
- `void_crystal` — First pass over-read the tip highlight. The warm area is only the top ~15% of the shape; the body is near-black with visible violet facets, 
- `drake_gloves` — First pass is factually off on both counts. The fingers are individually separated with gaps that survive downscaling — I rendered it at 15p
- `graveshroud_vest` — Over-flagged. The item is "Grave-Shroud Vest" and the icon is unambiguously a grey sleeveless vest — correct object, correct colour family, 
- `ember_gloves` — The first pass is factually right and practically wrong. The item is "Emberhide Bracers" (C:/code/embervale/cindervale.html:26074, `_LSLOT_N
- `ember_boots` — First pass overstated this. The shipped variant is emblem (picks.json). Downsampled to 15/16/20/31px on the dark panel: the rim light outlin
- `venom_sac` — Over-flag. The icon depicts the correct object: a venom sac is a sealed taut gland, and a smooth glossy blob is what one looks like — nothin
- `cinder_gland` — Shipping variant is painted (picks.json: cinder_gland -> "painted"), which is what the first pass saw. It is not the wrong object: the item 
- `runite_legs` — First pass is mistaken about the specific failure. Rendered both this icon and runite_boots at 18px and 31px and set them side by side: the 
- `void_gloves` — First pass over-flagged. The prompt asked for "a single soft leather glove, fingers curled, wide cuff at the wrist" and that is exactly what
- `voidedge` — First pass has the colour backwards. The painted icon is a dark blade with light violet edges, which is exactly the prompt's "black blade wi
