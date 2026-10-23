import "@fontsource/nunito/600.css";
import "@fontsource/nunito/700.css";
import "@fontsource/nunito/800.css";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./style.css";
import { minusIcon, northIcon, plusIcon } from "./icons";
import { registerPinImages } from "./pins";
import { renderSheet } from "./sheet";
import {
  DOWNTOWN_DALLAS,
  chicagoTodayYmd,
  defaultMode,
  formatChipDate,
  formatClock,
  sunTimes,
  type Mode,
} from "./sun";
import type { SpotCollection, SpotFeature } from "./types";

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const SPOTS_URL = "/data/spots.geojson";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const dateInput = document.querySelector<HTMLInputElement>("#date-input")!;
const dateLabel = document.querySelector<HTMLElement>("#date-label")!;
const dateTime = document.querySelector<HTMLElement>("#date-time")!;
const sheet = document.querySelector<HTMLElement>("#sheet")!;
const sheetInner = document.querySelector<HTMLElement>("#sheet-inner")!;
const modeInputs = Array.from(
  document.querySelectorAll<HTMLInputElement>('input[name="mode"]'),
);

const spotsById = new Map<string, SpotFeature>();
let map: maplibregl.Map | undefined;
let mode: Mode = defaultMode();
let dateYmd = chicagoTodayYmd();
let selectedId: string | null = null;
let loadError: string | null = null;

function ensure3dBuildings(instance: maplibregl.Map): void {
  const style = instance.getStyle();
  if (!style?.layers) return;
  if (style.layers.some((layer) => layer.type === "fill-extrusion")) return;

  const sourceId = style.sources["openmaptiles"]
    ? "openmaptiles"
    : Object.keys(style.sources)[0];
  if (!sourceId) return;

  instance.addLayer({
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

function matchesMode(bestFor: string, active: Mode): boolean {
  return bestFor === active || bestFor === "both";
}

function modeFilter(active: Mode): maplibregl.FilterSpecification {
  return [
    "any",
    ["==", ["get", "best_for"], active],
    ["==", ["get", "best_for"], "both"],
  ];
}

function selectedFeature(): SpotFeature | null {
  if (!selectedId) return null;
  return spotsById.get(selectedId) ?? null;
}

function sunCoords(): { lng: number; lat: number } {
  const feature = selectedFeature();
  if (feature) {
    const [lng, lat] = feature.geometry.coordinates;
    return { lng, lat };
  }
  return { lng: DOWNTOWN_DALLAS[0], lat: DOWNTOWN_DALLAS[1] };
}

function syncDateChip(): void {
  const { lng, lat } = sunCoords();
  const times = sunTimes(dateYmd, lng, lat);
  dateLabel.textContent = formatChipDate(dateYmd);
  dateTime.textContent = formatClock(mode === "sunrise" ? times.sunrise : times.sunset);
  dateInput.value = dateYmd;
  dateInput.setAttribute(
    "aria-label",
    `Date, ${dateLabel.textContent}, ${mode} ${dateTime.textContent}`,
  );
}

function setSheetSpace(): void {
  const space = sheet.getBoundingClientRect().height + 56;
  document.documentElement.style.setProperty("--sheet-space", `${space}px`);
  if (map?.loaded()) {
    map.setPadding({ top: 88, bottom: space, left: 12, right: 12 });
  }
}

function sizeSheet(): void {
  const clone = sheetInner.cloneNode(true) as HTMLElement;
  clone.style.position = "absolute";
  clone.style.visibility = "hidden";
  clone.style.pointerEvents = "none";
  clone.style.width = `${sheetInner.getBoundingClientRect().width}px`;
  clone.style.height = "auto";
  clone.style.overflow = "visible";
  sheet.append(clone);
  const to = Math.max(clone.scrollHeight, 72);
  clone.remove();
  sheet.style.gridTemplateRows = `${to}px`;
  setSheetSpace();
  window.setTimeout(setSheetSpace, reduceMotion ? 0 : 220);
}

function paintSheet(): void {
  if (loadError) {
    renderSheet(sheetInner, { kind: "error", message: loadError });
    sheetInner.querySelector("[data-retry]")?.addEventListener("click", () => {
      void loadSpots();
    });
  } else {
    const feature = selectedFeature();
    if (!feature) {
      renderSheet(sheetInner, { kind: "empty" });
    } else {
      renderSheet(sheetInner, {
        kind: "spot",
        spot: feature.properties,
        mode,
      });
    }
  }
  sizeSheet();
}

function applyPinFilter(): void {
  if (!map?.getLayer("spots-pins")) return;
  map.setFilter("spots-pins", modeFilter(mode));
}

function setFeatureSelected(id: string, selected: boolean): void {
  if (!map?.getSource("spots")) return;
  map.setFeatureState({ source: "spots", id }, { selected });
}

function setSelected(id: string | null, fly = true): void {
  if (selectedId) setFeatureSelected(selectedId, false);
  selectedId = id;
  if (id) {
    setFeatureSelected(id, true);
    const feature = spotsById.get(id);
    if (fly && feature && map) {
      map.easeTo({
        center: feature.geometry.coordinates,
        zoom: Math.max(map.getZoom(), 15.4),
        pitch: 60,
        duration: reduceMotion ? 0 : 450,
      });
    }
  }
  syncDateChip();
  paintSheet();
}

function setMode(next: Mode): void {
  mode = next;
  for (const input of modeInputs) {
    input.checked = input.value === next;
  }
  const current = selectedFeature();
  if (current && !matchesMode(current.properties.best_for, next)) {
    applyPinFilter();
    setSelected(null);
    return;
  }
  applyPinFilter();
  syncDateChip();
  paintSheet();
}

async function loadSpots(): Promise<void> {
  if (!map) return;
  try {
    const response = await fetch(SPOTS_URL);
    if (!response.ok) {
      throw new Error(`Couldn’t load spots (${response.status}).`);
    }
    const collection = (await response.json()) as SpotCollection;
    spotsById.clear();
    for (const feature of collection.features) {
      spotsById.set(feature.properties.id, feature);
    }
    loadError = null;
    const source = map.getSource("spots") as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(collection);
    } else {
      map.addSource("spots", {
        type: "geojson",
        data: collection,
        promoteId: "id",
      });
      map.addLayer({
        id: "spots-pins",
        type: "symbol",
        source: "spots",
        filter: modeFilter(mode),
        layout: {
          "icon-image": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            [
              "match",
              ["get", "best_for"],
              "sunrise",
              "pin-sunrise-on",
              "sunset",
              "pin-sunset-on",
              "pin-both-on",
            ],
            [
              "match",
              ["get", "best_for"],
              "sunrise",
              "pin-sunrise",
              "sunset",
              "pin-sunset",
              "pin-both",
            ],
          ],
          "icon-size": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            1.85,
            1.45,
          ],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
      });
      map.on("mouseenter", "spots-pins", () => {
        map!.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "spots-pins", () => {
        map!.getCanvas().style.cursor = "";
      });
    }
    applyPinFilter();
    const fromHash = window.location.hash.replace(/^#/, "");
    const hashed = fromHash ? spotsById.get(fromHash) : undefined;
    if (!selectedId && hashed) {
      const best = hashed.properties.best_for;
      if (best !== "both" && best !== mode) {
        setMode(best);
      }
      setSelected(fromHash);
    } else if (selectedId && !spotsById.has(selectedId)) {
      setSelected(null, false);
    } else {
      paintSheet();
    }
  } catch (error) {
    loadError =
      error instanceof Error && error.message !== "Failed to fetch"
        ? error.message
        : "Couldn’t load spots. Check the connection and retry.";
    paintSheet();
  }
}

function startMap(): void {
  try {
    map = new maplibregl.Map({
      container: "map",
      style: STYLE_URL,
      center: DOWNTOWN_DALLAS,
      zoom: 14,
      pitch: 60,
      bearing: -17,
      fadeDuration: reduceMotion ? 0 : 200,
      attributionControl: false,
    });
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-left",
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : "";
    loadError = /webgl/i.test(detail)
      ? "Couldn’t start the map in this browser."
      : "Couldn’t start the map.";
    paintSheet();
    return;
  }

  map.on("load", () => {
    if (!map) return;
    ensure3dBuildings(map);
    void registerPinImages(map).then(() => loadSpots());
    setSheetSpace();
  });

  map.on("click", (event) => {
    if (!map?.getLayer("spots-pins")) {
      setSelected(null);
      return;
    }
    const pad = 16;
    const hits = map.queryRenderedFeatures(
      [
        [event.point.x - pad, event.point.y - pad],
        [event.point.x + pad, event.point.y + pad],
      ],
      { layers: ["spots-pins"] },
    );
    const hit = hits[0];
    if (!hit) {
      setSelected(null);
      return;
    }
    const id = String(hit.properties?.id ?? hit.id ?? "");
    if (!spotsById.get(id)) return;
    setSelected(id);
  });
}

for (const input of modeInputs) {
  input.addEventListener("change", () => {
    if (input.checked) setMode(input.value as Mode);
  });
}

dateInput.min = "2020-01-01";
dateInput.addEventListener("change", () => {
  if (!dateInput.value) return;
  dateYmd = dateInput.value;
  syncDateChip();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setSelected(null);
});

window.addEventListener("resize", setSheetSpace);

document.querySelector("#zoom-in")!.innerHTML = plusIcon;
document.querySelector("#zoom-out")!.innerHTML = minusIcon;
document.querySelector("#compass")!.innerHTML = northIcon;
document.querySelector("#zoom-in")!.addEventListener("click", () => map?.zoomIn());
document.querySelector("#zoom-out")!.addEventListener("click", () => map?.zoomOut());
document.querySelector("#compass")!.addEventListener("click", () => {
  map?.easeTo({ bearing: 0, pitch: 60, duration: reduceMotion ? 0 : 400 });
});

setMode(mode);
startMap();
