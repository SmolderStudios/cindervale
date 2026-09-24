# The archer's gem and brew — the art list

Five items added in 0.9.127.3, all five still wearing a palette-driven generator
SVG. They are on `HAWK_PENDING` in `_audit_tests.js`, which is what keeps the art
sweep green; take them off that list the day these are injected.

| Family | Items | Sheet |
|---|---|---|
| Hawkseye, the ranged socket gem | 3 | A |
| Hawkeye Draught | 2 | B |

**Two sheets, five assets.** Sheet A is a recolour ladder of one stone, so the
three cells must be the same mineral at three cuts, not three different stones.

Paste the **style block** from `PROMPTS.md` once at the start. Both sheets assume it.

Two things specific to this batch:

- **Hawkseye is teal**, and it has to survive at 20px beside Verdant's grass green
  and Azure's blue. Push it toward blue-green and keep the highlight almost white,
  so the eye separates it from Verdant at a glance.
- **Sheet A copies the vocabulary of the gem sheet already in `PROMPTS.md`**:
  chipped is a small rough chip, polished is a cut oval seen face on, flawless is a
  large brilliant cut seen face on. Match those three silhouettes exactly, because
  the five other colours already follow them and a sixth that does not will read as
  a different kind of object.

---

## Sheet A — Hawkseye, three cuts (3, one row)

````
SHEET: Hawkseye, the archer's gemstone. 3 cells in one row.

All three are the SAME mineral at three cuts: a deep blue-green teal stone, a
sea-glass colour, with a near-white highlight and a dark blue-green shadow. It must
NOT read as grass green, and must NOT read as sapphire blue. The chipped one is
rough, the other two are cut and symmetrical, same as the other gem colours.

CELLS:
  1. Chipped Hawkseye   - small rough chipped teal gemstone, one lumpy chip with a
                          crystalline break face catching the light. Raw, not cut.
  2. Polished Hawkseye  - cut and polished teal oval seen face on, smooth crown,
                          a few clean facets, one bright highlight.
  3. Flawless Hawkseye  - large flawless brilliant cut teal gemstone seen face on,
                          sharp symmetrical facets, bright star highlight, the
                          richest and deepest teal of the three.
````

<details><summary>id order for <code>sheets/hawkseye_gems.txt</code></summary>

```
hawkseye_chip
hawkseye_polish
hawkseye_flaw
```
</details>

---

## Sheet B — Hawkeye Draught (2, one row)

Two flasks of the same brew. They sit beside Honed Edge, Ironhide and Berserker's
Brew in the satchel, so they need the same glass-and-cork language those have: a
squat stoppered bottle, liquid with a visible surface, a wax seal or a tied label.

````
SHEET: Hawkeye Draught, an archer's potion. 2 cells in one row.

Both bottles hold the same bright teal liquid, clear and luminous rather than
cloudy. Cork stopper, glass with one strong rim highlight down the left edge.
The second is plainly the bigger, better version of the first.

CELLS:
  1. Hawkeye Draught I   - a small squat round flask, half the height of a hand,
                           simple cork, teal liquid to the shoulder, one thin
                           leather cord around the neck. A single feather fletching
                           tied to the cord, small, the only decoration.
  2. Hawkeye Draught II  - a taller heavier bottle of the same family, wider body,
                           wax-sealed cork, the teal liquid darker and brighter at
                           the base, a paper label tied on with two fletched
                           feathers hanging from the neck cord. Clearly the
                           stronger brew.
````

<details><summary>id order for <code>sheets/hawkeye_draught.txt</code></summary>

```
hawkeye_draught_1
hawkeye_draught_2
```
</details>
