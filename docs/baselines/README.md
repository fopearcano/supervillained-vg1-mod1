# Baselines of the locks

What the game does and shows at a given commit, recorded by `npm run lock -- record` in the
deterministic harness (`scripts/harness.mjs`). The restructure of BLUEPRINT.md must keep every
one of them byte for byte: `npm run lock -- check` compares a fresh run with these files.

| File | Lock | What it is |
|---|---|---|
| `playtest-first.md`, `playtest-random.md` | playtest | `npm run playtest` with skill 0.7, ending knight, seed 1; choices "first" and "random" |
| `save-first.json`, `save-random.json` | save | the saved data (campaign, settings, records) at the end of those two runs |
| `captures.json` and `*.png` | pixels | one stepped capture per screen of the lock list ([scripts/lockCaptures.mjs](../../scripts/lockCaptures.mjs)), hashed (SHA-256 of the PNG) |

Recorded at the commit named in the last line of this file.

## Using them

```bash
npm run lock -- check                     # all three locks (about 15 min)
npm run lock -- check pixels              # the captures only (about 2 min)
npm run lock -- check pixels --only title,glossary
npm run lock -- check playtest save       # the two whole-campaign playtests
```

A failed check names each file that differs and the directory of the new run, so the PNGs can be
compared by eye. A difference is a change of behaviour: find it, or, if the change is wanted (it
is not, during the restructure), record the baselines again at the new commit.

`npm run lock -- prove` runs everything twice and compares the two runs with each other (not with
these files): it checks the harness itself. It must pass before any baseline means anything.

## Rules

- **Same machine.** The captures come from the browser's software WebGL. Another machine (or a
  new Chromium) can round a few pixels differently: there, run `prove`, then `record` at the same
  commit before any `check`. The playtest and save locks do not depend on the machine.
- **Never edit `src/` while a lock runs** (the dev server reloads the page).
- **A recipe is part of its baseline.** Changing a step count or an input in
  `scripts/lockCaptures.mjs` changes its shots: record them again at the same commit
  (`npm run lock -- record pixels --only <id>`), never together with a change in `src/`.
- **What the harness fixes:** Math.random seeded (mulberry32, seed 1), Date.now fixed (1 January
  2026, 12:00 UTC), requestAnimationFrame never calls back (time moves only by `__sv.step(n)`),
  loads finished between batches of steps, a 400 x 860 touch viewport at scale 1, input only
  through the game's Input object.
