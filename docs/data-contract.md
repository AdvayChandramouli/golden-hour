# Data contract: `spots.geojson`

`data/spots.geojson` is the contract between the (future) Python pipeline and the static map frontend. Both sides treat `data/spots.schema.json` as the machine-readable source of truth.

The file is a GeoJSON **FeatureCollection** of **Point** features. Geometry coordinates are `[longitude, latitude]`.

A top-level `_note` string is allowed on the collection (not on feature properties). Mock coordinates are **approximate** and need field verification before anything is treated as ground truth.

## Feature properties

| Field | Type | Notes |
|---|---|---|
| `id` | string | Stable slug (`reunion-tower`). Lowercase letters, digits, hyphens. |
| `name` | string | Display name. |
| `best_for` | `"sunrise"` \| `"sunset"` \| `"both"` | What the spot is primarily useful for. |
| `tags` | string[] | Controlled vocab: `rooftop`, `park`, `lake`, `bridge`, `garage`, `overlook`, `trail`, `pier`, `plaza`. At least one. |
| `description` | string | One or two original sentences. |
| `access` | `"public_free"` \| `"public_paid"` \| `"restricted"` \| `"unknown"` | How a visitor gets in. |
| `hours_note` | string \| null | e.g. park closing time. |
| `parking_note` | string \| null | |
| `facing` | object | `{ sunrise_view, sunset_view }` each `"open"` \| `"partial"` \| `"blocked"` \| `"unknown"`. Human-assessed placeholder until the pipeline computes horizon. |
| `horizon_score` | object \| null | `{ sunrise, sunset }` numbers in `[0, 1]`. `null` until the pipeline computes it. |
| `sources` | array | `{ url, kind, retrieved_at }`. `kind` is `"osm"` \| `"web"` \| `"reddit"` \| `"manual"`. `retrieved_at` is an ISO date (`YYYY-MM-DD`). |
| `mention_count` | integer ≥ 1 | Count of independent sources mentioning the spot. |
| `verified` | boolean | Human-reviewed. |
| `last_updated` | ISO date | `YYYY-MM-DD`. |

Properties objects **must not** contain extra keys (`additionalProperties: false`).

## Extra checks (validator, not JSON Schema)

`python -m golden_hour.validate` also:

1. Parses the file with the Pydantic `Spot` model (`pipeline/golden_hour/models.py`).
2. Requires unique `properties.id` values.
3. Requires each point to fall in a Dallas bounding box: lat `32.60`–`33.03`, lng `-97.05` to `-96.45`.

Frontend TypeScript types live in `web/src/types.ts` and must stay aligned with this contract.
