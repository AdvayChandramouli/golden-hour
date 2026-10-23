"""Validator tests. Run from repo root:

PYTHONPATH=pipeline python3 -m unittest pipeline.tests.test_validate
"""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def _write(payload: dict) -> Path:
    tmp = tempfile.NamedTemporaryFile(mode="w", suffix=".geojson", delete=False)
    json.dump(payload, tmp)
    tmp.close()
    return Path(tmp.name)


def _spot(
    *,
    spot_id: str = "reunion-tower",
    lng: float = -96.8089,
    lat: float = 32.7754,
    extra_props: dict | None = None,
) -> dict:
    props = {
        "id": spot_id,
        "name": "Reunion Tower",
        "best_for": "both",
        "tags": ["rooftop"],
        "description": "A high deck with a wide view of downtown.",
        "access": "public_paid",
        "hours_note": None,
        "parking_note": None,
        "facing": {"sunrise_view": "open", "sunset_view": "open"},
        "horizon_score": {"sunrise": 0.8, "sunset": 0.7},
        "sources": [
            {
                "url": "https://example.com",
                "kind": "manual",
                "retrieved_at": "2026-10-23",
            }
        ],
        "mention_count": 1,
        "verified": True,
        "last_updated": "2026-10-23",
    }
    if extra_props:
        props.update(extra_props)
    return {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [lng, lat]},
        "properties": props,
    }


def _collection(*features: dict) -> dict:
    return {
        "type": "FeatureCollection",
        "_note": "test",
        "features": list(features),
    }


class ValidateTests(unittest.TestCase):
    def setUp(self) -> None:
        from golden_hour.validate import validate_file

        self.validate_file = validate_file

    def test_valid_collection_has_no_errors(self) -> None:
        path = _write(_collection(_spot()))
        self.assertEqual(self.validate_file(path), [])

    def test_rejects_duplicate_ids(self) -> None:
        path = _write(
            _collection(
                _spot(spot_id="same-spot", lng=-96.81, lat=32.78),
                _spot(spot_id="same-spot", lng=-96.80, lat=32.77),
            )
        )
        errors = self.validate_file(path)
        self.assertTrue(any("unique" in e.lower() or "duplicate" in e.lower() for e in errors))

    def test_rejects_point_outside_dallas_bbox(self) -> None:
        path = _write(_collection(_spot(lng=-96.80, lat=31.0)))
        errors = self.validate_file(path)
        self.assertTrue(any("bbox" in e.lower() or "dallas" in e.lower() for e in errors))

    def test_rejects_unknown_best_for(self) -> None:
        path = _write(_collection(_spot(extra_props={"best_for": "noon"})))
        errors = self.validate_file(path)
        self.assertTrue(len(errors) > 0)

    def test_rejects_extra_property_keys(self) -> None:
        path = _write(_collection(_spot(extra_props={"secret_field": "nope"})))
        errors = self.validate_file(path)
        self.assertTrue(len(errors) > 0)

    def test_mock_spots_file_passes(self) -> None:
        path = REPO_ROOT / "data" / "spots.geojson"
        self.assertTrue(path.exists(), "expected data/spots.geojson")
        self.assertEqual(self.validate_file(path), [])


if __name__ == "__main__":
    unittest.main()
