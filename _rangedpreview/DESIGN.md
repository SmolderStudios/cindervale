# Ranged + Fletching

Design for review. Nothing here is in the game yet.

Read the three numbered sections in order. Section 1 is the only one with a real
decision in it; 2 and 3 are the consequences.

---

## 0. What is actually there today

Worth stating, because a lot of the groundwork already exists and the design
leans on all of it.

| | state |
|---|---|
| `dmgType:'ranged'` | already in `DMG_TYPES`, already swings the +/-15% weakness math |
| `weaponClass()` | already maps `ranged` to `light`, with a note "future bows etc" |
| Rogue class blurb | already reads "light weapons (daggers, and bows to come)" |
| `LEATHER_TIERS` | ten tiers, data driven, `def[]` and `atk[]` per piece |
| `COMBAT_STATS` | attack, strength, defence, hitpoints. No ranged, no magic |
| Combat Mastery `ranged` tree | **a layout slot only.** It is the Bulwark column and has nothing to do with ranged. Do not touch it |
| Body slots | 11, no quiver |

So the work is a stat, a slot, two weapon families, ammunition, a skill, and the
armour hook. Not a combat rewrite.

---

## 1. The one real decision: ammunition

**Ranged spends a resource. Melee does not.**

That is the whole identity, and it is the reason Fletching exists rather than
being a decoration. Every shot consumes an arrow or a bolt. Run dry and the fight
stops, exactly the way running out of food already stops offline combat.

Everything else in this document follows from that sentence. If you do not want
ammunition, say so now, because Fletching has no reason to exist without it and
Ranged becomes "melee with a different icon".

What it buys the game:

- A second consumable loop beside food, which is currently the only one.
- A reason for Woodcutting and Smithing output to matter after their own ladders
  are finished. Arrows eat logs and bars forever.
- A real cost curve on damage: better arrows hit harder, and you feel the spend.
- A failure state that is the player's fault and fixable, which idle games need
  more of, not fewer.

What it costs:

- One more thing to remember before going idle. Mitigated by the quiver readout
  on the combat panel and a warning when the count would not survive the session.
- Somebody will idle overnight, run dry in ten minutes, and report it as a bug.
  The Welcome Back panel already has the row shape for "stopped early", so it
  says so.

---

## 2. Ranged, the combat side

### 2.1 The stat

`ranged` joins `state.combatXp`. It is the only new stat; magic stays out of this
update entirely.

Ranged replaces **both** attack and strength for bow combat:

```
accuracy  = ranged x 1.5  + gear.rAtk x 3.5      (same coefficients as melee accuracy)
max hit   = ranged x 1.35 + (bow.str + ammo.str) x 5.0
```

The 1.35 is deliberate and is the balance lever. Melee spends two skills to reach
a given power (attack for accuracy, strength for damage); ranged spends one, so
one ranged level has to be worth less than one attack level plus one strength
level or ranged strictly dominates at equal play time. 1.35 against melee's 1.6
puts a pure ranged character slightly behind a pure melee one on raw damage,
before ammunition is paid for.

**This number is a guess until a simulator says otherwise.** See section 4.

### 2.2 Combat level

```
combatLevel = floor(( max(attack + strength, ranged x 2) + defence + hitpoints ) / 4)
```

`max` rather than a sum, so a pure ranged character reaches the same combat level
as a pure melee one for the same investment, and, importantly, **every existing
save's combat level is unchanged**: with ranged at 1, `ranged x 2` is 2 and
`attack + strength` always wins.

### 2.3 The quiver

A twelfth body slot, between Weapon and Shield.

- **Bows are two handed.** No shield. They already have `twoHanded` support from
  `grave_cleaver`.
- **Crossbows are one handed.** Shield or buckler stays available.
- Ammo type must match the weapon. Arrows do not fire from a crossbow and the
  panel says so rather than silently doing nothing.

### 2.4 The two families

Not a single ladder, because one ladder is not a choice.

| | Bow | Crossbow |
|---|---|---|
| Hands | two | one |
| Weight class | light (Rogue bonus applies) | standard |
| Swing | x0.85, so faster | x1.15, so slower |
| Accuracy | baseline | +18% |
| Ammo | arrows | bolts |
| Shield | no | yes |
| Made from | logs + bowstring | bars + a wooden stock |

Bows are the damage option and lean on Rogue. Crossbows are the survivable
option, hit harder per shot but slower, and keep the shield, which matters in
raids where the no-retreat gauntlet punishes squishy builds.

### 2.5 The ladders

Bows follow the **wood** ladder, which already exists and is currently used for
nothing but firemaking fuel and a handful of recipes:

| tier | wood | WC level | bow | Fletching |
|---|---|---|---|---|
| 1 | Pine | 1 | Pine Shortbow | 1 |
| 2 | Oak | 10 | Oak Shortbow | 12 |
| 3 | Ironbark | 25 | Ironbark Longbow | 27 |
| 4 | Emberwood | 45 | Emberwood Longbow | 45 |
| 5 | Frostwood | 65 | Frostwood Longbow | 62 |
| 6 | Shadowwood | 78 | Shadowwood Longbow | 78 |
| 7 | Ancient | 90 | Ancient Longbow | 90 |

Seven wood tiers against the metal ladder's nine, so the top two bows come from
raid materials (emberweave/voidweave era) rather than logs, matching how the
top two leather tiers already work.

Crossbows follow the **metal** ladder, one per bar: bronze, iron, steel, mithril,
cobalt, runite, starsteel, moltensteel, voidsteel. Nine tiers, no new materials.

### 2.6 Ammunition

Ammo carries the damage. The weapon carries accuracy and speed.

| ammo | from | str |
|---|---|---|
| Bronze arrow | bronze bar | 2 |
| Iron arrow | iron bar | 4 |
| Steel arrow | steel bar | 7 |
| Mithril arrow | mithril bar | 11 |
| Cobalt arrow | cobalt bar | 16 |
| Runite arrow | runite bar | 22 |
| Starsteel arrow | starsteel bar | 29 |
| Moltensteel arrow | moltensteel bar | 37 |
| Voidsteel arrow | voidsteel bar | 46 |

Bolts mirror the same numbers at +15% str and are correspondingly dearer to make,
which is where the crossbow's slower swing gets paid back.

**Recovery.** A Fletching tree node returns a share of spent ammunition after each
fight, up to 60%. Without it the ammo cost is real; with it maxed, ranged is
sustainable but never free. This is the dial that decides whether ranged feels
like a tax or a rhythm, and it should be tuned last, after the simulator.

### 2.7 Armour: leather becomes the ranged line

Exactly as you suggested, and it costs no new art.

`LEATHER_TIERS` gains a third array, `rat[]`, alongside `def[]` and `atk[]`:
ranged accuracy per piece. Metal armour gets a **ranged accuracy penalty**
proportional to its defence, so plate is the wrong thing to shoot in without
anyone having to be told.

That gives all ten existing leather sets a second reason to exist, turns the
tanning ladder into the ranged progression, and means a Rogue in Wolfhide is
already halfway to a ranged build the day this ships.

---

## 3. Fletching

The thirteenth skill. `fl_` prefix, verified free in the source.

### 3.1 Why a skill and not a Crafting category

Crafting is already carrying tanning, leather armour, tools and outfits. Arrows
are a per-session consumable, not a one-off craft, so they want their own XP
curve, their own tree, and their own place on the rail. And a consumable skill
gives the offline system something new to chew on, which the Night Forager stance
just made interesting.

### 3.2 The chain

```
  log            -> Carve shafts        12 shafts per log
  spider silk    -> Spin bowstring      3 silk -> 1 string
  feathers                              new drop, see below
  bar            -> Arrowheads          1 bar -> 12 heads

  12 shafts + 12 feathers + 12 heads    -> 12 arrows
  12 shafts + 12 heads                  -> 12 bolts   (no fletching, hence no feathers)

  bow stave + bowstring                 -> shortbow / longbow
  stock + bar + bowstring               -> crossbow
```

Four input skills feed it: Woodcutting, Mining/Smithing, Crafting (silk), and
combat drops (feathers). That is the point. Fletching is a **sink**, and the game
currently has very few.

### 3.3 Feathers, the one new material

Needed, because every arrow wants one and nothing in the game drops them.

Three sources so the loop can never hard block:

1. **Common drop** in Thornwood Thicket and Frostfang Tundra. Thematically right,
   and both zones are currently thin on materials.
2. **Bird's Nest** yields 8 feathers when opened. That item is on the sell-only
   list today, which is to say it does nothing.
3. **Buyable** from the shop at a deliberately poor rate, so a player who has run
   dry at 3am has a way out that costs gold rather than a session.

### 3.4 The tree

98 points, same hard invariant as every other skill. Sixteen nodes.

| node | max | gate | effect |
|---|---|---|---|
| Steady Hands | 12 | 0 | +2% Fletching speed per rank |
| Straight Grain | 10 | 0 | +3% Fletching XP per rank |
| Bulk Fletcher | 10 | 0 | +2% chance of a double batch |
| Salvager | 10 | 12 | +6% ammunition recovered after a fight |
| Splitter | 8 | 12 | +1 extra shaft per log per 2 ranks |
| Keen Heads | 8 | 20 | +1% ranged accuracy per rank while using ammo you fletched |
| Quiverfull | 6 | 20 | +25 quiver capacity per rank |
| Practised Draw | 8 | 30 | +1% ranged damage per rank |
| Fletcher's Eye | 1 | 40 | arrows show their real dps in the panel |
| Windcutter | 6 | 45 | +2% chance a shot cannot miss |
| Master Fletcher | 1 | 55 | ammunition recovery also applies to bolts |
| Barbed | 8 | 60 | +1.5% bleed chance per rank on a landed shot |
| Grandmaster ranks | 5 x 3 | 75+ | speed / xp / recovery, grandmaster tier |
| Endless Quiver | 1 | 90 | 5% chance a shot consumes no ammunition |
| Fletching Cape | 1 | 99 | capstone |

Exact numbers are placeholders until the simulator runs. The **shape** is the ask:
half the tree improves Fletching, half improves the thing Fletching makes, and
Salvager is the node that decides whether ammunition feels like a cost or a
chore.

---

## 4. What I will not ship without

The offline rework taught this the hard way: a number being far too large is not
an error, and no harness catches it.

Before any of this goes live:

1. **A DPS simulator**, the same shape as the sailing and XP checkers already in
   the repo. Melee vs bow vs crossbow at levels 20 / 50 / 75 / 99, at matched
   gear tiers, with ammunition cost subtracted. Target: **ranged lands within
   95-105% of melee at equal investment.** Anything outside that band is a bug.
2. **An ammunition economy check.** Arrows per hour consumed against arrows per
   hour a player can realistically fletch. If ranged cannot sustain itself
   without a second account's worth of woodcutting, the recovery node is wrong.
3. **Regressions** for: ammo actually being consumed, mismatched ammo refusing to
   fire, running dry stopping the fight and saying so, the quiver surviving
   `normalizeState`, combat level being unchanged for existing saves, and the
   Fletching tree summing to exactly 98.

---

## 5. Scale

Roughly, in the order I would build it:

| slice | what |
|---|---|
| 1 | The stat, combat level, the quiver slot, `normalizeState` guards |
| 2 | Bows, crossbows, arrows, bolts as items, with generated tier art |
| 3 | Ranged combat math, ammo consumption, the dry-quiver failure path |
| 4 | Fletching: skill, acts, XP curve, the rail row |
| 5 | The 98 point tree |
| 6 | Leather `rat[]`, metal ranged penalty |
| 7 | Feathers: drops, bird's nest, shop |
| 8 | The simulator and the regressions from section 4 |
| 9 | Offline support: ranged as an offline combat style, ammo drawn from the quiver |

Slices 1 to 3 are the playable core. 4 and 5 are the skill. 6 to 9 are what makes
it feel like it was always there.
