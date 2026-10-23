# Golden Hour Dallas

Interactive 3D web map of sunrise and sunset viewing spots in Dallas, TX.

Static frontend (Vite + TypeScript + MapLibre GL JS). A Python pipeline will later produce `data/spots.geojson`, which is the contract between pipeline and frontend.

## Repo layout

```
.
├── web/          # Vite + vanilla TypeScript map
├── pipeline/     # Pydantic models + GeoJSON validator (pipeline TBD)
├── data/         # spots.schema.json + spots.geojson
└── docs/         # data-contract.md
```

## How to run

```bash
make venv              # creates .venv and pip-installs pipeline/
make validate          # python -m golden_hour.validate
cd web && npm install
make dev               # npm run dev in web/
```

Map: http://localhost:5173

## Data contract (summary)

`data/spots.geojson` is a GeoJSON FeatureCollection of Point features (`[lng, lat]`). Each feature's `properties` include `id`, `name`, `best_for` (sunrise | sunset | both), `tags`, `access`, `facing`, optional `horizon_score`, `sources`, `mention_count`, `verified`, and `last_updated`.

See `docs/data-contract.md` and `data/spots.schema.json`. Coordinates in the mock file are approximate and need field verification.
