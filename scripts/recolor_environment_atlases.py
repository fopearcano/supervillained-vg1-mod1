#!/usr/bin/env python3
"""Build vibrant multi-material variants of the delivered environment atlases.

The source Color Ink delivery intentionally uses one chapter hue as a unifying ink wash. This
authoring pass keeps that dominant identity in outlines and the largest material family, while
giving water, vegetation, earth, stone, wood, textiles, snow, metal and accents their own ramps.

The operation is deterministic and geometry-safe:
- manifest frame names, rectangles, anchors and floor-design references are unchanged;
- every alpha byte is unchanged;
- recoloring is performed independently inside each declared, non-overlapping frame;
- the source directory is never modified.

In this repository the source is the current bank (public/environment-ink/, Color Ink v1) and
the output the vibrant bank (public/environment-ink-vibrant/) that OPTIONS > ART: NEW (TEST)
shows; run from the repository root: python3 scripts/recolor_environment_atlases.py
"""

from __future__ import annotations

import argparse
import colorsys
import copy
import hashlib
import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class Direction:
    name: str
    dominant: str
    ink: str
    paper: str
    background: str
    vegetation: str
    water: str
    earth: str
    stone: str
    wood: str
    textile: str
    snow: str
    pollution: str
    metal: str
    accent_warm: str
    accent_cool: str
    roof: str = "accent_warm"
    ground: str | None = None


DIRECTIONS: dict[str, Direction] = {
    "ch01_greenzone": Direction(
        "Emerald park", "emerald", "#063B2C", "#F2F1C4", "#073A2B",
        "#16A765", "#2FAAD1", "#C6A35E", "#C9C8A5", "#98623D",
        "#D6514D", "#D8E9D1", "#6C4A2B", "#6D8A91", "#E45A4F", "#318DC8",
    ),
    "ch01_study": Direction(
        "Warm oak study", "warm oak", "#33241F", "#F2E5C4", "#2F241F",
        "#6E9B5B", "#4D9FC0", "#BE9A62", "#D7C7A3", "#A36B36",
        "#9C3556", "#E5E9D5", "#70513A", "#7C8A8B", "#C65A4A", "#3F7EA2",
    ),
    "ch02_jerusalem": Direction(
        "Pastel Jerusalem", "lavender", "#2B1B45", "#F4E5ED", "#24143A",
        "#74B68B", "#59BBD1", "#D9B79B", "#CDA6D8", "#9C6F55",
        "#B95B8A", "#E9E4EE", "#75526A", "#7D86A2", "#D96582", "#4D91C0",
        roof="accent_cool", ground="#A56BD1",
    ),
    "ch02_darkwood": Direction(
        "Violet and teal fair", "violet", "#211733", "#E8D8EF", "#1B1230",
        "#277D69", "#358EA8", "#9C7147", "#A980BD", "#7D5136",
        "#B24B92", "#DEDCE6", "#5D4038", "#70818F", "#D89C45", "#318C86",
        ground="#8650B6",
    ),
    "ch02_road": Direction(
        "Plum departure road", "plum", "#2A183B", "#EBDDEB", "#21122F",
        "#7A9B4B", "#55A6C5", "#C99858", "#B68AAE", "#8A5B38",
        "#A74F82", "#E5E2E7", "#654532", "#75828D", "#E0BB46", "#4285B7",
        ground="#8D4FAF",
    ),
    "ch03_venice": Direction(
        "Lagoon and terracotta", "lagoon turquoise", "#073D52", "#F0E1B7", "#063B44",
        "#5C9C63", "#168FA8", "#D2B06D", "#D8C99B", "#8E5B3B",
        "#D86843", "#E7E7D3", "#665043", "#738A91", "#F06456", "#287EB0",
    ),
    "ch04_sea": Direction(
        "Cobalt sea and warm deck", "cobalt", "#09143C", "#F0E6C6", "#080F39",
        "#2B8176", "#2F64CC", "#C4A66C", "#AEB6C2", "#9A623B",
        "#E3D7B8", "#E7EEF2", "#5C4636", "#73849A", "#D64F4A", "#178E9E",
    ),
    "ch05_zara": Direction(
        "Rust city and Adriatic blue", "rust red", "#3B1920", "#F0D7AC", "#35151B",
        "#6D8B45", "#3D6EB5", "#C97B4F", "#D9B77F", "#87563B",
        "#3F6EA5", "#E8E1D0", "#684331", "#78838B", "#DCA446", "#397EA8",
        roof="accent_cool", ground="#C9573E",
    ),
    "ch06_winter": Direction(
        "Ice, pine and ember", "ice cyan", "#17394F", "#F2F8F4", "#103D51",
        "#2F715B", "#4E91BE", "#8E7A68", "#8CA6B8", "#7B583F",
        "#A84257", "#D4ECF1", "#55463E", "#778996", "#E7923A", "#557DA7",
    ),
    "ch06_island": Direction(
        "Aqua spring island", "aqua", "#124555", "#F1E8CE", "#103D51",
        "#50A657", "#278FC3", "#E4C774", "#E2D8BB", "#9A633F",
        "#E46254", "#E6E9DB", "#6E5039", "#728E91", "#E46254", "#176A92",
    ),
    "ch07_constantinople": Direction(
        "Imperial gold and lapis", "imperial gold", "#3A251B", "#F2E0B0", "#392513",
        "#3B8C72", "#2E77A3", "#D1A24A", "#E2C57C", "#8C5A35",
        "#A4478C", "#ECE4CE", "#68452D", "#71818D", "#C94F43", "#2C5FA8",
        roof="accent_cool",
    ),
    "ch07_palace": Direction(
        "Gold, purple and marble", "gold", "#382238", "#F2DEB0", "#302034",
        "#43866C", "#337CA2", "#C89B42", "#E1C991", "#895A38",
        "#8A45A5", "#ECE6D5", "#65462F", "#7A8090", "#C94A4F", "#325DB1",
        roof="accent_cool",
    ),
    "ch08_shattered": Direction(
        "Sage fracture", "warm sage", "#292641", "#E2E8BD", "#243526",
        "#82A85D", "#5DB4B1", "#B9A96B", "#8C83A9", "#816044",
        "#BF4F89", "#DCE2D1", "#55443E", "#667887", "#D55A4E", "#4F64A1",
        roof="accent_warm",
    ),
    "ch08_study": Direction(
        "Sage and walnut return", "sage", "#2D3024", "#EFE1B6", "#243B25",
        "#88A85E", "#4B91AD", "#C3A86A", "#D9CBA8", "#95663D",
        "#923D51", "#E4E6D2", "#64503A", "#718184", "#D2A342", "#477C70",
    ),
    "ch08_greenzone": Direction(
        "Mature sage homecoming", "mature sage", "#263B28", "#E7E9B7", "#243B25",
        "#7FA85B", "#449DB6", "#C6A85F", "#D0CBA0", "#93613C",
        "#A9474F", "#E2E7CE", "#674A32", "#74868A", "#D85B4E", "#3B7FA9",
    ),
}


STANDARD_GROUPS: dict[str, str] = {
    "grass": "ground", "tallGrass": "vegetation", "forest": "vegetation",
    "tree": "vegetation", "forestTree": "vegetation", "bush": "vegetation",
    "palm": "vegetation", "vine": "vegetation",
    "water": "water", "deep": "water",
    "path": "earth", "sand": "earth",
    "stone": "stone", "wallBase": "stone", "wallBlock": "stone", "column": "stone",
    "statue": "stone", "rock": "stone", "gate": "stone", "house": "stone",
    "altar": "stone", "fountain": "stone", "bones": "stone",
    "floor": "wood", "dock": "wood", "desk": "wood", "shelf": "wood",
    "crate": "wood", "table": "wood", "stall": "wood", "galley": "wood",
    "wicket": "wood",
    "carpet": "textile", "tent": "textile", "throne": "textile",
    "exitFlag": "textile",
    "snow": "snow", "dirt": "pollution", "pole": "metal",
    "fresh": "vegetation", "exitRing": "accent_warm",
}

FLOOR_GROUPS: dict[str, str] = {
    "meadow": "ground",
    "earth": "earth", "gravel": "earth", "mud": "pollution", "sand": "earth",
    "brick": "stone", "cobble": "stone", "flagstone": "stone", "marble": "stone",
    "mosaic": "textile", "rug": "textile",
    "deck": "wood", "planks": "wood", "quay": "wood", "hatch": "wood",
    "snow": "snow",
}

GROUND_PREFIXES = {
    "grass", "tallGrass", "forest", "water", "deep", "path", "sand", "stone",
    "wallBase", "floor", "dock", "carpet", "snow", "dirt", "fresh", "exitRing",
}


def hex_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


def rgb_hex(rgb: Iterable[int]) -> str:
    return "#" + "".join(f"{max(0, min(255, int(c))):02x}" for c in rgb)


def mix(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def ramp(direction: Direction, group: str) -> list[tuple[int, int, int]]:
    ink = hex_rgb(direction.ink)
    value = direction.ground or direction.vegetation if group == "ground" else getattr(direction, group)
    mid = hex_rgb(value)
    paper = hex_rgb(direction.paper)
    # The very deepest source pixels are preserved before this ramp is used. Let the remaining
    # shadow tones carry their material hue instead of collapsing back into one chapter ink.
    return [mix(ink, mid, 0.30), mix(ink, mid, 0.62), mid, mix(mid, paper, 0.58), paper]


def frame_group(name: str) -> str:
    if name.startswith("floorArt_"):
        material = name.split("_", 2)[1]
        return FLOOR_GROUPS.get(material, "earth")
    prefix = name.rsplit("_", 1)[0]
    if prefix.startswith("path_"):
        prefix = "path"
    return STANDARD_GROUPS.get(prefix, STANDARD_GROUPS.get(name.split("_", 1)[0], "stone"))


def luma(rgb: tuple[int, int, int]) -> float:
    r, g, b = (c / 255.0 for c in rgb)
    # sRGB relative luminance retains the source shading order better than HSV value.
    def linear(c: float) -> float:
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)


def hue_distance(a: float, b: float) -> float:
    d = abs(a - b) % 1.0
    return min(d, 1.0 - d)


def shade(r: list[tuple[int, int, int]], t: float) -> tuple[int, int, int]:
    t = max(0.0, min(1.0, round(t * 31) / 31))
    pos = t * (len(r) - 1)
    i = min(len(r) - 2, int(pos))
    return mix(r[i], r[i + 1], pos - i)


def quantile(values: list[float], q: float) -> float:
    if not values:
        return 0.0
    values = sorted(values)
    idx = (len(values) - 1) * q
    lo = math.floor(idx)
    hi = math.ceil(idx)
    return values[lo] if lo == hi else values[lo] + (values[hi] - values[lo]) * (idx - lo)


def pixels(image: Image.Image):
    """Pillow 13+ name with a compatibility fallback for older authoring environments."""
    getter = getattr(image, "get_flattened_data", None)
    return getter() if getter else image.getdata()


def update_manifest_palette(zone: dict, direction: Direction) -> None:
    def swatch(group: str) -> list[str]:
        r = ramp(direction, group)
        return [rgb_hex(r[2]), rgb_hex(r[1]), rgb_hex(r[3])]

    palette = zone.setdefault("palette", {})
    palette.update({
        "grass": swatch("ground"),
        "tallGrass": swatch("vegetation"),
        "path": swatch("earth"),
        "water": swatch("water"),
        "forest": [rgb_hex(ramp(direction, "vegetation")[1]), rgb_hex(ramp(direction, "vegetation")[0]), rgb_hex(ramp(direction, "vegetation")[2])],
        "pollution": swatch("pollution"),
        "floor": swatch("wood"),
        "stone": swatch("stone"),
        "sand": swatch("earth"),
        "snow": swatch("snow"),
        "deep": [rgb_hex(ramp(direction, "water")[1]), rgb_hex(ramp(direction, "water")[0]), rgb_hex(ramp(direction, "water")[2])],
        "wall": swatch("stone"),
        "roof": swatch(direction.roof),
        "cloth": swatch("textile"),
        "dock": swatch("wood"),
        "carpet": swatch("textile"),
        "foliage": [rgb_hex(ramp(direction, "vegetation")[0]), rgb_hex(ramp(direction, "vegetation")[2]), rgb_hex(ramp(direction, "vegetation")[3])],
        "flowers": [rgb_hex(ramp(direction, "accent_warm")[2]), rgb_hex(ramp(direction, "accent_cool")[3]), direction.paper.lower()],
        "background": direction.background.lower(),
    })
    zone["artDirection"] = {
        "version": 2,
        "name": direction.name,
        "dominant": direction.dominant,
        "strategy": "dominant-plus-semantic-material-ramps",
    }


def recolor_zone(source_path: Path, output_path: Path, zone: dict, direction: Direction) -> dict:
    src = Image.open(source_path).convert("RGBA")
    dst = src.copy()
    src_px = src.load()
    dst_px = dst.load()
    alpha_before = src.getchannel("A").tobytes()

    opaque_lumas = [luma(px[:3]) for px in pixels(src) if px[3] > 0]
    low = quantile(opaque_lumas, 0.035)
    high = quantile(opaque_lumas, 0.985)
    if high <= low:
        raise ValueError(f"{source_path.name}: no usable luminance range")

    old_mid = hex_rgb(zone["palette"]["grass"][0])
    old_hue = colorsys.rgb_to_hsv(*(c / 255 for c in old_mid))[0]
    changed = 0
    groups: dict[str, int] = {}

    for name, frame in zone["frames"].items():
        group = frame_group(name)
        groups[group] = groups.get(group, 0) + 1
        base_ramp = ramp(direction, group)
        is_ground = name.startswith("floorArt_") or name.split("_", 1)[0] in GROUND_PREFIXES
        x0, y0, w, h = (frame[k] for k in ("x", "y", "w", "h"))
        for y in range(y0, y0 + h):
            for x in range(x0, x0 + w):
                rr, gg, bb, aa = src_px[x, y]
                if aa == 0:
                    continue
                rgb = (rr, gg, bb)
                lum = luma(rgb)
                if lum <= low:
                    # Preserve the chapter's deepest ink to retain silhouettes and identity.
                    continue
                t = (lum - low) / (high - low)
                chosen = base_ramp
                routed_accent = False
                if not is_ground:
                    hue, sat, _ = colorsys.rgb_to_hsv(rr / 255, gg / 255, bb / 255)
                    if sat >= 0.32 and hue_distance(hue, old_hue) >= 0.12:
                        if 0.22 <= hue <= 0.48:
                            chosen = ramp(direction, "vegetation")
                        elif 0.48 < hue <= 0.78:
                            chosen = ramp(direction, "accent_cool")
                        else:
                            chosen = ramp(direction, "accent_warm")
                        routed_accent = True
                # Small roof, cloth, cross and trim accents need enough chroma to remain visible
                # at the phone viewport even when their source pixels were deliberately dark.
                if routed_accent:
                    t = max(t, 0.36)
                new_rgb = shade(chosen, t)
                if new_rgb != rgb:
                    dst_px[x, y] = (*new_rgb, aa)
                    changed += 1

    if dst.getchannel("A").tobytes() != alpha_before:
        raise AssertionError(f"{source_path.name}: alpha channel changed")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    dst.save(output_path, optimize=True)
    verify = Image.open(output_path).convert("RGBA")
    if verify.size != src.size or verify.getchannel("A").tobytes() != alpha_before:
        raise AssertionError(f"{source_path.name}: saved geometry/alpha mismatch")

    colors = {px[:3] for px in pixels(verify) if px[3]}
    return {
        "image": output_path.name,
        "size": list(src.size),
        "changedOpaquePixels": changed,
        "opaquePixels": sum(1 for px in pixels(src) if px[3]),
        "uniqueOpaqueColors": len(colors),
        "groups": groups,
        "alphaSha256": hashlib.sha256(alpha_before).hexdigest(),
    }


def shown(path: Path) -> str:
    """A path as the report records it: repository-relative when it can be (no machine paths)."""
    try:
        return path.relative_to(ROOT).as_posix()
    except ValueError:
        return path.name


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", type=Path, default=ROOT / "public" / "environment-ink")
    parser.add_argument("--output-dir", type=Path, default=ROOT / "public" / "environment-ink-vibrant")
    parser.add_argument("--report", type=Path, default=ROOT / "docs" / "art-direction" / "vibrant-palette-report.json")
    parser.add_argument("--zones", nargs="*", help="Optional environment ids for a preview build")
    args = parser.parse_args()

    source_dir = args.source_dir.resolve()
    output_dir = args.output_dir.resolve()
    manifest_path = source_dir / "manifest.json"
    if not manifest_path.is_file():
        raise SystemExit(f"Missing source manifest: {manifest_path}")

    original = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest = copy.deepcopy(original)
    selected = set(args.zones or manifest["zones"].keys())
    unknown = selected - set(manifest["zones"])
    if unknown:
        raise SystemExit(f"Unknown zones: {sorted(unknown)}")

    results: dict[str, dict] = {}
    for zone_id, zone in manifest["zones"].items():
        if zone_id not in selected:
            if source_dir != output_dir:
                output_dir.mkdir(parents=True, exist_ok=True)
                (output_dir / zone["image"]).write_bytes((source_dir / zone["image"]).read_bytes())
            continue
        direction = DIRECTIONS.get(zone_id)
        if not direction:
            raise SystemExit(f"No art direction for {zone_id}")
        results[zone_id] = recolor_zone(
            source_dir / zone["image"],
            output_dir / zone["image"],
            zone,
            direction,
        )
        update_manifest_palette(zone, direction)

    manifest["artDirection"] = {
        "version": 2,
        "name": "Vibrant dominant-plus-supporting-color environments",
        "dominantShareTarget": [0.40, 0.60],
        "supportingShareTarget": [0.25, 0.40],
        "accentShareTarget": [0.05, 0.12],
        "source": "deterministic semantic-frame recolor of Color Ink v1",
    }
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    report = {
        "version": 2,
        "source": shown(source_dir),
        "output": shown(output_dir),
        "geometryInvariant": True,
        "alphaInvariant": True,
        "zones": results,
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"zones": len(results), "output": str(output_dir), "report": str(args.report)}, indent=2))


if __name__ == "__main__":
    main()
