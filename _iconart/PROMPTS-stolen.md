# Six more stolen goods  ·  PENDING

Added in 0.9.122.41 so the Nightmarket board has enough to ask for now that it only
deals in stolen goods. They ship borrowing the nearest painted thing of their kind
through `ICON_ALIAS`, and `_audit_tests.js` names all six. **Delete an id from that
list and from ICON_ALIAS as its cell lands.**

Each one is a PLACE rather than a person, which is the whole idea: the first six
stolen goods came off a mark, these six came out of somewhere.

| id | name | where it came from | borrowing |
|---|---|---|---|
| `silver_censer`   | Silver Censer     | a shrine         | silver_plate |
| `smuggler_ledger` | Smuggler's Ledger | the docks        | drowned_ledger |
| `heirloom_locket` | Heirloom Locket   | a manor          | drowned_locket |
| `officers_sabre`  | Officer's Sabre   | the barracks     | steel_sword |
| `bankers_seal`    | Banker's Seal     | a counting house | coin_signet |
| `crown_shard`     | Shard of a Crown  | a palace         | warchief_crown |

````
SHEET: Six stolen valuables for a dark-fantasy RPG. 3 cells across, 2 down.

Hand-painted with a dark ink outline holding the silhouette and cel-like shading in
three or four value steps. NOT flat vector, NOT a photograph, NOT a 3D render.

One object per cell, drawn LARGE and filling about 90% of its cell, no empty margin.
No background, no table, no cloth, no hands. Same lighting and same size in frame in
every cell, because these sit in a row in an inventory.

These are things somebody has just taken and has not had time to clean up. Every one
should look valuable and slightly wrong to be holding: a scuff, a snapped chain, wax
broken off a seal, a cut edge.

  1. Silver Censer     a small hanging incense burner on a broken chain, pierced
                       silver bowl, a wisp of smoke still coming out of it
  2. Smuggler's Ledger a fat leather account book, cord tie hanging loose, pages
                       edged in salt-stain, dark green cover
  3. Heirloom Locket   an oval gold locket sprung open, a tiny painted portrait
                       inside too small to make out, fine chain trailing
  4. Officer's Sabre   a curved parade sabre, bright steel, ornate gold knuckle
                       guard, drawn on its own with no scabbard
  5. Banker's Seal     a heavy brass hand-stamp on a short turned handle, the die
                       face towards the viewer, red wax still stuck to it
  6. Shard of a Crown  a cut-off corner of a gold crown, three points and jewels,
                       the cut edge raw and bright where it was sheared

Flat pure white background behind the whole sheet, edge to edge.
````

<details><summary>id order for <code>sheets/stolen.txt</code></summary>

```
silver_censer
smuggler_ledger
heirloom_locket
officers_sabre
bankers_seal
crown_shard
```
</details>

## After they land

```bash
node _iconart/slice.js sheets/stolen.png sheets/stolen.txt --grid 3x2
node _iconart/key.js --only "silver_censer,smuggler_ledger,heirloom_locket,officers_sabre,bankers_seal,crown_shard"
# add the six ids to picks.json, then:
node _iconart/pack.js --picks _iconart/picks.json && node _iconart/inject.js
```

Then take all six out of `ICON_ALIAS` in `cindervale.html` and out of the PENDING
list in `_audit_tests.js`.
