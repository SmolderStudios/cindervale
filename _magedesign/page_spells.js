/* The Magic design page: the sixteen spells, which open section 04. */
'use strict';

exports.spellsHTML = function (c, h) {
  const { R, MD } = c, S = R.spells, SS = R.sizeSummary, sizes = S.sizes;
  const B = R.best, bf = l => B.find(x => x.label === l);

  /* the spellbook: element by size, with the first Magic level each can be cast at */
  const grid = MD.ELEMENTS.map(e => [[h.el(e.k), '']].concat(sizes.map(s => [`${e.n} ${s.n} <span class="d">Magic ${Math.max(e.lvl, s.magic)}</span>`, 'nm'])));
  const sizeRows = sizes.map((s, i) => [[s.n, 'nm'], [s.runes, 'new'], [i ? `${s.rune} Runes or better` : 'any rune', 'm'], [s.runesNamed.join(', '), 'm'],
    [`Magic ${s.magic}`, 'm'], [`${s.weapon.replace(' Wand', '')} wand or staff, the first that can load ${s.rune} Runes`, 'd'], [`Runecrafting ${s.rn}`, 'd']]);
  const powRows = S.table.map(r => [[`${r.name} Rune`, 'nm'], [r.tier === 11 ? 'Spire' : 'T' + r.tier, 'm']]
    .concat(sizes.map((s, i) => i < r.cls ? [(i === r.cls - 1 ? '+' + r.sizes[i] : '+' + r.sizes[i]), i === r.cls - 1 ? 'new' : 'm'] : ['', '']))
    .concat([[r.arrow, 'd'], [r.batch ? '&times;' + r.batch : 'drop', 'm']]));

  /* what a size is worth: the staff rows of the weapon-alone test */
  const worth = [];
  R.sizes.filter(z => z.fam === 'staff').forEach(z => {
    worth.push({ grp: `Lv ${z.lv} &middot; ${MD.WOODS[z.tier - 1].n} Staff &middot; ${z.rune}s${z.matched ? '' : ', one tier above the staff'}` });
    z.rows.forEach((r, i) => worth.push([[r.name, 'nm'], [r.size, 'm'], ['+' + r.pow, 'm'], [r.hit, 'm'], [r.ofBig + '%', i ? 'm' : 'new'], [r.raw + '%', 'd'],
      [i ? r.lasts + ' times as long' : 'the measure', 'm'], [i ? r.stackDmg + ' times' : '', i ? 'has' : 'm'], [r.newNet + '%', 'm'], [r.finNet + '%', i ? 'm' : 'new']]));
  });
  const realRows = R.fights.map(f => [[`Lv ${f.lv}`, 'm'], [f.mon, 'nm'],
    [f.sizes.map(z => `${z.name} ${z.ofBig}%`).join(' &nbsp;&middot;&nbsp; '), 'new'], [f.sizes.map(z => h.n(z.spentHr)).join(' &nbsp;&middot;&nbsp; '), 'm'], [f.sizes.map(z => h.n(z.killsHr)).join(' &nbsp;&middot;&nbsp; '), 'd']]);
  const surge = bf('  + Fire burning: Faultline');
  const bis = [['Surge', 4, surge]].concat([['Wave', 3, 'wave'], ['Blast', 2, 'blast'], ['Bolt', 1, 'bolt']].map(x => [x[0], x[1], bf('size ' + x[2] + ': Faultline')]));
  const bisRows = bis.map((x, i) => [[`Fire ${x[0]}`, 'nm'], [x[1], 'm'], [h.n(x[2].s.hit), 'm'], [h.n(x[2].dps[500]), i ? 'm' : 'new'], [h.pct(x[2].dps[500], surge.dps[500]), i ? 'm' : 'new'], [i ? (4 / x[1]).toFixed(2).replace(/\.?0+$/, '') + ' times as long' : 'the measure', 'm']]);
  const bolt = bis[3][2];

  return `
  <p class="lead"><b>Sixteen spells.</b> Each element comes in four sizes: Bolt, Blast, Wave and Surge. A bigger spell spends more runes on every cast and hits harder. You pick the size with one button and the element with another, so Fire Blast and Fire Surge are two buttons apart, not two pages of a spellbook.</p>
  ${h.tbl(['', 'Bolt &middot; 1 rune', 'Blast &middot; 2 runes', 'Wave &middot; 3 runes', 'Surge &middot; 4 runes'], grid, { min: 760 })}
  <p class="tblnote">The level is the first Magic level that spell can be cast at: its element has to be open, and you have to be able to hold a weapon that can load a rune big enough.</p>
  <h3 class="sh">The four sizes</h3>
  ${h.tbl(['Spell', 'Runes a cast', 'Needs', 'Biggest spell of', 'First castable', 'Because', 'To carve them'], sizeRows, { min: 1000 })}
  ${h.facts([
      ['One rule', 'The rune decides the biggest spell it can power.', 'A size has no level of its own and no unlock to buy. Load a better rune and the next button lights up. A greyed button says what it is waiting for: <span class="game">Surge needs Starfall Runes or better.</span>'],
      ['The peg holds', 'The Magic Power on a rune is what its biggest spell gets.', 'That number is the strength of the arrow of the same tier, as it was. So nothing in section 03 moved: the weapon maths there are a mage casting the biggest spell the rune powers, and the simulator checks the two agree to the digit.'],
      ['A smaller spell', 'Spends fewer runes and gets less of the rune.', `Weapon alone, each size down costs ${SS.steps[0]} to ${SS.steps[1]}% of the damage and saves one rune a cast. The step is bigger early, when the rune is most of the hit, and smaller with good gear.`],
      ['If you never touch it', 'You cast the biggest spell your rune powers.', 'That is the default for every save, so a mage who ignores the bar is at full strength. The size and the element can be changed at any time, mid-fight included, and the change applies from the next cast. The last cast of a stack spends what is left.'],
      ['No gap for the archer to stand in', 'A rune one tier above the weapon gives its whole strength, as an arrow does.', `An archer with an Oak bow can load Steel Arrows. A mage with an Oak wand can load Char Runes and cast a Blast with them, which is why Blast starts at Magic ${sizes[1].magic} and not 20. A level gate on the sizes would leave the mage behind for those ten levels.`],
      ['The element is the same at every size', 'A Fire Bolt burns as a Fire Surge does.', 'The burn is a share of the hit and Shadow heals a share of the damage, so both grow with the spell on their own. Frost and Storm do not change.']
    ])}
  <h3 class="sh">What each rune puts into each spell ${h.meas}</h3>
  ${h.tbl(['Rune', 'Tier', 'Bolt', 'Blast', 'Wave', 'Surge', 'Arrow of the tier', 'One batch'], powRows, { min: 760 })}
  <p class="tblnote">Magic Power added to the cast. The last number in each row is the rune's own, and equals the arrow beside it. Read down a column: a better rune is never worse at the same spell. Read along a row: a bigger spell always gets more. Both are checks. A batch is ${MD.RUNE_BATCH} runes for each rune the biggest spell spends, so a full-size cast costs the same work at every tier.</p>
  <h3 class="sh">What a size is worth ${h.meas}</h3>
  <p class="lead">The weapon-alone test from section 03, with Fire on: the same mage casting each size its rune powers. "With the rune cost taken off" is damage for an hour of your own time, as a share of melee, counting the time it takes to make the runes.</p>
  ${h.tbl(['Spell', 'Runes a cast', 'Magic Power', 'Max hit', 'Damage, of the biggest', 'of melee', 'A stack lasts', 'and does in total', 'Cost taken off: new mage', 'finished mage'], worth, { min: 1100 })}
  <p class="tblnote">The last block loads a rune one tier above the staff, which is why it passes melee. An archer who loads Starfall Arrows into an Ancient bow gets the same lift, because the rune and the arrow are the same strength. A wand gives the same shares as a staff to within a point and spends 44% more runes at every size.</p>
  ${h.facts([
      ['What a small spell is for', 'Making a stack last, not earning more an hour.', `A stack cast as Bolts lasts up to four times as long and does ${SS.stretch[0]} to ${SS.stretch[1]} times the damage in total. But hour for hour the biggest spell wins: by ${SS.finGain[0]} to ${SS.finGain[1]} points for a finished mage, whose runes are nearly free, and a Bolt is never more than ${Math.max(0, SS.thrift[1])} point ahead even for a new mage who pays full price for every rune.`],
      ['So the advice is one line', 'Cast the biggest spell you can feed.', 'Which is what the default does. The smaller sizes are for the day the stack is short, for a mage levelling on runes someone else dropped, and for Sunder Runes.']
    ])}
  <h3 class="sh">On real monsters, and at best in slot ${h.meas}</h3>
  ${h.tbl(['', 'Monster', 'Damage, of the biggest spell', 'Runes spent an hour, nothing saved', 'Kills an hour'], realRows, { min: 860 })}
  <p class="tblnote">Forty simulated hours each, a staff in cloth of the tier, Fire on. A smaller spell loses a little less on a real monster than its max hit says, because less of each hit is wasted on a monster that is nearly dead.</p>
  ${h.tbl(['Faultline, Sunder Runes, everything on', 'Runes a cast', 'Max hit', 'Damage a second, Defence 500', 'of Surge', 'A stack lasts'], bisRows, { min: 860 })}
  <p class="tblnote">Sunder Runes come only from the Spire, so they are the one rune a finished mage can run short of. With the best gear the rune is a smaller share of the hit: a Fire Bolt keeps ${h.pct(bolt.dps[500], surge.dps[500])} of a Fire Surge and makes the stack last four times as long.</p>
  <h3 class="sh">The four elements</h3>`;
};
