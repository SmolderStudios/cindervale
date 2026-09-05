# Prized catches — 0.9.122.24

Sixteen icons: eight prized raw fish and the eight dishes they cook into.

These ship **working already** — a prized fish wears its ordinary fish's painting
inside a `.gilded` CSS wrapper (warm filter, halo, glint). That is deliberately
temporary. The wrapper says "this one is special" but it cannot change the *fish*:
a prized catch should be visibly a bigger, older, finer specimen, and a filter
cannot grow a fin.

Defining `ICONS.prized_*` beats the wrapper automatically, so these can be dropped
in whenever they are ready with no code change.

Paste the **style block** from `PROMPTS.md` once first — everything below assumes it.

```bash
node _iconart/slice.js sheets/prized_raw.png    sheets/prized_raw.txt    --grid 4x2
node _iconart/slice.js sheets/prized_cooked.png sheets/prized_cooked.txt --grid 4x2
```

The ORDER in each CELLS list is the contract — `slice.js` does not read captions.

---

## The rule for both sheets

This is the hard part, so it goes in both prompts:

> A prized catch is **the same species**, not a different fish. Anyone who has seen
> the ordinary one must recognise this instantly as that fish — same silhouette,
> same body plan, same colours — and read it as an exceptional specimen of it.
>
> It is a **trophy fish**: bigger, older, thicker through the shoulder, longer
> finned, its scales in better condition. Add a **warm golden sheen** over the
> species' own colour and **one small bright glint** on the flank. Do NOT recolour
> the fish gold, do NOT add gems, crowns, sparkles, ribbons or stars, and do NOT
> swap the species.

---

## Sheet A — Prized raw fish (8, grid 4x2)

````
SHEET: Prized raw fish. 8 cells, 4 across and 2 down.

Each cell is a whole raw fish, lying flat, in profile, facing left — exactly how the
ordinary raw fish are drawn on the fish sheet. Match that sheet: same treatment,
same lighting, same angle, same size in frame.

A prized catch is THE SAME SPECIES, not a different fish. It must read instantly as
that fish and as an exceptional specimen of it: bigger, older, thicker through the
shoulder, longer finned, scales in better condition. Give it a warm golden sheen over
the species' own colour and one small bright glint on the flank.

Do NOT recolour the fish gold. Do NOT add gems, crowns, sparkles, ribbons or stars.
Do NOT swap the species. No hook, no line, no water, no hands, no plaque.

CELLS:
  1. Prized Raw Minnow     — a small silver river fish, here an unusually large one
  2. Prized Raw Sardine    — a slim blue-green sea fish with a bright silver belly
  3. Prized Raw Trout      — a speckled brown-and-pink river trout, heavy-bodied
  4. Prized Raw Tuna       — a deep blue steel-flanked open-water fish, broad
  5. Prized Raw Salmon     — a thick silver-and-rose salmon with a hooked jaw
  6. Prized Raw Swordfish  — a long dark fish with a pointed bill, sleek
  7. Prized Raw Shark      — a grey deep-sea shark, whole, blunt-nosed and scarred
  8. Prized Raw Void Eel   — a long violet-black eel, faint pale motes in its skin
````

<details><summary>id order for <code>sheets/prized_raw.txt</code></summary>

```
prized_raw_minnow
prized_raw_sardine
prized_raw_trout
prized_raw_tuna
prized_raw_salmon
prized_raw_swordfish
prized_raw_shark
prized_raw_voideel
```
</details>

---

## Sheet B — Prized dishes (8, grid 4x2)

````
SHEET: Prized cooked fish. 8 cells, 4 across and 2 down.

Each cell is a cooked portion of fish, plated on nothing — exactly how the ordinary
cooked fish are drawn on the fish sheet. Match that sheet: same treatment, same
lighting, same angle, same size in frame.

These are the exceptional version of the same dish: a larger, better-cooked, more
generous portion of the SAME fish, with a warm golden sheen and a light glaze catching
one bright highlight. Perfectly seared, not burnt.

Do NOT add plates, boards, cutlery, garnish piles, table, steam clouds, gems, crowns
or sparkles. Do NOT change what fish it is.

CELLS:
  1. Prized Minnow     — a small whole grilled river fish, crisp-skinned
  2. Prized Sardine    — a small whole grilled sea fish, split and browned
  3. Prized Trout      — a whole grilled trout, skin blistered and golden
  4. Prized Tuna       — a thick seared tuna steak, dark crust and pink centre
  5. Prized Salmon     — a seared salmon fillet, deep rose, skin side crisp
  6. Prized Swordfish  — a pale seared swordfish steak with grill marks
  7. Prized Shark      — two thick pale shark steaks, seared at the edges
  8. Prized Void Eel   — coiled grilled eel, glossy violet-black glaze, faint motes
````

<details><summary>id order for <code>sheets/prized_cooked.txt</code></summary>

```
prized_minnow
prized_sardine
prized_trout
prized_tuna
prized_salmon
prized_swordfish
prized_shark
prized_voideel
```
</details>

---

## When they land

`inject.js` writes into the ART_ITEM block, which assigns over `ICONS` **last** on
purpose. `iconHTML` checks `ICONS[id]` before it falls back to the gilded wrapper, so
painted art simply takes over — no code change, nothing to remove.

Keep the `.gilded` CSS either way: if only one sheet gets drawn, the other eight stay
gilded and the two halves still read as one family.

The audit asserts a prized icon is painted art and not a pre-art SVG, so a bad slice
that leaves an id uncovered fails the suite rather than shipping quietly.
