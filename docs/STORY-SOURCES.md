# The story's sources, inventions and save migration

Appendix to [`STORY.md`](STORY.md). Every scene's `source` field in `src/campaign/chapters/` gives
its references in short form; this page says which texts those references point to, how much of
each scene is history, and what happened to old saves.

## What was available

- **The brief** for the rewrite (Robert de Clari as the viewpoint; Villehardouin and Niketas
  Choniates as supplementary voices; the list of episodes to remove).
- **Alessandro Barbero's lecture on the Fourth Crusade** (an Italian transcript, `barbero - 4a
  crociata.txt` in the repository root, added after the first version of this rewrite; the text
  is in it twice, one copy after the other). It
  tells the crusade through the same three witnesses and is used for: the **period words** the
  dream's characters speak (below), the start of the fire of 1203 at the mosque (7.5) and
  Niketas's flight from the city (7.8). Barbero renders the chronicles in Italian; lines the game
  takes from those renderings are English versions of his Italian, marked "after Barbero" below,
  not quotations of an edition.
- **Not available:** the second transcript the brief names, `barbero - sogno nel medioevo(1).txt`
  (not in the repository, on `main` or on the build machine). Nothing in the game relies on it.
  The Professor's lines are original writing in a lecturer's voice, not quotations of any
  lecturer.
- **The chronicles**, read online in English translation (below). Page and chapter references in
  the game are to these editions only. Where a passage could not be checked, it is marked
  unverified here and the game treats the scene as adaptation.

## Editions consulted

| Text | Edition read | How the game cites it |
|---|---|---|
| Geoffroi de Villehardouin, *The Conquest of Constantinople* | Tr. Frank T. Marzials, *Memoirs of the Crusades* (Everyman's Library, J. M. Dent, 1908), as transcribed in the Internet Medieval Sourcebook: `sourcebooks.fordham.edu/basis/villehardouin.asp` | "VILLEHARDOUIN P. n" = page of the Dent edition as marked in that transcription. |
| Robert de Clari, *The Conquest of Constantinople* (excerpts) | D. C. Munro, *Translations and Reprints from the Original Sources of European History* III.1, in the Internet Medieval Sourcebook: `sourcebooks.fordham.edu/source/clari1.asp` (chapters XI–XIII, XVI–XVII, XXXIII, LVI, LIX, LXXII–LXXIII) | Roman chapter numbers, "(MUNRO)". |
| Robert de Clari, complete | "Robert of Clari's account of the Fourth Crusade", De Re Militari (`deremilitari.org/2014/01/robert-of-claris-account-of-the-fourth-crusade/`, and the older `deremilitari.org/RESOURCES/SOURCES/clari1–4.htm`). The page does not name its translator. | Arabic chapter numbers, "(DEREMILITARI)". |
| Niketas Choniates, the sack of 1204 | Munro, *Translations and Reprints* III.1, pp. 15–16, in the Internet Medieval Sourcebook: `sourcebooks.fordham.edu/source/choniates1.asp` | "CHONIATES, THE SACK (MUNRO PP. 15-16)". |
| Niketas Choniates, the destroyed statues | English excerpt at `myriobiblos.gr/afieromata/1204/choniates2_en.html` (cites "op. cit., pp. 647–51"; translator not named) | "CHONIATES, DESTROYED MONUMENTS (PARAS. n)". |

Clari chapters 49–60 and 82–90 of the De Re Militari text were not read closely; no scene
relies on them.

## How true is each part

Categories used below and in the `source` fields:

- **Attested** — the event or detail is in a consulted source.
- **Claim** — a chronicler's own figure or judgement, presented as his (Clari's numbers; Clari's
  "no mischief was done"; his "strict truth").
- **Kept disagreement** — two sources differ and the game shows both.
- **Lecture** — the Professor's framing: original lines, no quotations.
- **Adaptation** — invented for the game: every dream transformation, every Greenzone face,
  every task Zampanò performs, and all dialogue not listed under "Quotations".

### Kept disagreements (on purpose)

| Point | One source | The other |
|---|---|---|
| Still owed to Venice after the collections (3.2, 5.5) | Villehardouin: 34,000 marks (pp. 15–16) | Clari: 50,000, then 36,000 (XI–XII) |
| The fleet contract | Villehardouin: 85,000 marks (pp. 6–7) | Clari 6: 87,000 (not used in game text) |
| Whom the pope absolved after Zara (5.4) | Villehardouin: the pilgrims (pp. 26–27) | Clari 15: "all the pilgrims and all the Venetians" |
| The deaths of January 1204 (7.6) | Villehardouin: Alexios IV strangled, Isaac dies (pp. 55–56) | Clari 61–62: Mourtzouphlos has both strangled |
| The taking of the city (7.8) | Clari 80: "no mischief was done to poor or to rich" | Choniates: "No one was without a share in the grief" |

### Quotations in the game

Only these phrases are quoted (in `source` fields, cards or Professor lines); everything else
said by a historical person in the game is original dialogue.

| Phrase | Where it comes from | Used in |
|---|---|---|
| "knelt at the feet of the people, weeping many tears" | Villehardouin p. 8 | 3.3 source |
| "a great cotton hat" | Villehardouin p. 17 | 3.4 source (card: "sewn on his great cotton hat") |
| "on the part of the Pope of Rome" | Villehardouin p. 21 (the abbot of Vaux) | 5.1 source |
| "more than forty people told him" | Villehardouin pp. 41–43 | 7.2 source and the marshal's line |
| "Thus was there division between the Greeks and the Franks" | Villehardouin pp. 51–52 | 7.5 source |
| "No one in the army knew this plan, except the leaders" | Clari XIII (Munro) | 3.4 source and card |
| "none save the men of highest estate" | Clari 13 (De Re Militari) | paraphrased by the Professor, level 4 |
| "whereby all the pilgrims and all the Venetians were absolved" | Clari 15 | 5.4 source |
| "Bah! What have we to do in Constantinople?" | Clari 31–33 (Pierre d'Amiens's camp at Corfu) | 6.3 |
| "a good work of great merit" | Clari 39 (the bishops) | 6.3 source |
| "copper pots and with pestles" | Clari 45 | 7.3 source |
| "turn back one step" | Clari 47 | 7.3 source |
| "his own transport to carry his horses" | Clari 13 | 3.1 source |
| "it seemed as if our warriors were angels" | Clari 47 (the ladies at the palace windows) | 7.3 source; Zampanò's version in 8.4 |
| "portrayed and written" | Clari 92 (the pillars) | 7.4 source |
| "no mischief was done to poor or to rich" | Clari 80 | 7.8 card and source; the Professor, level 7 |
| "No one was without a share in the grief" | Choniates (Munro pp. 15–16) | 7.8 card; the Professor, level 7 |
| "Robert of Clari, knight"; "the strict truth" | Clari 120 | 2.3 and 8.2 sources; the Professor, level 8 |

The Doge's rebuke of Alexios IV (Clari LIX, "wretched boy, we have raised you from the mire") is
paraphrased in 7.5, not quoted.

### Period words (after Barbero)

Words and turns of phrase the witnesses use, as Barbero explains or renders them in his lecture.
They are coloured amber in the dialogue box (`OLD_WORDS` in `src/story/names.ts`; a test checks
that each is spoken in the dream).

| Word | What Barbero says | Who says it in the game |
|---|---|---|
| THE HOLY VOYAGE, THE GENERAL PASSAGE | "Crusade" is a modern word; they said *il santo viaggio* or *il passaggio generale* | Fulk (2.2); Aleaume (2.3) |
| CRUCESIGNATI | The Latin sources' *crucesignati*, "signed with the cross": a cross sewn on the clothes when you vow to go | The clerk at the list (2.2) |
| PILGRIMS | What the witnesses called themselves | Aleaume (2.3) and throughout |
| MESSIRE | *Messer* Pierre d'Amiens, as Clari names his lord | Zampanò (2.3) |
| DROMONS, UISSIERS | Clari's technical names for the ships at Venice: "the rich ships, the great dromons and the *uissiers* to carry the horses, and the galleys" | Pierre (3.1); the transports' marvel text; Watson (4.2) |
| A WEIGHT OF SILVER | The mark was not a coin but a weight of silver (about a quarter of a kilo) | The marshal (3.2) |
| OUR COMPANY | The Doge's offer, after Villehardouin: "as long as our company lasts", conquests and booty shared half and half | The marshal (3.2) |
| IN THRALL TO THE TURKS, OUTREMER | The envoys' plea at Saint Mark's, after Villehardouin: Jerusalem "in servaggio dei Turchi", "the Holy Land of Oltremare" | The marshal; the weeping in 3.3 |
| THE LOMBARD | Boniface of Montferrat, "a Lombard, as they would have said" | The cook (6.2) |
| LI RIKE HOMME, LI POVRE CHEVALIER | Clari's two worlds in his northern French: the rich men, and "we", the poor knights | Aleaume (6.1); Zampanò at the pile (7.9) |
| IN GOD'S NAME (AT A WALK) | Pierre d'Amiens to his men, after Clari: "ride, in God's name, at a walk" | Pierre (7.3) |
| THOSE OF THE WEST, LATINS, BARBARIANS | Niketas's names for the crusaders; they shave, so they look young | Niketas (7.1) |
| ROMANS | What the Byzantines call themselves | Niketas (7.1) |
| THE YEAR 6711 | Niketas dates the arrival "the beginning of July 6711", counting from the creation of the world | Niketas (7.1) |
| ON THE SAINTS | Before the last assault they made everyone swear "on the saints" | The bishop (7.7) |
| MERVEILLE | Clari's word, coming back again and again in his pages on the city | Zampanò, looking (7.8) |

Lines taken from Barbero's renderings: the Doge's "for a year and a half no merchant of mine has
traded" (3.4, after Clari); "Lord God, keep them today, and all their company" (7.3, the camp
watching Pierre, after Clari); the axe-bearing barbarians, Danes and English (7.2, Niketas's name
for the Varangian guard); "these things the armies of the West did to a Christian people" (7.8,
after Niketas).

### Told by Barbero, not checked in an edition

- Niketas's flight from the city (7.8), from Niketas's account as Barbero tells it: his palace
  burned in 1203, so he shelters with friends in a house with a dark entrance; a Venetian friend
  keeps the looters away and leads them out; the girls smear mud on their faces and walk in the
  middle; a crusader drags a girl into a house; other crusaders who speak a little Greek help;
  Niketas reminds the man of the oath to leave women alone and he lets her go. The game keeps
  that shape; Zampanò's call and Jack's part are invented.
- The start of the fire of 1203 (7.5): crusaders set out to burn the mosque of the city's Muslim
  quarter, the Greeks come to defend their Muslim neighbours, and in the fight the fire starts
  that burns the Forum of Constantine and part of the Hippodrome.

### Invented

- Niketas visiting with the crusaders, his courtyard, the lamp and the purple cushion.

### Scene-by-scene status

| Scene | Attested core | Adaptation |
|---|---|---|
| 1.0–1.5 | — (reality; the lecture only plants names and numbers) | All. 1.5's cloth cross follows Villehardouin pp. 1–4. |
| 2.1 | The leaders' secret objective, Egypt (Villehardouin p. 8; Clari XIII) | Jerusalem's gate, the helmet. |
| 2.2 | Fulk's preaching; Écri; the counts take the cross; six envoys (Villehardouin pp. 1–4) | The vow in the lulls; the clerk's list. |
| 2.3 | Pierre d'Amiens is Clari's lord; Aleaume his brother, a clerk (Clari 75–76, 120) | The borrowed armour, the road, the charge. |
| 3.1 | Too few came (Clari XI, a claim in its numbers); horse transports (Clari 13); other ports (Villehardouin pp. 13–16) | The side door; the bell; Meraviglia. |
| 3.2 | The treaty terms and sums (Villehardouin pp. 6–7, 15–16; Clari XI–XII) | The collecting bowl round. |
| 3.3 | The envoys weep before the people, 1201 (Villehardouin pp. 7–8) | Playing it as a recollection. |
| 3.4 | The island, the food threat, Zara, secrecy (Clari 10–13 / XI–XIII); the Doge takes the cross (Villehardouin pp. 16–17) | The bread seller; the eavesdropping. |
| 4.1 | *Veni Creator* from the ships' castles (Clari 13); sailing October 1202 (Villehardouin p. 19) | The beat game; Watson. |
| 4.2 | Horse transports exist (Clari 10, 13) | The whole task. |
| 4.3 | Zara and the arrival on the eve of Saint Martin (Villehardouin pp. 16, 19–20; Clari 13–14) | The rumours. |
| 5.1 | The abbot's prohibition; the divided host (Villehardouin pp. 20–21); Zara's papal letter (Clari 14) | Carrying the messages; the choice. |
| 5.2 | Siege, surrender, division of the city (Villehardouin pp. 21–22) | The ladder, the bolt of cloth. |
| 5.3 | The fray between Venetians and pilgrims (Villehardouin p. 22; Clari 15) | The three speeches; the choice. |
| 5.4 | Envoys to Rome; the absolution (Villehardouin pp. 26–27; Clari 15) | The writing table (LetterGame). |
| 5.5 | Wintering at Zara; no money for Egypt (Clari 13, 16 / XVI) | The sail, the board. |
| 6.1 | Desertions; a ship to Syria (Villehardouin pp. 25–26); hardship (Clari XVI) | Rations, dice, the shared loaf. |
| 6.2 | The young Alexios's offer; only twelve swear (Villehardouin pp. 23–25); Boniface knew him (Clari XVII) | The trail of talk. |
| 6.3 | Corfu; Pierre's camp wants to stay; the chiefs kneel; Michaelmas; Pentecost sailing (Villehardouin pp. 27–30; Clari 31–33, 39) | Zampanò's advice. |
| 7.1 | The city watching; the prince shown and not recognised (Clari 40–41; Villehardouin pp. 35–36) | Niketas on the walls; the rowing. |
| 7.2 | 17 July 1203; the Doge and the standard (Villehardouin pp. 41–45); Arras-sized fire (Clari 46) | Following the banner; carrying word. |
| 7.3 | Pierre and Saint-Pol go on; pots and pestles; the ladies; Flanders rejoins (Clari 45–48); Alexios III retires (Villehardouin pp. 43–45) | The nerve gauge; Santina's face. |
| 7.4 | Alexios III flees; Isaac restored; Alexios IV crowned 1 August 1203 (Villehardouin pp. 45–48); the Lion's Mouth palace (Clari 80); the pillars (Clari 92); the Hercules (Choniates) | The visit; the courtyard and lamp. |
| 7.5 | Unpaid sums; the Doge's rebuke (Clari LVI, LIX); riot and two-day fire (Villehardouin pp. 48–53); the mosque (Barbero) | The chests; the woman led home. |
| 7.6 | The defiance at Blachernae; fire-ships; Mourtzouphlos's coup (Villehardouin pp. 53–56; Clari 61–62) | The walking rule; Bagnaskiz's crown. |
| 7.7 | The oath on booty, women and clergy (Clari 68); the failed Friday, absolution, the breach and the foot (Clari 70–79); 12 April 1204 (Villehardouin pp. 59–63) | The tug; the voice or the rattle. |
| 7.8 | Clari 80; Choniates's sack; Niketas's flight and the girl let go (Barbero, after Niketas) | Zampanò's call; Jack. |
| 7.9 | Treasure under guard, coarse silver for poor knights (Clari 81, 105); Aleaume's share (Clari 98); a knight hanged for keeping things back (Villehardouin pp. 65–66); statues melted (Choniates) | The lamp; the walk; the pile scene. |
| 8.1–8.4 | Clari's "strict truth" (8.2) | All. |

## Save migration

Saves are versioned (`CampaignState.version`, `campaign/state.ts`). Version 1 is the earlier
anthology dream (43 scenes); version 2 is this story (37). A version-1 save is migrated the first
time the game reads it (`migrateV1`, unit-tested in `tests/campaign.test.ts`):

- **Kept:** the scenes whose meaning did not change — 1.0 (the Green Zone walk), 1.2, 1.3, 1.4 —
  with their flags (`pawOffered`, `longWay`, `santinaBall`), their lecture scraps and remembered
  lines; coins, play time and the last-saved date. A save from before the walk became 1.0 that had
  reached 1.1 counts 1.0 as walked.
- **Played again:** 1.1 and 1.5 (rewritten) and every dream scene. Meters start fresh (with the
  kept 1.3 choice's own −3 Supervillain if he offered the paw); the book, values, items and
  marvels are emptied; the rag cross and the armour are earned again in 1.5 and 2.3; the ending
  flag is cleared.
- **Nothing is lost:** the untouched version-1 save is copied once to the storage key
  `supervillained:story-v1-backup` before the migrated save replaces it.
- **Told once:** when any played scene is being replayed, CONTINUE (or the story menu) first shows
  THE DREAM HAS BEEN REWRITTEN, saying what was kept; the notice is then cleared and saved.
- COUCH, the story menu and replays read the migrated save like any other; replays still play on a
  copy and save nothing.
- **A save this game cannot read** (written by a newer version, or with no or a garbled version)
  is not migrated: the game starts a fresh story, but the save is first copied once, untouched, to
  `supervillained:story-unknown-backup` (never overwritten by a later one), so a newer build can
  still recover it.
