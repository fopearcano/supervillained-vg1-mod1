# SUPERVILLAINED — the story (canonical)

This is the story the game plays: chapter files `src/campaign/chapters/ch1.ts` … `ch8.ts` are its
implementation, and where this document and the code disagree the code is a bug. Sources,
editions, what is attested and what is invented, and how old saves are migrated:
[`STORY-SOURCES.md`](STORY-SOURCES.md).

## Premise

Zampanò is a small Maltese dog in a neighborhood where every other dog can walk straight to the
water bowl and he cannot. Bagnaskiz, the pug, takes a toll at the bowl; Jack mimics him; Watson
drags the bowl out of reach; Santina only wants her ball back. His father, the Professor, is a
medieval historian rehearsing a lecture on the Fourth Crusade.

Zampanò falls asleep under the Professor's desk with a rag cross on his back and dreams **one
story: the Fourth Crusade, 1202–1204**, from the preaching in Champagne to the sack of
Constantinople. He dreams it from the position of **Robert de Clari, a minor knight of Picardy**:
a man who signs up, is counted, is told little, follows his lord, sees marvels, gets the coarse
silver, and later writes it all down "the strict truth" as he understood it. The leaders' room
belongs to **Geoffroi de Villehardouin**, the marshal, who signed the contracts and tells the
story of agreements kept and broken. The city's side belongs to **Niketas Choniates**, a
Byzantine official and historian, who watches the strangers arrive, loses his house and writes
the sack as grief. The three accounts are kept distinct and are allowed to disagree.

The dream does not make Zampanò a hero of history. It makes him a small knight who learns how
little a small knight decides, what a promise costs, and that the most honest thing he can bring
home is a story told at his real size. He wakes *supervillained*: with character. On the lawn he
walks the direct path to the bowl beside his friends, and Bagnaskiz steps aside.

Two things never happen: nothing physical comes back from the dream, and no other crusade or
dream cuts in. 1203 and 1204 are kept apart, and the three emperors called Alexios are kept
apart: Alexios III (who flees in 1203), the young Alexios IV (the prince on credit, crowned 1203,
strangled January 1204) and Alexios V Mourtzouphlos (who takes the throne in 1204 and flees).

## Who is who

| Greenzone | In the dream | Notes |
|---|---|---|
| Zampanò | a small knight of Picardy, in Robert de Clari's place | Not Clari himself: the dream borrows Clari's position (his lord, his brother, his share). |
| Confusione | Aleaume of Clari, a clerk, Robert's brother | Calls him "brother". The breach (7.7) is Aleaume's deed, not Zampanò's. In his mail from the breach on (7.7, 7.9: its rattle guides Zampanò; at the pile he claims a knight's share). |
| Sbrimbrulòn | Pierre d'Amiens, his lord | The walk beside Pierre (7.3) is the dream's emotional centre. |
| Bagnaskiz | the marshal, Geoffroi de Villehardouin; also the faces of Alexios III and Alexios V | "The dream runs out of faces": the bully gets every crown. |
| Watson | a Venetian sailor; a companion in the city | Still says "MAN". |
| Jack | the lad who wants the helmet on the road (2.3), rumours on deck, the dice at Zara, crossed fingers at the oath, the looter in 7.8 | The camp's worst impulses; invented. In arms from the oath before the assault (7.7, 7.8). |
| Santina | a woman on the walls (7.3) | Her words are lost in the wind; answered at her gate (8.4). |
| The Professor | himself; asides at the end of each level | Lecture voice: "YOU UNDERSTAND". |
| — | the Doge Enrico Dandolo, "an old, blind, very shrewd dog" | |
| — | Niketas Choniates, as himself | No lawn face: "the dream has no face to lend him". |
| — | the young Alexios (IV), Fulk of Neuilly, the abbot of Vaux, a bishop, envoys, a clerk, a cook, a sailmaker | Figures of the crowd. |

## Systems, as the story uses them

- **Commozione** (being moved): filled by wonder, weeping and caring; fades a little at the start
  of every dream scene (levels 2–7); big actions spend it: speaking up at Zara (5.1), sharing the
  last ration (6.1), calling the pilgrims to their oath (7.8). An unmoved Zampanò cannot act.
- **Supervillain** (character): rises with nerve, comradeship and kept oaths; at the end it decides
  whether he can be pushed off the lawn.
- **Grace**: the *forms* he swore to or was given — his vow (2.2), the pope's prohibition at Zara
  (5.1, 5.3), the oath before the assault (7.7), declaring what he picks up (7.9). Breaking a form
  costs Grace even when every authority forgives. It measures observance, not divine favour, and
  shows in how straight he tells the story in 8.2 and in the ending.
- **Standing**: what the camp and its leaders think of him; dissent costs Standing, not the level.
- **Meraviglia**, the book of marvels (opened in 3.1): what he looks at with wonder. In 8.2 every
  marvel turns out to be furniture of the study that the dream borrowed (`campaign/home.ts`). The
  book's last marvel is **an empty pedestal**: splendour becomes something taken, melted, missing.
- **Costumes**: the rag cross (1.5, real: he carries it on his back); in the dream it becomes a
  coat of mail two sizes too big, worn from 2.1 (the helmet that slips is the bucket of 1.1); the
  arms, a sword and a shield, come at 2.3 (the `knight` mark: sword and shield in fights). The
  vow (2.2) is recorded as the `sermon` mark.
- **Remembered lines** ("THERE WAS A …, AND IT WAS …"): the dream's grammar, collected in the book.
- **Fighting** (adaptation): BARK from the start, SWORD and SHIELD once he wears the borrowed
  armour (2.3). Nobody dies: beaten foes are *routed*, and a knocked-down Zampanò starts the
  fight again. Fights: Jack's lads and Pierre's squires (2.3), the Zara brawl, where a sword blow
  on a Christian costs Grace (5.3), the stand by the Doge's banner (7.2). The assault on the
  emperor's army (7.3) stays without a blow, and the breach (7.7) stays Aleaume's deed.
- **Period words**: the dream's characters speak a few of the witnesses' own words (the holy
  voyage, *crucesignati*, pilgrims, *messire*, dromons and *uissiers*, *li rike homme* and *li
  povre chevalier*, Latins and barbarians, the year 6711, *merveille*…), taken from Barbero's
  lecture and coloured amber in the dialogue box. The list and where each comes from:
  `STORY-SOURCES.md`, "Period words".

## The scenes

Each row: what the player does → what it changes; the historical basis (details and exact
references in `STORY-SOURCES.md`); what the dream makes of it. *Adaptation* = invented for the game.

### Level 1 — The Greenzone (reality)

| Scene | Play → consequence | Basis | Dream / invention |
|---|---|---|---|
| 1.0 The Green Zone | The walk in the park (`SPEC.md`): treats, pee, cats, Bagnaskiz. The treats lie here and there in small groups, like Sonic's rings (160; a poop every ~29 eaten, so 5 for all of them). Coins go to the purse. **The band's ambush** (the owner's design): Bagnaskiz, Jack and Watson are out of sight; from a quarter of the way their voices ("HE'S COMING! HE'S COMING!", "GET READY!") come from off-screen, more and more often; when Zampanò reaches the middle a big "NOW!" fills the screen and, in that same moment, they rush in from outside the view, from the sides, barking, frighten him (frozen for a moment), poop all around him and run off. He cleans up with his pee. | — | Reality: the bullying that defines him. |
| 1.1 A bucket on his head | Wakes from a doze with a sand bucket over his head; walk to the hedge gap while it slips over his eyes; Confusione slaps it off. | — | Reality. The bucket plants the helmet of 2.1. Replaces the old premature Jerusalem dream. |
| 1.2 Under the Professor's desk | Follow the Professor; sniff three lecture scraps; get past Jack at the gates. | The lecture names the three voices and the debt for the fleet. | Reality; the lecture plants the dream's residues. |
| 1.3 The toll at the bowl | Paw (Supervillain −3) or the direct path; the hedge is always open. Flags `pawOffered`, `longWay`. | — | Reality. The bowl's CLONG becomes Venice's harbour bell. |
| 1.4 Santina wants her ball back | He performs; she wants the ball. Flag `santinaBall`. | — | Reality; answered in 8.4. |
| 1.5 A cross of rag | Carry a red rag home; the Professor rehearses "they sewed cloth crosses on their shoulders"; Confusione asks; the rag goes on his back (unlock `cross`). He curls up under the desk. | The cloth cross of those who took the cross (Villehardouin). | Reality. **The sleep boundary**: everything after the last card is dream. Replaces the old Louis IX reenactment. |

### Level 2 — On the edge of dreams (1199–1202)

| Scene | Play → consequence | Basis | Dream / invention |
|---|---|---|---|
| 2.1 One step from Jerusalem | Walk to Jerusalem's gate, always one step away; behind a door, "Babylon… Egypt first". | The leaders' real objective was Egypt; the people were told "overseas" (Villehardouin). | Prologue image; the helmet is the bucket. Jerusalem never loads, to the end. |
| 2.2 Names on a list | Shout his vow in the pauses of Fulk's preaching (unlock `sermon`, Grace +5, flag `vow`); the counts take the cross; a clerk lists names by rank, his at the bottom; the marshal leaves for Venice. | Fulk of Neuilly; the tourney of Écri; six envoys (Villehardouin). | The list and the vow-in-the-lull are adaptation. |
| 2.3 A coat of mail too big | Already in mail but unarmed: bark Jack and two lads off the road (the first fight, bark only); pick up a borrowed sword, a sword belt and a shield painted last night (unlock `knight`); try the charge; spar with Pierre's squires (sword and shield; they parry); fall in behind Pierre. | Clari's lord (Pierre d'Amiens) and brother (Aleaume, a clerk). | Invented road, arms, lads and sparring; Confusione becomes Aleaume, Sbrimbrulòn Pierre. |

### Level 3 — Venice (1201–1202)

| Scene | Play → consequence | Basis | Dream / invention |
|---|---|---|---|
| 3.1 Look at those ships | Follow Pierre on the quay; LOOK at the horse transports, the galleys, the great ships (Meraviglia opens); count the empty berths. | Far fewer came than the fleet was built for (Clari; his numbers are a claim). | The bell clangs like the bowl. |
| 3.2 The price of passage | The marshal explains the treaty (85,000 marks); take the collecting bowl round twice; Clari's count says 36,000 still owed, the marshal's 34,000. Flag `shortfall`. | Villehardouin's treaty and collections; Clari's figures. | Both counts kept, on purpose. |
| 3.3 The art of weeping | Play the envoys' 1201 plea as the marshal tells it: kneel, wait for quiet, weep; the square answers. Flag `weptWell`. | "The six envoys knelt at the feet of the people, weeping" (Villehardouin). | A recollection, not something Zampanò saw. |
| 3.4 Nobody leaves the Lido | Follow a bread seller unseen to the council awning; overhear the debt, winter, Hungary, Zara (flag `zaraDeal`); the Doge takes the cross on his cotton hat. | The island, the food threat, Zara, "no one in the army knew this plan, except the leaders" (Clari); the hat (Villehardouin). | Stealth walk is adaptation. |

### Level 4 — The sea (autumn 1202)

| Scene | Play → consequence | Basis | Dream / invention |
|---|---|---|---|
| 4.1 Veni Creator | Walk the deck with Watson, raise shields on the beat (marvel: the fleet leaving Venice). | Priests sing *Veni Creator* from the ships' castles; trumpets, banners (Clari). | Watson as a Venetian sailor. |
| 4.2 Horses below deck | Ease a skiff alongside a transport; feed three horses; Watson drags the bucket out of reach. | Horse transports (Clari). | Invented connective scene. |
| 4.3 Rumours on deck | Ask four men where the fleet is going; the marshal says Zara (flag `heardZara`); row into the harbour on the eve of Saint Martin. | Zara, the King of Hungary, arrival 10 November 1202 (Villehardouin, Clari). | The rumours are adaptation. |

### Level 5 — Zara (November 1202)

| Scene | Play → consequence | Basis | Dream / invention |
|---|---|---|---|
| 5.1 A small favor for Venice | The abbot of Vaux reads the prohibition; the Doge refuses; carry messages between the two parties, then say one aloud: "We took the cross for Jerusalem" (costs Commozione; Standing −12, Supervillain +5, Grace +4, flag `dissent`) or "the host falls apart unless we help the Doge" (Standing +5). | The abbot of Vaux "on the part of the Pope of Rome" (Villehardouin); Zara's letter from Rome (Clari). | Messenger role is adaptation. |
| 5.2 A cross above the wall | Climb the ladder, steady it for the next; follow one bolt of red cloth to the common pile (flag `clothRoute`). | Siege, surrender, the city divided (Villehardouin). | The cloth prepares 7.9's pile. |
| 5.3 Whose orders? | Hear what the abbot, the marshal and a Venetian say he owes; tell Aleaume which one he believes (`zaraOwe`: pope Grace +5 / host Standing +4 / debt Grace −3); get Aleaume back to their quarters through the brawl (a fight: bark or shield the brawlers aside; every sword blow that lands costs Grace −1). | The fray between Venetians and pilgrims (Villehardouin, Clari); the pope's prohibition (5.1). | Three speeches, the fight and its Grace cost are adaptation. Replaces the old penitential/Urban II excursus. |
| 5.4 A letter for Rome | Assemble the barons' account (LetterGame); the absolution comes back in two versions: the marshal's (the pilgrims) and the camp's (everyone, Venetians too). | Villehardouin vs Clari on whom the pope absolved. | No papal words quoted. |
| 5.5 Winter at Zara | Carry the last sail into store; chalk the balance: 36,000 still owed; someone has written JERUSALEM at the top. | Wintering at Zara; no money for Egypt (Clari). | The board is adaptation. |

### Level 6 — The long winter (1202–1203)

| Scene | Play → consequence | Basis | Dream / invention |
|---|---|---|---|
| 6.1 Short rations | Hand out half loaves; a ship leaves for Syria; at the last tent Aleaume has nothing. Share your half loaf (costs Commozione; Supervillain +8, value *Comradeship*, flag `comradeship`) or go to Jack's dice (Standing +4). | Desertions over the winter (Villehardouin); hunger (Clari). | **New setup** read at the breach (7.7). |
| 6.2 A prince on credit | Follow the talk from the cook to the council; piece together the offer (RumourGame): 200,000 marks, food, men for Egypt, the Greek church under Rome; only a dozen swear. | Villehardouin's terms; Boniface had met the young man (Clari). | Garbled pieces are adaptation. |
| 6.3 On their knees at Corfu | Meet the young Alexios; follow Pierre to the camp that wants to stay; the leaders kneel weeping; tell Pierre stay (Standing +6) or Syria (Supervillain +3, Standing −3) (flag `corfu`). The bishops call it a good work; the fleet sails at Pentecost. | Corfu; "Bah! What have we to do in Constantinople?" (Clari); the kneeling chiefs, Michaelmas covenant (Villehardouin). | Zampanò's advice is adaptation; Pierre decides. |

### Level 7 — Constantinople (June 1203 – April 1204)

| Scene | Play → consequence | Basis | Dream / invention |
|---|---|---|---|
| 7.1 Looking both ways | LOOK at the walls, the roofs, the domes (three marvels); Niketas watches back; row the young Alexios along the walls — nobody recognises him. | The city watching; the showing of the prince (Clari, Villehardouin). | Niketas has no lawn face. |
| 7.2 The Doge's banner | 17 July 1203: follow the banner of Saint Mark through the landing; the axe-men come down from the parapet: hold your ground by the banner (a fight, 18 s, shield up) until the Venetians take the towers; carry word that the emperor has come out. | The Doge with the standard; "more than forty people told him"; the Venetians take towers (Villehardouin). | The marshal admits he did not see it. The stand is adaptation. |
| 7.3 Stay beside Pierre | Alexios III comes out (Bagnaskiz's face); Flanders turns back; hold level with Pierre's shoulder at a walk until Flanders comes round; cooks with pots and pestles; a woman with Santina's face on the walls, her words lost. The emperor turns back; no blow. Value *Physical courage*, flag `vanguard`. | Pierre and Saint-Pol refuse to turn back; pots and pestles; the ladies who thought them angels; Flanders rides up beside them again (Clari 45–48). | The window and Santina's face are adaptation. |
| 7.4 A city to visit | Alexios III has fled; Isaac restored, Alexios IV crowned. Visit with Watson: the Palace of the Lion's Mouth, the bronze Hercules, the carved column, a lamp in Niketas's courtyard (four marvels; flag `visitedCity`). | Clari's palace and pillars; Choniates's Hercules. | **The column**: carved scenes nobody can read yet. |
| 7.5 Unpaid promises | Carry the chests, lighter each time; the Doge's rebuke; some pilgrims go to burn the mosque, the Greek neighbours defend it, and a fire burns for two days; lead a woman of Niketas's household home along the street you learned (the house has burned). She tells him not to come back. | The unpaid sums; the fire; "division between the Greeks and the Franks" (Villehardouin, Clari); the mosque (Barbero). | Replaces the old Cligès episode. |
| 7.6 A third Alexios | Walk in with the envoys who carry the defiance, out at the same pace; fire-ships; Mourtzouphlos becomes Alexios V, Alexios IV is strangled. Bagnaskiz again, under a different crown. | Villehardouin's defiance and coup; Clari's version of the deaths. | "The dream runs out of faces." |
| 7.7 The hole in the wall | Swear the oath: booty declared, no hand on women or clergy (Grace +5, flag `sworn`); Friday fails, mockery; Sunday absolution; Monday, Aleaume goes through the hole on hands and feet — try to hold his foot (TugGame, lost by design). With `comradeship` his voice guides you in; without it, only the rattle of his mail. Mourtzouphlos flees. | Clari 68–79: the agreement, the failed Friday, the breach, Robert holding Aleaume's foot. | The deed is Aleaume's. |
| 7.8 Whose street was it? | The city taken: LOOK at the Great Church and the Hippodrome; turn the page to Niketas's account; at his doorway Jack drags a girl from the departing household. **In a lull, call the pilgrims to their oath** (costs Commozione; Supervillain +15, Grace +5, Standing −6, value *Kept oaths*, flag `oath: enforced`) **or stand silent** while Niketas calls them himself (`oath: silent`). Either way they let her go. | Clari's "no mischief was done to poor or to rich" against Choniates's sack and grief, side by side; Niketas's flight, the girls with mud on their faces, the girl let go when he recalls the oath (Barbero, after Niketas). | Zampanò's call and Jack are adaptation. **Decides the ending.** |
| 7.9 The common pile | Pick up the lamp from Niketas's courtyard; declare it (Grace +6, value *An honest share*) or hide it (Grace −8, coins +3; Saint-Pol hangs a knight who kept things back). The Hercules is gone: **an empty pedestal**; the carved column now "says what everyone knew all along". At the pile: gold under guard, coarse silver for poor knights. JERUSALEM: LOADING… never loads. | Clari 81, 92, 98, 105; Villehardouin on things kept back; Choniates on statues melted for coin. | **Meraviglia transformed**: splendour → lost possession. The column is an inscription read after the fact, not a prophecy machine. |

### Level 8 — Back to the Greenzone

| Scene | Play → consequence | Basis | Dream / invention |
|---|---|---|---|
| 8.1 Falling to pieces | Scrambled legs; follow the knock and the smell of his cushion to the chair leg; Jerusalem moves away. | — | Waking continues the dream in the body. |
| 8.2 What he can tell | The armour is a rag again; nothing came back. LOOK at the study: chair leg, lampshade, rug, desk lamp are what the dream made of them only if he saw those marvels. Tell the oath as it happened (his words, or Niketas's); the lamp, if he kept or declared it; leave one drawing (ships / city / an empty pedestal / the bowl — locked unless he saw it). Grace sets how straight he tells it (`tellingTier`). | Clari swears he told "the strict truth". | Replaces the old relic altar and chapel: no medieval object enters reality. |
| 8.3 The vanguard of the lawn | Walk the direct path to the bowl at a walk; Sbrimbrulòn and Confusione fall in beside him and wait if he flinches; Bagnaskiz steps aside; drink and leave the bowl where any dog can reach it. Value *Resistance*. | — | Pierre's walk (7.3) on the lawn. YOU HAVE BEEN SUPERVILLAINED. |
| 8.4 At Santina's gate, again | He tells her his day, up to the ladies on the walls; she asks who heard them. Push the ball through the bars. "Thank you, Zampanò." | His story of the ladies is his version of Clari 47. | Her question stays unanswered. |

## Endings

Decided only by 7.8 (`ending()` in `campaign/state.ts`); Grace and Standing add a line each.

- **THE KNIGHT** (`oath: enforced`): he called the pilgrims to their oath in his own words and tells
  it that way under the desk. Not a hero: a small knight who said one true thing at the right
  moment.
- **THE WITNESS** (internal key `alpha`, kept for save compatibility): he stood silent while
  Niketas called them, and under the desk he gives the line back to its owner. The girl is with
  her family either way; what differs is the story he can honestly tell.

In both, Bagnaskiz steps aside on the lawn and the lane stays open.

## Old → new (save version 1 → 2)

| Old scene | Now |
|---|---|
| 1.0, 1.2, 1.3, 1.4 | Kept (same meaning; saves keep them). |
| 1.1 One step from Jerusalem | 1.1 A bucket on his head (reality); the Jerusalem image moved to 2.1 (dream). |
| 1.5 Taking the cross (Louis IX reenactment) | 1.5 A cross of rag (the sleep boundary). |
| 2.1 Three beasts (Dante), 2.2 The falcon and the suitcase (Charles VI), 2.3 The preacher's bees (Leutard), 2.4 Who sent this dream?, 2.5 Fortune's hands (Christine de Pizan) | Removed. Level 2 is now 2.1 One step from Jerusalem, 2.2 Names on a list (Fulk, from old 2.3's preacher), 2.3 A coat of mail too big (the knight unlock, relocated). |
| 3.1–3.4 | Kept, rewritten (3.3 is the marshal's recollection). |
| 4.1 | Kept. |
| 4.2 The parcel in the water, 4.3 The cellarer's vote, 4.4 Friday at the emir's table, 4.5 The empty place at the oar (Joinville) | Removed. 4.2 Horses below deck (the boat game), 4.3 Rumours on deck (the rowing). |
| 5.1, 5.2, 5.4 | Kept, rewritten. |
| 5.3 What do I owe? (penitentials, Urban II) | 5.3 Whose orders? |
| 5.5 Too late for Egypt | 5.5 Winter at Zara. |
| 6.1 The white tablecloth (Joinville's catapult) | 6.1 Short rations (comradeship setup). |
| 6.2 | Kept, rewritten. |
| 6.3 The road of the poor, 1096–97 (Anna Komnene), 6.4 Hattin, 6.5 Living with a saint (Louis IX), 6.6 A comrade's wake (Joinville) | Removed. 6.3 On their knees at Corfu. |
| 7.1–7.3, 7.6–7.8 | Kept, rewritten. |
| 7.4 Tourists and fire (the mosque) | 7.4 A city to visit (the fire moved to 7.5; the mosque omitted). |
| 7.5 The usurper's wedding night (Cligès) | 7.5 Unpaid promises. |
| — | 7.9 The common pile (new). |
| 8.1, 8.3, 8.4 | Kept, rewritten. |
| 8.2 Relics for the parish | 8.2 What he can tell. |

Retired with the old story: the "black hole" cuts into other crusades and dreams; relics, the
chapel and the altar in 8.2; the calm-rescue and catapult mini-games. 43 scenes became 37
(1.0 + 36).
