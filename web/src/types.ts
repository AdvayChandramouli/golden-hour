export type BestFor = "sunrise" | "sunset" | "both";

export type Access = "public_free" | "public_paid" | "restricted" | "unknown";

export type Tag =
  | "rooftop"
  | "park"
  | "lake"
  | "bridge"
  | "garage"
  | "overlook"
  | "trail"
  | "pier"
  | "plaza";

export type ViewQuality = "open" | "partial" | "blocked" | "unknown";

export type SourceKind = "osm" | "web" | "reddit" | "manual";

export interface Facing {
  sunrise_view: ViewQuality;
  sunset_view: ViewQuality;
}

export interface HorizonScore {
  sunrise: number;
  sunset: number;
}

export interface Source {
  url: string;
  kind: SourceKind;
  retrieved_at: string;
}

/** Feature properties — mirrors data/spots.schema.json and pipeline Spot. */
export interface Spot {
  id: string;
  name: string;
  best_for: BestFor;
  tags: Tag[];
  description: string;
  access: Access;
  hours_note: string | null;
  parking_note: string | null;
  facing: Facing;
  horizon_score: HorizonScore | null;
  sources: Source[];
  mention_count: number;
  verified: boolean;
  last_updated: string;
}

export interface SpotFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: Spot;
}

export interface SpotCollection {
  type: "FeatureCollection";
  features: SpotFeature[];
  _note?: string;
}
