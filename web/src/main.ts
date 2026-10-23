import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./style.css";
import type { SpotCollection } from "./types";

const DOWNTOWN_DALLAS: [number, number] = [-96.797, 32.7767];
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

function ensure3dBuildings(map: maplibregl.Map): void {
  const style = map.getStyle();
  if (!style?.layers) return;
  if (style.layers.some((layer) => layer.type === "fill-extrusion")) return;

  const sourceId = style.sources["openmaptiles"]
    ? "openmaptiles"
    : Object.keys(style.sources)[0];
  if (!sourceId) return;

  map.addLayer({
    id: "3d-buildings",
    source: sourceId,
    "source-layer": "building",
    type: "fill-extrusion",
    minzoom: 14,
    filter: ["!=", ["get", "hide_3d"], true],
    paint: {
      "fill-extrusion-color": "#c0c0c0",
      "fill-extrusion-height": [
        "coalesce",
        ["get", "render_height"],
        ["get", "height"],
        0,
      ],
      "fill-extrusion-base": [
        "coalesce",
        ["get", "render_min_height"],
        ["get", "min_height"],
        0,
      ],
      "fill-extrusion-opacity": 0.65,
    },
  });
}

function accessLabel(access: string): string {
  switch (access) {
    case "public_free":
      return "public (free)";
    case "public_paid":
      return "public (paid)";
    case "restricted":
      return "restricted";
    default:
      return "unknown";
  }
}

async function loadSpots(): Promise<SpotCollection> {
  const response = await fetch("/data/spots.geojson");
  if (!response.ok) {
    throw new Error(`failed to fetch spots.geojson (${response.status})`);
  }
  return (await response.json()) as SpotCollection;
}

const map = new maplibregl.Map({
  container: "map",
  style: STYLE_URL,
  center: DOWNTOWN_DALLAS,
  zoom: 14,
  pitch: 60,
  bearing: -17,
});

map.addControl(new maplibregl.NavigationControl(), "top-right");

map.on("load", async () => {
  ensure3dBuildings(map);

  const spots = await loadSpots();
  map.addSource("spots", { type: "geojson", data: spots });
  map.addLayer({
    id: "spots-circles",
    type: "circle",
    source: "spots",
    paint: {
      "circle-radius": 8,
      "circle-color": [
        "match",
        ["get", "best_for"],
        "sunrise",
        "#E39B2B",
        "sunset",
        "#C4471A",
        "both",
        "#6B3FA0",
        "#888888",
      ],
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
    },
  });

  map.on("click", "spots-circles", (event) => {
    const feature = event.features?.[0];
    if (!feature || feature.geometry.type !== "Point") return;
    const props = feature.properties as {
      name?: string;
      description?: string;
      access?: string;
    };
    const coords = feature.geometry.coordinates as [number, number];
    new maplibregl.Popup()
      .setLngLat(coords)
      .setHTML(
        `<strong>${props.name ?? "Spot"}</strong>` +
          `<p>${props.description ?? ""}</p>` +
          `<p>Access: ${accessLabel(props.access ?? "unknown")}</p>`,
      )
      .addTo(map);
  });

  map.on("mouseenter", "spots-circles", () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", "spots-circles", () => {
    map.getCanvas().style.cursor = "";
  });
});
