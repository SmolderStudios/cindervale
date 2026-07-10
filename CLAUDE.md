# Cindervale Idle

A dark-fantasy idle/incremental RPG. Solo developer (Jordan). Distributed via Electron, Steam port planned, hosted live via GitHub Pages at `https://smolderstudios.github.io/embervale/embervale.html`.

**Renamed from "Embervale Idle" in v0.9.12** — an unrelated idle RPG called Embervale already exists on Steam. The rename is **display-only**. These are identifiers, not branding, and renaming any of them orphans every player's save:
- `SAVE_KEY = 'embervale_save_v2'` and `DEVICE_KEY = 'embervale_device_id'` (localStorage)
- `UI_SCALE_KEY = 'embervale_ui_scale'`
- `app.setName('embervale-idle')` in the wrapper — owns `%APPDATA%/embervale-idle`
- the repo name / Pages URL — every installed wrapper polls it on launch
- `appId` in the wrapper's `package.json` — changing it makes NSIS install a *second* app rather than upgrading in place

## Architecture

**Single self-contained HTML file**: `embervale.html` contains all game logic, CSS, data, and rendering inline. Vanilla JS/HTML/CSS, no dependencies. ~12k+ lines. Save data in `localStorage` with multi-slot support (`_c1`, `_c2`, `_c3` keys).

**Section navigation**: code is organized with `[CSS-NN]` and `[JS-NN]` banner tags. Use grep to navigate (`grep -n "JS-12" embervale.html`).

**Save system**: `normalizeState` runs on every load to migrate existing saves non-destructively. Any new state field MUST be guarded in `normalizeState` with a sensible default. Never break existing saves.

## Working file conventions

- Edit `embervale.html` in this directory directly.
- `version.json` mirrors the version string in the HTML banner — keep them in sync.
- **Pre-release versioning (changed 2026-07):** work stays in **`0.9.x`** (beta). `1.0.0` is reserved for the full release — never ship `1.0.0` or higher until then. Increment the zero-padded patch every release: `0.9.01` → `0.9.02` → … The prior scheme was `1.0.x` (ended at `1.0.106`). The Electron wrapper updates on a plain string-inequality (`remoteVer !== localVer`), so the downgrade to `0.9.01` still triggers auto-update for existing installs.
- Version lives in **one** spot inside the HTML: the UI `<div class="mm-ver">` banner. (The JS-ICONS header carries a `v1.0.28` stamp — that is a section-origin marker, not the live version, and has not tracked releases since.)

## Validation pipeline (MANDATORY before every commit)

Every change must pass this pipeline before being committed:

1. **Edit** `embervale.html` via str_replace (no rewrites, surgical changes only).
2. **Syntax check**: extract the `<script>` block with Python regex, run `node --check` on it.
3. **Smoke test**: jsdom boot test with 2500ms boot delay, `dom.window.eval()` against the extracted script. Verify all affected render surfaces don't throw.
4. **Version bump**: increment patch number in both the UI div and JS-ICONS header. Update `version.json` to match.
5. **Commit + push**: `git add -A && git commit -m "v1.0.X: <summary>" && git push`. GitHub Pages auto-deploys in ~30s.

jsdom setup: `new JSDOM(html, { url:'http://localhost/', runScripts:'dangerously', pretendToBeVisual:true })`. Boot delay 2500ms before assertions.

Never ship without `node --check` + jsdom passing.

## Skills system

12 skilling skills: woodcutting, mining, fishing, foraging, smithing, cooking, alchemy, firemaking, agility, jeweler, farming, crafting.

6 combat stats: attack, strength, defence, hitpoints, magic, ranged. (Magic/Ranged are currently SOON placeholders in the combat panel.)

Each skill has a **98-point passive tree** — hard invariant, verified on boot. Simulate tree allocations in Node before shipping any tree change.

## Combat system

12 zones: Rat Warrens → Demon Sanctum, plus Thornwood Thicket, Frostfang Tundra and Ashen Steppe. Each zone has standard monsters + a boss. Rare monster spawns (0.4%–2.5% scaling by level) seed the Pets collection (9 zone-specific familiars). Monster Log sub-tab tracks kills/drops.

**Combat Mastery tree** (`cmast` prefix throughout — do NOT collide with skilling `state.mastery`): 37 nodes across melee/ranged/magic + hybrid bridge columns. Points from level-ups, milestones, first boss/zone clears. Surplus banks as Mastery Shards. **Node effects deferred** — allocations persist but don't yet modify combat formulas (next major TODO).

**Drop rarity tiers** (gate skilling tool tiers T3/T4/T5):
- `beast_sinew` — rare drop from low-level monsters
- `shade_ember` — rare drop from high-tier mobs
- `voidheart` — very rare drop from bosses

Cross-zone scaling is intentional — e.g. `beast_sinew` at 0.1% on basic rats, 3% on rat queen, 6% on silkweaver queen. Prevents early-zone farming of high-tier mats.

**Common drop balance**: ~45-65% no-drop rate on weaker monsters; consolation gold on no-drop. Rare drop multipliers are **proportional** (×4 capped at 85%), not additive — never turns extreme rares into commons.

## Icon system (MANDATORY rules)

- Every new monster, zone, item, or combat entity gets a **custom inline SVG**. **Never emoji.**
- Register in `ICONS` const with `class="ev-icon"` (sizes to 1em from parent font-size), `64×64` viewBox, gradient-rich, dark-fantasy palette.
- All render sites use `iconHTML(id)`. Never the legacy `.icon` field.
- Tiered item families: one base silhouette, palette swaps per tier. Magical tiers get glow halos. Starsteel/void get sparkle points.
- `textContent` sites (toasts) intentionally retain emoji — SVG markup renders as literal text there. Use `innerHTML` everywhere else.
- CSS `attr(data-tip)` tooltips cannot render SVG — plain emoji or text only in tooltip strings.

## Code conventions (costly to relearn)

- `DROPS` (not `RARE_DROPS`) for drop table const.
- `XP_CUM[N]` (not `xpFor()`) for level XP lookups.
- `combatPanel` (not `cmbPanel`) for DOM panel ID.
- Farming uses `CROPS` + `harvestPatch()` with `seedReturn`. `fa#` drop keys are vestigial dead code.
- `cmast` prefix for all combat mastery state/functions (avoid collision with skilling `state.mastery`).
- New skill tree prefixes must not collide — verify with grep before implementing.
- `reqPts` field on tree nodes enables points-spent gating (GM pinnacle tier). Enforced in buy logic and UI lock-reason display.
- 98-point tree invariant is hard. Simulate allocations in Node before shipping any tree change.
- `_swordSVG` is taken by fishing swordfish icon. Weapon generator must use `_swordSVGwpn`.
- Inventory category `invCat='all'` surfaces crafted gear (cgear items go to `'misc'` via `itemCat()`).
- `state.discovered[id]=1` required for compendium entries to appear.

## Balance principles

- Skill tree dead zones (idle points between base-tier completion and GM unlock) are a known issue across several skills — flagged but not yet resolved.
- Gathering skills have lower `minMs` floors than processing — gathering is the bottleneck in dual skilling pairs.
- Dual skilling: both skills target ~70% of solo-focused XP/hr regardless of which side is the bottleneck.
- Rare spawn rates use proportional multipliers (×4, capped at 85%), never additive.

## On the horizon

- Combat Mastery node effects (wire allocations into actual combat formulas)
- T6 skilling tools (Lv 95): multi-attribute bonuses beyond speed/XP — rare drop boost, double-output chance, resource preservation
- Ember Dust alchemy uses (currently "coming soon" in Cinder Sage tooltip)
- Combat-tier crafting recipes using monster drops
- Magic/Ranged combat skills (currently SOON placeholders)
- Farming: Moonflower/Moonpetal and Voidbloom/Voidmoss naming unification

## Distribution

- **GitHub Pages** hosts the live HTML at `https://smolderstudios.github.io/embervale/embervale.html`.
- **`version.json`** at the same origin is what the Electron wrapper checks each launch.
- Electron wrapper fetches the latest HTML, caches to userData, loads cached copy. Falls back to last-good cache when offline.
- Steam build: the wrapper's GitHub-fetch path is disabled — Steam owns updates via depot system.

## Working style

- Communication is **terse and directive**. Implement without preamble once direction is established. User identifies issues by behavior; find root cause and fix.
- **Preview before commit** for significant visual changes (icons, UI restructures). Get approval, then integrate.
- **Batch by category**: icons by item family per session. New features planned and proposed before implementation.
- **Course corrections are normal** — adapt without friction. If a feature is rejected after implementation, revert cleanly.
- **No file ships** without `node --check` + jsdom passing.

## Discord patch notes format

When asked for patch notes: bold emoji section headers, `━━━` horizontal dividers, plain gray monospace code blocks for was/now tables (NOT red/green diffs), bold prose outside code blocks. Content splits at ~2000 chars (Discord limit). Deliver as raw markdown in 4-backtick fences to prevent premature rendering.
