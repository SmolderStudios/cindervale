/* Batch 4 — the 62 icons a full visual audit found were the WRONG PICTURE.
 *
 * WHERE THIS LIST CAME FROM. Every one of the 674 shipped icons was put on a labelled
 * contact sheet and judged by eye against its own display name — the pass picks.js has
 * always said was necessary ("verify.js has no idea whether the picture is of the right
 * THING") and which had never actually been run. 514 came back fine. 130 were called
 * weak, 29 flat wrong; a second, deliberately sceptical reviewer re-checked every flag
 * at full size and threw out 35 as over-flagging. What survived is this file.
 *
 * THE ONE FAILURE MODE, over and over. Z-Image-Turbo at cfg 2.4 answers the strongest
 * noun in the prompt from its own prior and ignores the qualifiers around it:
 *
 *     rat_fang        asked for a fang   -> drew a whole rat with one big tooth
 *     spinneret       asked for an organ -> drew a whole spider
 *     wyrmscale       asked for a scale  -> drew a dragon's head on a pile of scales
 *     abyssal_scale   "One scale — not a fish" -> drew a whole fish
 *     leviathan_scale "not a creature, not armour" -> drew a suit of armour
 *     moonstone_eye   asked for a gem    -> drew the actual moon, craters and all
 *     ogre_tusk       asked for a tusk   -> drew a gold boot
 *     riftcrusher     asked for a hammer -> drew a lit lamp post
 *     *_buckler       asked for "a small round buckler" inside a sentence starting
 *                     "A single shield..." -> drew five knight's heater shields
 *
 * Note the last one especially: the correcting words were all present and lost anyway.
 * The prior attaches to the FIRST strong noun, so putting "shield" at the front of a
 * buckler prompt loses every time no matter what follows.
 *
 * THE THREE RULES THAT FIXED THE HIDES, applied here:
 *   1. Describe the SHAPE concretely — something specific to draw.
 *   2. State the absence positively ("just the empty skin"), never as a bare negative
 *      ("no wolf"), which only reinforces the word.
 *   3. If a noun carries the wrong prior, DO NOT USE THAT NOUN. "Primitive tribal round
 *      war shield" fixed what "shield, no metal, no steel rim" could not.
 *
 * Style words belong in recipe.js STYLES.painted, not here. These are subject sentences.
 */
'use strict';
const S = (id, p, opt) => Object.assign({ id, p }, opt || {});

/* Powdered materials. "A small conical heap of X dust" produced a volcano (barrow), an
   open flame (ember), a solid crystal (gem) and a green slime (cursed): a cone with
   something bright at the top is the silhouette of a lot of things that are not dust.
   Anchoring it to a spilled pouch gives the pile a reason to be that shape. */
const DUST = 'A single small cloth pouch lying on its side with its drawstring open and'
  + ' a low spill of fine loose powder fanning out of the mouth onto nothing. The pouch'
  + ' is small and the spill is flat and wide. No flame, no fire, no smoke, no mountain,'
  + ' no crystal. ';

/* A buckler is a small round fist-shield. Every prompt that began "A single shield"
   produced a pointed heater regardless of the words after it, so the word is gone. */
const BUCKLER = 'A single small round metal disc held flat to the viewer, perfectly'
  + ' circular with a domed knob at its exact centre and a ring of rivets around the'
  + ' outer rim, a short leather grip strap visible at one edge. Circular all the way'
  + ' round — the outline is a plain circle, it does not narrow or come to a point'
  + ' anywhere. ';

const SUBJECTS = [

  // ── creature parts that came back as the whole creature ──────────────────────────
  S('rat_fang',      'A single small curved tooth lying on its own, ivory yellow, wide blunt root at one end tapering to a sharp point at the other, gently hooked. One loose tooth and nothing else — no animal, no head, no jaw, no body, no ears, no tail.'),
  S('rat_tail',      'A single long thin severed tail lying curled into a loose S on nothing, ringed with fine scaly bands along its whole length, thick and cut flat at one end, tapering to a fine tip at the other. A length of tail on its own — no animal, no head, no body, no legs.'),
  S('spinneret',     'A single small dark chitinous nozzle-like organ standing on its cut base, a short ribbed cone with a cluster of fine pale silk threads trailing from its narrow tip. One small body part on its own — no spider, no legs, no abdomen, no eyes.'),
  S('wyrmscale',     'A single large flat teardrop-shaped scale lying on its own, bronze-red, one rounded end and one pointed end, a raised ridge running down its middle and fine growth lines across it. One flat scale and nothing else — no dragon, no head, no eye, no pile of scales, no rosette.'),
  S('abyssal_scale', 'A single large flat teardrop-shaped scale lying on its own, deep blue-green and iridescent, one rounded end and one pointed end, faint concentric growth lines across the face. One flat scale and nothing else — no fish, no head, no eye, no fins, no tail.'),
  S('leviathan_scale','A single enormous flat teardrop-shaped scale lying on its own, slate blue-grey, one rounded end and one pointed end, deep coarse growth ridges running across it and a chipped edge. One flat scale and nothing else — no creature, no armour, no figure, no body wearing it.'),
  S('frostfur',      'A single loose clump of long white hair lying on nothing, the strands splaying outward from a soft matted middle, tipped with tiny pale frost crystals. A tuft of loose hair and nothing else — no animal, no head, no face, no ears, no eyes, no snout.', { pale: true }),
  S('alpha_claw',    'A single large curved talon lying on its own, glossy dark horn, thick and blunt where it was torn from the paw and narrowing to a needle point, one strong hook in its curve. One loose claw and nothing else — no paw, no foot, no animal, no crescent moon, no pair.', { dark: true }),
  S('goblin_ear',    'A single severed pointed ear lying flat on nothing, sickly green skin, one long tapering point at the top, a rounded lobe at the bottom, the inner whorl of the ear clearly modelled, a ragged cut edge where it was taken. One ear and nothing else — no head, no face, no leaf, no plant.'),
  S('ogre_tusk',     'A single thick curved tooth lying on its own, dirty cream and ivory coloured, very broad and hollow at the root end and tapering evenly along its curve to a worn blunt point, fine lengthwise cracks in the enamel. Bone-coloured, never yellow metal. One loose tooth and nothing else — no boot, no shoe, no animal, no jaw.'),
  S('pack_eye',      'A single amber eyeball on its own, a wet glossy sphere with a vertical slit pupil across it and fine red veins in the white, trailing a short stub of pale optic nerve at the back. One loose eyeball and nothing else — no head, no face, no mask, no muzzle, no ears, no animal.'),

  // ── objects that came back as the creature they are named for ────────────────────
  S('royal_rat_sigil','A single small round coin-like medallion of tarnished gold held flat and face-on, filling the frame, a raised rim around the edge and a tiny simple crown shape stamped into the flat centre. A flat stamped metal disc and nothing else — no animal, no rat, no figure standing on it.'),
  S('alpha_fang_ring','A single dark iron finger ring standing upright, the band a clear open circle with the hole through the middle plainly visible, one curved ivory tooth mounted crosswise on the top of the band as its setting. A ring and one tooth — no animal, no head, no face, no badge, no medallion.'),
  S('widow_crown',   'A single small dark metal circlet standing upright and empty, a plain narrow band with eight thin barbed spikes rising from it and curving inward like a cage, the open middle of the band clearly visible. A headpiece on its own — no spider, no body, no legs, nothing underneath it or wearing it.', { dark: true }),
  S('wolf_jerky',    'Three flat strips of dried dark red meat lying loosely stacked on nothing, each a long ragged-edged ribbon with a coarse fibrous grain running along it, dry and matte and slightly curled at the ends. Strips of dried meat and nothing else — no animal shape, no pelt, no hide, no head, no ears, no legs.'),

  // ── powders ──────────────────────────────────────────────────────────────────────
  S('barrow_dust',   DUST + 'The powder is fine ash grey with a faint cold pallor.'),
  S('cursed_dust',   DUST + 'The powder is dull grey-green and slightly clumped.'),
  S('ember_dust',    DUST + 'The powder is dark grey with individual grains glowing warm orange inside the pile, like cooling ash.', { dark: true }),
  S('gem_dust',      DUST + 'The powder is pale sparkling grit, faintly prismatic, like crushed glass.'),

  // ── bucklers: five heater shields where five round bucklers were asked for ───────
  S('bronze_buckler',   BUCKLER + 'Warm reddish brown-gold bronze.'),
  S('steel_buckler',    BUCKLER + 'Bright silver steel throughout, cool grey, no colour in the face.'),
  S('cobalt_buckler',   BUCKLER + 'Deep vivid blue cobalt metal.'),
  S('runite_buckler',   BUCKLER + 'Rich emerald green runite metal.'),
  S('starsteel_buckler',BUCKLER + 'Pale violet-white starsteel with a faint glow.'),

  // ── weapons whose head shape was lost ────────────────────────────────────────────
  S('troll_maul',       'A single two-handed sledgehammer standing upright, one heavy rounded boulder of grey stone lashed with cord to the top of a long straight wooden haft that runs down to the bottom of the frame. The head is a solid rounded lump of rock. No blade, no cutting edge, no axe, no crescent, nothing sharp anywhere.'),
  S('worldsunder_maul', 'A single two-handed sledgehammer standing upright and alone, one colossal square block of pale gold metal at the top of a long straight haft running down to the bottom of the frame. Just the weapon lying on nothing — no hand, no fist, no arm, no gauntlet, nobody holding it.'),
  S('voidsteel_hammer', 'A single blacksmith sledgehammer standing upright, one large heavy squared-off block of black metal at the top of a short thick handle, the block wider and deeper than the handle so it clearly reads as a mass. Violet light in the seams of the block. A hammer — not a staff, not a sceptre, not a wand, no crystal, no ball, no thin rod.', { dark: true }),
  S('riftcrusher',      'A single two-handed war hammer standing upright, one blunt heavy rectangular block of dark iron at the top of a long straight haft running down to the bottom of the frame, violet light bleeding from the cracks in the block. A hammer — not a lamp, not a torch, not a lantern, no shade, no flame, nothing lit on top.', { dark: true }),
  S('slagbreaker',      'A single two-handed war hammer standing upright on nothing, one blunt heavy rectangular block of dark iron at the top of a long straight haft, molten orange slag glowing in the block\'s cracks. Just the weapon on an empty background — no tile, no plaque, no panel, no square backing behind it.', { dark: true }),
  S('grave_cleaver',    'A single enormous two-handed greataxe standing upright and filling the whole frame top to bottom, one very broad curved blade at the top spanning most of the width, a long straight haft below it reaching the bottom edge. The haft is much longer than the blade is wide. Not a small hatchet, not a one-handed axe.'),
  S('crude_cleaver',    'A single heavy butcher\'s cleaver standing upright, one broad flat rectangular iron blade at the top with a straight chopping edge along the bottom of it and a chipped corner, a short rag-wrapped grip below. A flat rectangular chopping blade — not a mallet, not a hammer, not a gavel, no rounded head, no barrel shape.'),
  S('cobalt_dagger',    'A single dagger standing upright, point at the top, one narrow tapering blade above a short straight crossguard, and BELOW the guard a short round grip ending in a small ball pommel. The part below the guard is a plain handle, not a second blade, and does not come to a point. Deep vivid blue cobalt blade.'),
  S('gravesteel_dagger','A single dagger standing upright and alone on an empty background, point at the top, one narrow tapering pale grey-green blade, straight crossguard, short grip with a green gem in the pommel. Just the dagger floating on nothing — no tile, no plaque, no panel, no coloured square behind it.'),

  // ── armour pieces that drew the wrong garment or the whole body ──────────────────
  S('emberforged_aegis',  'A single rigid metal breastplate hanging empty and alone, a hard curved chest shell of blackened iron with a raised centre ridge, flared plate edges at the shoulders and a plain cut-off waist, orange forge light in its seams. Rigid plate metal with hard edges — no sleeves, no arms, no cuffs, no cloth, no fabric folds, no soft hem.', { dark: true }),
  S('emberforged_greaves','A single pair of armoured leg plates standing upright side by side and nothing else, each one a curved shell of blackened iron running from the knee down to the ankle with an orange-glowing band at the knee. Only the two leg pieces — no torso, no chest, no breastplate, no shoulders, no arms, no head, no body.', { dark: true }),
  S('ember_helm',         'A single soft leather hood standing empty, turned three quarters toward the viewer so the wide OPEN MOUTH of the hood is clearly visible as a dark hollow opening with the far inner wall behind it, soft creased folds down the sides, charred black hide cracked with ember orange. A hollow open hood — not a solid dome, not a bell, not an egg, nothing filled in.', { dark: true }),
  S('chitin_plate',       'A single rigid curved chest shell standing empty and upright, built from overlapping hard glossy insect plates in chestnut amber, each plate\'s edge raised and catching light, a scalloped lower rim. Hard shiny shell segments — not leather, not cloth, no lacing, no cords, no belt, no buckles.'),
  S('wolf_legs',          'A single pair of leg wraps standing upright side by side, each one a padded tube of brown hide with a grey fur cuff at the top, running from the knee down and ending in a plain flat open hem at the ankle with nothing below it. Open-ended leg coverings — no feet, no toes, no heels, no soles, not boots, not shoes.'),
  S('ogre_gloves',        'A single pair of forearm bracers standing upright side by side, each a wide cuff of thick pale grey hide wrapping the forearm, laced up the front, open at both ends. Plain tubes of hide — no fingers, no thumbs, no hands, not gloves, not gauntlets.'),
  S('iron_runners',       'A single pair of low soft leather running shoes standing side by side and alone on nothing, dark brown leather with a narrow iron strap across each ankle. Just the two shoes floating on an empty background — no tile, no plaque, no white panel, no square backing, no silhouettes.'),

  // ── cloth that came back as tile, coal or a person ───────────────────────────────
  S('voidweave',   'A single loose rectangle of cloth lying draped on nothing, soft rounded folds rippling across it, one corner turned over on itself and the edges frayed into loose threads. Near-black fabric with violet light in the deeper folds. Limp hanging cloth — no figure, no person, no body, no tile, no square panel, no plaque.', { dark: true }),
  S('emberweave',  'A single loose rectangle of cloth lying draped on nothing, soft rounded folds rippling across it, one corner turned over on itself and the edges frayed into loose threads. Charred black fabric with ember orange light in the deeper folds. Limp hanging cloth — no rock, no coal, no lump, no crust, nothing solid or cracked.', { dark: true }),

  // ── gems and stones that drew the thing they are named after ────────────────────
  S('moonstone_eye',  'A single small polished gemstone held up alone, a rounded milky blue-white cabochon with a soft sheen sliding across its domed face and a thin dark bezel of metal around its base. A little jewel — not the moon, no craters, no lunar surface, no glowing disc in the sky, and no eyeball.'),
  S('moonpetal',      'A single open flower on a short green stem with two narrow leaves, six long slender white petals radiating evenly from a small pale centre, faintly luminous. A botanical bloom — not a moon, not a crescent, nothing curved or horned.', { pale: true }),
  S('cut_bloodstone', 'A single polished domed cabochon gemstone resting on nothing, deep opaque green stone flecked with small scattered blood-red spots spread evenly over its whole surface, one soft highlight near the top. A plain smooth stone — no eye, no pupil, no iris, no white, nothing looking back.'),
  S('void_shard',     'A single jagged splinter of near-black glass standing on its broken end, sharp angular facets, thin violet light bleeding along its fractured edges only. The body of the shard stays dark and the light is violet — no orange, no yellow, no fire, no ember, nothing burning.', { dark: true }),
  S('void_cinder',    'A single small lump of burnt black rock lying on nothing, an irregular knobbly cinder with a rough pitted crust, violet light glowing from the cracks in its surface. A shapeless burnt lump — not a keyhole, not a lock, no round ball on a stalk, no tapering shaft.', { dark: true }),
  S('chitin_shard',   'A single broken splinter of hard insect shell lying on nothing, a flat curved sliver of glossy dark amber with a sharp jagged fracture along one edge and a smooth ridged outer face. A hard broken flake — not a flame, not a fire, nothing glowing, no tongues, no licking edges.'),
  S('ember_crest',    'A single curved bony plate standing on end, a broad flat shield-shaped piece of bone with three raised spiny ridges fanning up its face and a ragged torn edge at the base, ember orange light in the grooves between the ridges. A flat ridged plate — not a bone, not a femur, no rounded knobs at the ends, nothing dumbbell shaped.'),
  S('rib_plate',      'A single long curved rib bone lying on nothing, a slender flattened arc of pale bone bowing smoothly from one end to the other, broad and flat where it was cut from the spine and narrowing to a thin blunt tip. A flat curved arc — not a straight limb bone, no round knobs, no lobed joints at the ends, nothing dumbbell shaped.'),
  S('crown_fragment', 'A single broken piece torn from a gold crown, one short curved section of band with two bent spires still on it, both ends ripped and jagged where the rest of the circle snapped away, one empty socket where a stone has fallen out. A broken fragment that does not close into a circle — not a whole crown, not a complete circlet, not symmetrical, nothing intact.'),
  S('tidewrought',    'A single fist-sized lump of fused blue-green sea glass and pink coral resting on nothing, a rounded irregular nugget with coral branches growing out of its surface and faint light in its depths. A rough lump of stone and coral — no hand, no fist, no fingers, no knuckles, nothing anatomical.'),

  // ── the rest ─────────────────────────────────────────────────────────────────────
  S('ironfang_claws', 'A single narrow leather wrist strap seen flat from the front with four long curved iron blades fixed along it and splaying outward like talons, each blade tapering to a needle point well clear of the strap. Four bare pointed blades on a band — not a glove, no fingers, no thumb, no hand, nothing enclosing.'),
  S('voidmoss',       'A single loose tuft of moss lying on nothing, a low spreading mat of fine dark fronds and tiny curled leaves splayed outward from a soft centre, near black with faint violet light between the strands. Soft plant matter — not a stone, not an egg, no smooth shell, no hard surface, no orange glow.', { dark: true }),
  S('tarred_rope',    'A single thick rope coiled flat into a spiral of three or four visible turns lying on nothing, the twisted three-strand lay of the rope clearly readable along every turn, black and sticky with tar, one cut end resting on top. Coiled rope with visible twist — not a blob, not a bean, no smooth featureless shape, no slit.', { dark: true }),
  S('eclipse_satchel','A single leather shoulder bag hanging closed, a soft rounded body with a buckled flap folded down over the front and a long strap looping up above it, charcoal leather ringed with a thin cold white glow. A closed bag with a flap and a strap — not a tub, not a bucket, not a pot, nothing open at the top, nothing glowing inside.', { dark: true }),
  S('cooked_swordfish','A single cooked fish lying side on, head to the left, golden brown grilled skin with dark char bars, and one long straight sharp bill projecting forward from its snout as far again as its head is long. The long spear-like bill is essential and must be clearly visible — without it this is the wrong fish.'),
  S('salt_cod',       'A single split and flattened fish fillet lying flat and open like a board, butterflied down the middle so both halves lie in one plane, stiff and dry, pale cream flesh crusted with coarse white salt, tail still attached at the narrow end. A flat dried slab — not a whole rounded fish, no eye, no fins, nothing plump or three dimensional.', { pale: true }),

  // ── colour drift: right object, wrong palette ───────────────────────────────────
  S('steel_cape',     'A single hanging cloak seen from the front, heavy vertical folds, a clasp at the throat. The cloth is cold grey steel-coloured from top to bottom, silver-grey and metallic. No red, no crimson, no maroon, no warm colour anywhere in it.'),
  S('starfall_bar',   'A single long rectangular cast metal ingot lying flat at a raised three quarter angle, the metal white-hot pale silver-blue with an inner glow, tiny sparks lifting from its top face and a cold blue-white rim light. Pale silver-blue and luminous — not gold, not yellow, not orange, nothing brassy.'),
  S('voidsteel_bar',  'A single long rectangular cast metal ingot lying flat at a raised three quarter angle, near-black metal with bright violet rift light glowing along its seams and edges. The light is violet and only violet — no orange, no gold, no yellow, no warm glow anywhere, and the top face is not lit.', { dark: true }),
  S('cinderguard',    'A single tall shield seen face on, ash grey iron, with a bright band of live orange embers glowing along its outer rim and warm firelight spilling onto the grey face from that rim. The rim must be visibly hot and orange against the cold grey body.'),
];

module.exports = { FAMILIES3D: { audit_fixes: SUBJECTS } };
