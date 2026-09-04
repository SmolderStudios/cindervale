/* Shoot the injected art where it actually lives — the running game, real size.
 *
 *     node _iconart/ingame.js            every surface -> _iconart/_ingame/*.png
 *     node _iconart/ingame.js satchel    just one
 *
 * A contact sheet is a lie about scale: it shows a 128px painting where the game
 * draws a 20-31px tile. The only honest check is the panel a player looks at, with
 * a full satchel, a full loadout, and the shop and crafting lists that reuse the
 * same iconHTML(id) call. deviceScaleFactor 2 so the shot is legible when zoomed
 * without changing the CSS pixel size anything is laid out at.
 *
 * Everything is driven through the game's own globals (rightTab / viewTab /
 * selectedSkill / invCat) and a renderAll(), which is exactly what the tab buttons
 * do — no private paths, so a shot that looks right is the real UI looking right.
 */
'use strict';
const path = require('path'), fs = require('fs');
const KIT = 'C:/Users/Jordan/Desktop/cindervale-trailer-kit';
const puppeteer = require(KIT + '/node_modules/puppeteer-core');
const CHROME = KIT + '/browsers/chrome/win64-151.0.7922.71/chrome-win64/chrome.exe';

const ONLY = process.argv[2] || null;
const OUT = path.join(__dirname, '_ingame');
const FILE = path.join(__dirname, '..', 'cindervale.html');

/* [name, what to set up, which element to shoot] */
const SHOTS = [
  ['01-satchel-all',    { right: 'satchel', cat: 'all' },      '#rightPanel'],
  ['02-satchel-gear',   { right: 'satchel', cat: 'gear' },     '#rightPanel'],
  ['03-satchel-ores',   { right: 'satchel', cat: 'ores' },     '#rightPanel'],
  ['04-satchel-cooked', { right: 'satchel', cat: 'cooked' },   '#rightPanel'],
  ['05-satchel-potions',{ right: 'satchel', cat: 'potions' },  '#rightPanel'],
  ['06-satchel-jewelry',{ right: 'satchel', cat: 'jewelry' },  '#rightPanel'],
  ['07-gear-loadout',   { right: 'gear' },                     '#rightPanel'],
  ['08-shop',           { skill: 'smithing', view: 'shop' },   '#centerPanel'],
  ['09-smithing',       { skill: 'smithing', view: 'acts' },   '#centerPanel'],
  ['10-crafting',       { skill: 'crafting', view: 'acts' },   '#centerPanel'],
  ['11-cooking',        { skill: 'cooking',  view: 'acts' },   '#centerPanel'],
  ['12-alchemy',        { skill: 'alchemy',  view: 'acts' },   '#centerPanel'],
  ['13-compendium',     { skill: 'mining',   view: 'comp' },   '#centerPanel'],
  ['14-full-window',    { right: 'satchel', cat: 'all', skill: 'smithing', view: 'acts' }, null],
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
    args: ['--force-device-scale-factor=1', '--hide-scrollbars'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1745, height: 1150, deviceScaleFactor: 2 });
  await page.goto(require('url').pathToFileURL(FILE).href + '?cvdev=1', { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 3000));

  /* One of everything in the satchel, every skill high enough that no recipe row is
     greyed out, and the best combat piece per slot actually worn — a loadout the art
     has to survive at doll size as well as tile size. */
  const seeded = await page.evaluate(() => {
    state = defaultState();
    state.charName = 'Probe'; state.charType = 'wanderer'; state.tutorialSeen = true;
    normalizeState();
    for (const k in SKILLS) state.xp[k] = XP_CUM[95];
    state.combatXp = { attack: XP_CUM[95], strength: XP_CUM[95], defence: XP_CUM[95],
                       hitpoints: XP_CUM[95], magic: XP_CUM[95], ranged: XP_CUM[95] };
    state.coins = 5e9;

    /* Room for the stock, or the satchel renders as a cramped over-capacity list and
       the tiles the art has to survive at never appear. */
    state.satchelUpgrades = 40;
    state.slayer = state.slayer || {}; state.slayer.pockets = 400;

    /* A believable mid-game satchel rather than one of everything: 573 stacks is 58
       pages of pagination and tells you nothing about how a real grid reads. */
    const STOCK = ['pine_log','oak_log','ironbark_log','ember_log','frost_log','shadow_log','ancient_log',
      'copper_ore','tin_ore','iron_ore','coal','gold_ore','mithril_ore','silver_ore','cobalt_ore',
      'runite_ore','starsteel_ore','bronze_bar','iron_bar','steel_bar','gold_bar','silver_bar',
      'mithril_bar','cobalt_bar','runite_bar','starsteel_bar','molten_bar','voidsteel_bar',
      'raw_minnow','raw_trout','raw_salmon','raw_shark','raw_swordfish','cooked_shark','cooked_swordfish',
      'troll_stew','wolf_jerky','salt_cod','wildberries','bloodcap','thornvine','dewleaf','emberbloom',
      'nightbloom','starfern','sapphire','emerald','ruby','diamond','cut_ruby','cut_sapphire','cut_diamond',
      'void_crystal','pearl','healing_draught','greater_healing_draught','swiftness_potion_i',
      'wolf_pelt','drake_hide','demonhide','rough_leather','wolf_leather','drake_leather',
      'rat_fang','wolf_fang','beast_sinew','shade_ember','voidheart','ember_dust','gem_dust',
      'charcoal','tarred_rope','kelp_frond','krakenbone','siren_scale'];
    STOCK.forEach(id => { if (ITEMS[id]) state.items[id] = 137; });
    for (const id in ITEMS) state.discovered[id] = 1;

    /* Own everything the shop and crafting lists can show, so nothing renders locked. */
    state.gear = SHOP.map(i => i.id);

    /* Top tier per combat slot. The field is `cslot` + `ctier` — `slot` belongs to the
       SHOP entries, which is why an earlier pass equipped nothing at all. */
    const best = {};
    for (const id in ITEMS) {
      const it = ITEMS[id];
      if (!it || !it.cgear || !it.cslot) continue;
      if (!best[it.cslot] || (it.ctier || 0) > (best[it.cslot].t || 0)) best[it.cslot] = { id, t: it.ctier || 0 };
    }
    state.combatEquipped = {};
    for (const slot in best) {
      state.combatEquipped[slot] = best[slot].id;
      state.items[best[slot].id] = (state.items[best[slot].id] || 0) + 1;
    }
    mmFinishStart(1, false);
    return { stacks: Object.keys(state.items).length, cap: satchelCap(),
             worn: Object.keys(state.combatEquipped).length };
  });
  await new Promise(r => setTimeout(r, 2500));

  await page.evaluate(() => {
    document.querySelectorAll('#gameMenuModal,#mmSettingsModal,#mmEaModal,#tutOverlay,#obDock,#questDock')
      .forEach(e => e && e.classList.add('mm-hidden'));
  });

  for (const [name, setup, sel] of SHOTS) {
    if (ONLY && !name.includes(ONLY)) continue;
    await page.evaluate(s => {
      if (s.right) rightTab = s.right;
      if (s.cat !== undefined && typeof invCat !== 'undefined') invCat = s.cat;
      if (s.skill) selectedSkill = s.skill;
      if (s.view) viewTab = s.view;
      renderAll();
      document.querySelectorAll('#gameMenuModal,#tutOverlay,#obDock,#questDock')
        .forEach(e => e && e.classList.add('mm-hidden'));
    }, setup);
    await new Promise(r => setTimeout(r, 900));
    const file = path.join(OUT, name + '.png');
    const el = sel ? await page.$(sel) : null;
    if (el) await el.screenshot({ path: file }); else await page.screenshot({ path: file });
    const n = await page.evaluate(() => document.querySelectorAll('img.art-item').length);
    console.log(name.padEnd(22) + (n + ' art images on screen'));
  }

  await browser.close();
  console.log('\nseeded: ' + JSON.stringify(seeded) + '  ->  ' + OUT);
})().catch(e => { console.error(e); process.exit(1); });
