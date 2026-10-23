"""Validate data/spots.geojson against the JSON Schema, Pydantic models, bbox, and unique ids."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from jsonschema import Draft202012Validator
from pydantic import ValidationError

from golden_hour.models import SpotCollection

LAT_MIN, LAT_MAX = 32.60, 33.03
LNG_MIN, LNG_MAX = -97.05, -96.45

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_GEOJSON = REPO_ROOT / "data" / "spots.geojson"
SCHEMA_PATH = REPO_ROOT / "data" / "spots.schema.json"


def _in_dallas_bbox(lng: float, lat: float) -> bool:
    return LNG_MIN <= lng <= LNG_MAX and LAT_MIN <= lat <= LAT_MAX


def validate_file(path: Path) -> list[str]:
    errors: list[str] = []
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return [f"could not read GeoJSON: {exc}"]

    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    validator = Draft202012Validator(schema)
    for err in validator.iter_errors(payload):
        loc = "/".join(str(p) for p in err.absolute_path) or "(root)"
        errors.append(f"schema: {loc}: {err.message}")

    try:
        collection = SpotCollection.model_validate(payload)
    except ValidationError as exc:
        for err in exc.errors():
            loc = "/".join(str(p) for p in err["loc"]) or "(root)"
            errors.append(f"pydantic: {loc}: {err['msg']}")
        return errors

    seen: dict[str, int] = {}
    for i, feature in enumerate(collection.features):
        spot_id = feature.properties.id
        if spot_id in seen:
            errors.append(
                f"duplicate id '{spot_id}' at features[{seen[spot_id]}] and features[{i}]"
            )
        else:
            seen[spot_id] = i

        lng, lat = feature.geometry.coordinates
        if not _in_dallas_bbox(lng, lat):
            errors.append(
                f"features[{i}] ({spot_id}): coordinates [{lng}, {lat}] "
                f"outside Dallas bbox "
                f"(lat {LAT_MIN}-{LAT_MAX}, lng {LNG_MIN} to {LNG_MAX})"
            )

    return errors


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate spots.geojson")
    parser.add_argument(
        "geojson",
        nargs="?",
        type=Path,
        default=DEFAULT_GEOJSON,
        help="path to spots.geojson (default: data/spots.geojson)",
    )
    args = parser.parse_args(argv)
    path = args.geojson
    if not path.is_file():
        print(f"file not found: {path}", file=sys.stderr)
        return 1

    errors = validate_file(path)
    if errors:
        print(f"{path}: {len(errors)} error(s)", file=sys.stderr)
        for message in errors:
            print(f"  - {message}", file=sys.stderr)
        return 1

    print(f"{path}: ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
