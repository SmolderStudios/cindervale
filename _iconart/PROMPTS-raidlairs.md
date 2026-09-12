# Raid backdrops and boss lairs

Eight plates. Two per gauntlet: the **backdrop** you fight the first stages in, and
the **boss lair** that replaces it when you reach the final stage. The Sundered
Spire already has its backdrop and has no final boss, so it needs neither.

**Why the raids need these at all.** The arena reads `ZONE_BG[raid.id]`, and not one
of the four gauntlets has an entry, so a raid fight today happens against plain
black while every ordinary zone gets its painted backdrop. The backdrop plate also
becomes the lair behind that raid's row in the selection menu.

Save into `icons-inbox`, then:

```bash
node _iconart/injectmon.js --bg icons-inbox/barrow_raid.png    sunken_barrow
node _iconart/injectmon.js --bg icons-inbox/barrow_boss.png    sunken_barrow_boss
node _iconart/injectmon.js --bg icons-inbox/ember_raid.png     emberforge
node _iconart/injectmon.js --bg icons-inbox/ember_boss.png     emberforge_boss
node _iconart/injectmon.js --bg icons-inbox/abyssal_raid.png   abyssal_throne
node _iconart/injectmon.js --bg icons-inbox/abyssal_boss.png   abyssal_throne_boss
node _iconart/injectmon.js --bg icons-inbox/empyrean_raid.png  empyrean_throne
node _iconart/injectmon.js --bg icons-inbox/empyrean_boss.png  empyrean_throne_boss
```

The raid ids are `sunken_barrow`, `emberforge`, `abyssal_throne`,
`empyrean_throne`. Note `emberforge`, not `emberforge_deep`. I wire `arenaPlace()`
to reach for the `_boss` plate on the final stage and fall back to the raid's own
backdrop, so a missing boss lair costs nothing.

## Three rules behind every one of these

1. **The bottom third is where the creature stands.** The arena puts it 32% up from
   the floor with the health panel under it, so that band has to be empty, flat and
   the DARKEST part of the picture. `injectmon --bg` cover-crops keeping the bottom,
   so it is guaranteed to survive the crop.
2. **The middle band carries the whole read.** The selection row crops a thin
   horizontal strip around 40% height, and the zone card crops at `center 40%`. If
   the landmark is not in that band, both surfaces show an empty wall.
3. **Dark, low contrast, no focal point.** A creature is drawn on top and type is
   laid over it. Every one of these should feel underexposed. The boss lairs may be
   a little more dramatic than the backdrops, since you only ever see one at a time.

---

# The four raid backdrops

## 1. The Sunken Barrow, the flooded approach

````
Paint a single background plate for a dark-fantasy RPG combat arena, in TALL
portrait format (2:3, 1024x1536). A creature will be drawn on top of it in the
lower middle, so this picture has to LOSE that fight on purpose.

THE PLACE: the flooded approach to a warrior king's tomb, drowned when a dam broke
an age ago. A low barrow passage on squat stone pillars, black still water standing
knee deep the whole way, silt gone black on every surface. Rows of empty burial
niches cut into the walls, most of their slabs slipped and half sunk. Tree roots
have come through the roof and hang in the wet air.

PALETTE: waterlogged. Silt grey, drowned brown stone, tarnished bronze gone dull,
and a cold steel blue green only in the light from above and its reflection on the
water (#4a9a8a at its brightest). No algae green, nothing vivid.

RULES:
- Low contrast, soft haze, lots of depth. No focal point anywhere.
- The MIDDLE third holds the niches and the slipped slabs. Some views of this
  picture show only that band, so it has to say "tomb" on its own.
- The bottom third is flat black standing water and a low silt bank. Nothing
  interesting there, and it is the darkest part of the picture.
- Darker overall than a normal painting: it sits behind lit creatures on a dark
  screen.
- No creatures, no people, no skeletons, no text, no frame, no border, no watermark.
- Painted in the same hand as the creature art. Not a photo, not a 3D render.
````

## 2. The Emberforge Deep, the works

````
Paint a single background plate for a dark-fantasy RPG combat arena, in TALL
portrait format (2:3, 1024x1536). A creature will be drawn on top of it in the
lower middle, so this picture has to LOSE that fight on purpose.

THE PLACE: the working floor of a vast underground forge, drowned an age ago and
lit again. Rows of cold anvils, a broken casting channel running across the floor
with a slow thread of molten metal still in it, enormous leather and iron bellows
collapsed against one wall, chains and hooks hanging from a soot black roof. Fire
cracked basalt everywhere and hammered iron plate gone brown.

PALETTE: soot and cooling metal. Black basalt, brown burnt iron, grey clinker and
ash. Heat shows ONLY as thin seams and the casting channel (#ff7a1e at its
brightest, and only there). Do not light the whole hall orange, or the creatures
standing in it will vanish into it.

RULES:
- Low contrast, heavy soot haze, lots of depth. No focal point anywhere.
- The MIDDLE third holds the bellows, the chains and the anvils. Some views of this
  picture show only that band, so it has to say "forge" on its own.
- The bottom third is a flat floor of cooled grey slag. Nothing interesting there,
  no molten channel crossing it, and it is the darkest part of the picture.
- Darker overall than a normal painting: it sits behind lit creatures on a dark
  screen.
- No creatures, no people, no text, no frame, no border, no watermark.
- Painted in the same hand as the creature art. Not a photo, not a 3D render.
````

## 3. The Abyssal Throne, the colonnade

````
Paint a single background plate for a dark-fantasy RPG combat arena, in TALL
portrait format (2:3, 1024x1536). A creature will be drawn on top of it in the
lower middle, so this picture has to LOSE that fight on purpose.

THE PLACE: a colonnade where the world is beginning to wear through. Black stone
pillars march away from the viewer, and the further back they go the less of them
there is: a capital missing, a shaft that stops and starts again, a section of the
ceiling ended in a clean straight edge with flat nothing behind it. Bone white
inlay runs through the black floor in long thin lines that break where the hall
breaks.

PALETTE: matte black that swallows light, bleached bone, drained grey. A cold
violet only in the gaps where the hall has ended and in the thin light they throw
forward (#8040c0 at its brightest). The stone carries no colour of its own.

RULES:
- Low contrast, lots of depth. No focal point anywhere.
- The MIDDLE third holds the failing pillars and the first clean straight edges.
  Some views of this picture show only that band, so it has to say "this place is
  being erased" on its own.
- The bottom third is flat black polished floor. Nothing interesting there, and it
  is the darkest part of the picture.
- Darker overall than a normal painting: it sits behind lit creatures on a dark
  screen.
- No creatures, no people, no text, no frame, no border, no watermark.
- Painted in the same hand as the creature art. Not a photo, not a 3D render.
````

## 4. The Empyrean Throne, the burnt nave

````
Paint a single background plate for a dark-fantasy RPG combat arena, in TALL
portrait format (2:3, 1024x1536). A creature will be drawn on top of it in the
lower middle, so this picture has to LOSE that fight on purpose.

THE PLACE: the nave of a cathedral that has been burned from the inside. A
colonnade of sun bleached marble runs back into haze, every pillar scorched black
down one side as though something too bright passed through. Old gold leaf flakes
off the capitals. Broken halo rings, cracked and out of true, hang in the air over
the aisle on nothing. Fine white ash hangs in the light.

PALETTE: bone white and bleached marble, ash grey, scorched black. Old gold only as
thin flaking leaf on the capitals and the rings (#ffcf5a at its brightest, and only
there). The light comes from deep behind the colonnade, so the foreground reads as
silhouette and the room reads DARK. Do not make a bright golden picture, or a pale
creature standing here disappears.

RULES:
- Low contrast in the foreground, one softly blown out area far at the back only.
  No focal point in the lower half.
- The MIDDLE third holds the scorched pillars and the hanging rings. Some views of
  this picture show only that band, so it has to say "burnt cathedral" on its own.
- The bottom third is a flat ash grey marble floor. Nothing interesting there, and
  it is the darkest part of the picture.
- Darker overall than a normal painting: it sits behind lit creatures on a dark
  screen.
- No creatures, no people, no angels, no text, no frame, no border, no watermark.
- Painted in the same hand as the creature art. Not a photo, not a 3D render.
````

---

# The four boss lairs

Same format and the same three rules. These are the last room, so they may be a
little more composed than the backdrop, but the bottom third stays empty and dark
and the boss itself is never drawn.

## 5. The Barrow Warden's burial chamber

````
Paint a single background plate for a dark-fantasy RPG boss arena, in TALL portrait
format (2:3, 1024x1536). A huge armoured creature will be drawn on top of it in the
lower middle, so this picture has to LOSE that fight on purpose.

THE PLACE: the burial chamber at the end of a drowned barrow. An empty stone bier
stands on a low stepped platform in the middle distance, its lid slid off and lying
broken in the water. Around it a ring of standing grave markers, each carved as a
helmed guard, all of them worn faceless. Behind everything, the breach the flood
came through: a torn hole in the barrow wall with black water still weeping out of
it. Silt, river weed gone black, and drowned bronze grave goods scattered under the
surface.

PALETTE: waterlogged. Silt grey, drowned brown stone, tarnished bronze gone dull,
and a cold steel blue green only in the light through the breach and its reflection
(#4a9a8a at its brightest). No algae green, nothing vivid.

RULES:
- Low contrast, soft haze, real depth. The bier is the landmark, not a bright spot.
- The MIDDLE third holds the bier, the ring of markers and the breach.
- The bottom third is flat black standing water and a silt bank. Nothing
  interesting there, and it is the darkest part of the picture.
- Darker overall than a normal painting: it sits behind a lit creature on a dark
  screen.
- No creatures, no people, no skeletons, no figure on the bier, no text, no frame,
  no border, no watermark.
- Painted in the same hand as the creature art. Not a photo, not a 3D render.
````

## 6. Ignar's furnace heart

````
Paint a single background plate for a dark-fantasy RPG boss arena, in TALL portrait
format (2:3, 1024x1536). A huge creature will be drawn on top of it in the lower
middle, so this picture has to LOSE that fight on purpose.

THE PLACE: the heart of a rekindled forge. The great furnace stands open in the
middle distance, a black arched mouth banded with iron, and the light inside it is
deep and low rather than blazing. In front of it a tyrant sized anvil on a stone
block, and a shallow trough of molten metal running behind. The roof is lost in
soot. Broken chain hangs from above where something heavy used to be lifted.

PALETTE: soot and cooling metal. Black basalt, brown burnt iron, grey clinker and
ash. Heat shows only in the furnace mouth, the trough and thin cracks in the floor
(#ff7a1e at its brightest). The hall itself stays dark. Do not flood the room with
orange, or the creature standing in it disappears into the wall.

RULES:
- Low contrast, heavy soot haze, real depth. The furnace mouth is the landmark, and
  it is dim inside, not a lamp.
- The MIDDLE third holds the furnace mouth, the anvil and the hanging chain.
- The bottom third is a flat floor of cooled grey slag. Nothing interesting there,
  no trough crossing it, and it is the darkest part of the picture.
- Darker overall than a normal painting: it sits behind a lit creature on a dark
  screen.
- No creatures, no people, no smith, no text, no frame, no border, no watermark.
- Painted in the same hand as the creature art. Not a photo, not a 3D render.
````

## 7. Xor'Vael's dais

````
Paint a single background plate for a dark-fantasy RPG boss arena, in TALL portrait
format (2:3, 1024x1536). A huge seated creature will be drawn on top of it in the
lower middle, so this picture has to LOSE that fight on purpose.

THE PLACE: the end of the world, indoors. A raised empty dais of black stone stands
in the middle distance, and immediately past it the hall simply stops: floor, walls
and ceiling all end in clean straight edges with flat nothing behind them, as
though a piece has been cut out of the picture and taken away. Broken pillar
sections and slabs of floor hang motionless in that nothing, not falling. Bone
white inlay in the black floor runs toward the dais and is sheared off where the
hall ends.

PALETTE: matte black that swallows light, bleached bone, drained grey. Cold violet
only in the nothing itself and the thin light it throws forward (#8040c0 at its
brightest). The stone carries no colour of its own.

RULES:
- Low contrast, real depth. The dais is EMPTY and is a silhouette, not a highlight.
- The MIDDLE third holds the dais, the shorn edge and the hanging debris.
- The bottom third is flat black polished floor. Nothing interesting there, and it
  is the darkest part of the picture.
- Darker overall than a normal painting: it sits behind a lit creature on a dark
  screen.
- No creatures, no people, no figure on the dais, no throne occupied, no text, no
  frame, no border, no watermark.
- Painted in the same hand as the creature art. Not a photo, not a 3D render.
````

## 8. Aureon's throne of dead suns

````
Paint a single background plate for a dark-fantasy RPG boss arena, in TALL portrait
format (2:3, 1024x1536). An enormous creature will be drawn on top of it in the
lower middle, so this picture has to LOSE that fight on purpose.

THE PLACE: the sanctuary at the end of a burnt cathedral. An empty throne built out
of fused dead suns stands on a low stepped platform in the middle distance, its
spheres cracked, dark and cold. Behind it the far wall has burned through into a
wound of white light, and the throne is a black silhouette against it. Enormous
halo rings, cracked and out of true, hang above on nothing. Marble steps sun
bleached to bone, gold leaf flaking off the edges, fine white ash falling through
the light.

PALETTE: bone white and bleached marble, ash grey, scorched black. Old gold only as
thin flaking leaf on the throne and the rings (#ffcf5a at its brightest, and only
there and at the edge of the tear). THE LIGHT IS BEHIND EVERYTHING, so the whole
foreground reads as silhouette and the room reads dark. This is the trap on this
one: do not make a bright golden picture, or a pale creature standing here
disappears.

RULES:
- Low contrast in the foreground, one blown out area behind the throne only. No
  focal point in the lower half.
- The MIDDLE third holds the throne, the rings and the wound of light behind them.
- The bottom third is flat ash grey marble floor. Nothing interesting there, and it
  is the darkest part of the picture.
- Darker overall than a normal painting: it sits behind a lit creature on a dark
  screen.
- No creatures, no people, no figure on the throne, no angels, no text, no frame,
  no border, no watermark.
- Painted in the same hand as the creature art. Not a photo, not a 3D render.
````
