# Pipeline (placeholder)

Python package that will eventually produce `data/spots.geojson`.

For now it only holds:

- `golden_hour/models.py` — Pydantic v2 models that mirror `data/spots.schema.json`
- `golden_hour/validate.py` — CLI that validates the GeoJSON contract

```bash
# from repo root
make venv
make validate
```
