# Vibrant multi-material environment palettes

The second Color Ink pass keeps one dominant color per environment but no longer sends every
material through that one hue family. Vegetation, water, earth, masonry, wood, textiles, snow,
pollution, metal and small accents now use separate luminance-ordered ramps.

## Direction by environment

| Environment | Dominant identity | Supporting material colors | High-energy accents |
|---|---|---|---|
| Chapter 1 Green Zone | emerald | blue water, ochre paths, cream stone, brown wood | coral roofs, flower gold |
| Chapter 1 study | warm oak | sage, ivory plaster, walnut | burgundy, brass |
| Jerusalem | lavender | blush sandstone, mint foliage, sky blue | rose, pale gold |
| Fair / dark wood | violet | deep teal foliage, earthen brown, cream | amber, magenta |
| Departure road | plum | tawny earth, olive foliage, blue | banner gold, rose |
| Venice | lagoon turquoise | navy water, limestone, terracotta, warm docks | coral, gold |
| The sea | cobalt | teal waves, brown deck, ivory sails | cross red, brass |
| Zara | rust red | sandstone, olive foliage, Adriatic blue | gold, ivory |
| Winter | ice cyan | snow white, evergreen, slate blue | ember orange, burgundy |
| Corfu island | aqua | sand gold, palm green, whitewash, blue sea | coral, deep teal |
| Constantinople | imperial gold | lapis roofs, ivory stone, teal foliage, brown wood | magenta, crimson |
| Palace | gold | imperial purple, lapis, ivory marble | crimson, turquoise |
| Shattered | warm sage | void indigo, ivory, ghost cyan | glitch magenta, coral |
| Return study | sage | walnut, paper ivory, teal | burgundy, brass |
| Return Green Zone | mature sage | blue water, ochre paths, cream stone | roof red, flower gold |

## Production method

In this repository the vibrant pass is a second bank on trial, beside the current one:
`public/environment-ink/` is the current Color Ink delivery (v1, what the game shows by default)
and `public/environment-ink-vibrant/` is this recolour, shown when OPTIONS > ART is set to
NEW (TEST) (a temporary testing option; `?art=new` in the address starts one visit in it).
`scripts/recolor_environment_atlases.py` reads the current bank and writes the vibrant one; it
reproduces the delivered vibrant PNGs pixel for pixel.

The script:

- recolors each declared atlas frame by semantic material family;
- preserves every alpha byte, image dimension, frame rectangle, anchor and name;
- preserves the deepest original chapter ink pixels as silhouettes;
- routes existing green, warm and cool source accents into vegetation, warm-accent and
  cool-accent ramps;
- updates the manifest's generated-art fallback palettes;
- writes `vibrant-palette-report.json` with alpha hashes and changed-pixel counts.

Run from the repository root (needs Python 3 with Pillow):

```bash
python3 scripts/recolor_environment_atlases.py
npm test
npm run build
npm run screens:environments
```

## Concept study

The built-in ImageGen tool was used only for an art-direction study, not for production atlas
pixels. Its edit prompt preserved the Constantinople gameplay composition and asked for a dominant
imperial-gold environment supported by lapis roofs, terracotta/coral masonry accents, olive
vegetation, cream stone, plum shadows and restrained turquoise details. The retained reference is
`docs/art-direction/vibrant-color-study-constantinople.png`.

Production files use deterministic pixel remapping because generative editing cannot guarantee the
atlas geometry, alpha, anchors and frame boundaries required by the renderer.

## Acceptance criteria

- A dominant hue still reads at thumbnail size, but no outdoor environment resembles a single
  color filter.
- Water and adjacent land use visibly different hue families.
- Vegetation, walkable ground, architecture and cloth remain distinguishable at phone scale.
- The white player and darker NPCs retain strong local value edges.
- Water animation frames share one material family and do not create multicolor seams.
- Grayscale navigation and depth remain readable.
- Tests verify 15 banks, 104 native frames per bank, material-separated manifest colors, unchanged
  frame geometry and the generated alpha-invariance report.

