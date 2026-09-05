# Cindervale — changes since the last Steam build

**Steam depot has `0.9.122.11`** (BuildID **25138676**, uploaded 2026-09-05, not set
live by me — Jordan publishes builds himself).
**Web channels are on `0.9.122.18`** — root, `/playtest/` and `/demo/` all in sync.

So the depot is **seven builds behind**. Everything below is what it is missing.

The release banner stays **v0.9.122** on purpose: these went out as hotfixes, so only
the build stamp moved. Next free stamp is `0.9.122.19` — the stamp must never repeat
or anyone cached on it stops receiving updates.

Audit suite is at **565 assertions**. `node _validate.js` and `node _audit_tests.js`
both pass. Every entry below is guarded.

---

## Player-facing

**A locked screen no longer eats your progress** *(ticket #52, `.13`)*
Locking the OS occluded the window, so the engine throttled tick, the combat timer
and the autosave together. The time fell between the game's two states — not closed,
so the boot path never settled it; not running, because skilling's catch-up is
clamped to two minutes and combat takes one swing per tick however long the gap. A
gap past that clamp is now settled the way a relaunch settles it. Also covers sleep,
hibernate and a long minimise.

**Weapons say what weight class they are** *(ticket #53, `.14`)*
Shields said their block is "halved with light weapons" and no weapon said whether it
was one. All 56 now state Light / Standard / Heavy and what it costs or buys, and a
two-hander says it takes both hands.

**Amulets and pendants say how they differ** *(ticket #55, `.15`, reworded `.16`)*
Same neck slot, same gem, same enchant list — the only difference is which set they
feed. Header now tags `Amulet (skilling)` / `Pendant (combat)`, with one line under
it: `Set 0/2 — +3% Attack, +2% lifesteal`. The x/2 is live and turns green at 2/2.

**A quest can no longer name a potion you cannot find** *(Steam forum, nanook, `.11`
— this one IS in the depot build, listed for context)*

**Seed Vault** *(`.17`)*
Seeds live in their own uncapped store instead of the satchel, shown at the top of
the Farming tab. Hovering one gives the same card a satchel row gives. A **Sell
seeds** toggle carries the sell path that left with them.

**Satchel is bigger** *(`.17`)*
Base 28 → 33, per-purchase step 8 → 10, ceiling 268 → 333. Cost curve untouched.
With 18 seed ids leaving too, a fresh save has **23 more usable slots**.

**Gold and silver coins are painted art** *(`.17`)*
Were flat solid discs. Generated in SwarmUI on the monster-art recipe and judged at
13/15/20px, which is where four earlier attempts died. 8.5 KB for both.

---

## Under the hood

- `.12` — quest reachability now uses the game's own `buildSourceMap` instead of a
  hand-rolled index that produced 78 false positives.
- `.18` — asserted the seed-vault hover by dispatching a real `mouseover`.

---

## Traps worth carrying forward

- **The build stamp must never repeat.** `.1`–`.9` of 0.9.122 shipped back in August
  before the release realignment, which is why this run started at `.10`.
- **`_audit_tests.js` test bodies inside ``ev(`...`)`` are template literals.** A lone
  `\s` is not an escape there — it collapses to `s`, so `/\s+/g` silently becomes
  `/s+/g` and deletes every letter s in the string under test. Bit three times.
- **`ancient_seed` is both a Lv80 crop and an alchemy input** (Philosopher's Drop,
  Master Healing Elixir). Moving seeds out of `state.items` made both uncraftable
  until `matHave` and the recipe spend learned to read the vault.
- **Commit `b4435eb`'s message is permanently stale.** It says Steam is on v0.9.120,
  which was true the day it was written. Ask Jordan, or read the memory file.

---

## Outstanding

1. **Rebuild and upload to Steam.** Depot is seven builds behind. Flow is in the
   `steam-depot-upload` memory: bump the wrapper `package.json`, copy the html,
   `npm run dist` (never `dist:public`), grep the asar for `cvChannel` + the banner,
   then steamcmd twice (the first run is eaten by its own self-update).
2. **The seed vault has not been played on a real save.** It is the biggest save-shape
   change in the batch. Migration is guarded and tested under jsdom, but worth a
   human look before it reaches the depot.
3. **Ticket #56 — more sockets on higher-tier rings.** Undecided. Jewellery is
   hardcoded to 1 socket (`if(JEWELRY_GEM_TIER[itemId]) return 1;`). A tiered version
   is up to 6 extra gem slots across a loadout, feeding Attack/Max HP/Defence — a real
   power bump, not just convenience.
4. **Patch notes still say "painted art" / "687 items repainted".** Jordan asked for
   "New Artwork" wording instead, to match the cover art. The Steam and Discord drafts
   need reissuing, and the seed vault + satchel change need adding.
5. **Cover art is done** — `Cindervale Store Assets\update-0.9.122\2026-09-05\`
   holds `event-header-1920x622.png`, `event-cover-800x450.png`, `discord-960x540.png`.
