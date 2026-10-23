import type maplibregl from "maplibre-gl";
import type { BestFor } from "./types";

const COLORS: Record<BestFor, string> = {
  sunrise: "#E8A54B",
  sunset: "#C4471A",
  both: "#7B4B94",
};

function paintPin(
  ctx: CanvasRenderingContext2D,
  kind: BestFor,
  selected: boolean,
): void {
  const size = 64;
  const cx = size / 2;
  const cy = size / 2 - (selected ? 1 : 2);
  const color = COLORS[kind];
  ctx.clearRect(0, 0, size, size);

  if (selected) {
    ctx.beginPath();
    ctx.arc(cx, cy + 2, 26, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = color;
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(cx, cy + 2, 22, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.stroke();
  }

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = selected ? 2.6 : 2.2;

  if (kind === "sunset") {
    ctx.beginPath();
    ctx.arc(cx, cy + 4, 8, Math.PI, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy + 6);
    ctx.lineTo(cx + 14, cy + 6);
    ctx.stroke();
    for (const [x1, y1, x2, y2] of [
      [cx, cy - 12, cx, cy - 7],
      [cx - 10, cy - 6, cx - 6, cy - 2],
      [cx + 10, cy - 6, cx + 6, cy - 2],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    return;
  }

  ctx.beginPath();
  ctx.arc(cx, cy, 7, 0, Math.PI * 2);
  ctx.stroke();
  const rays = 8;
  for (let i = 0; i < rays; i++) {
    const a = (Math.PI / 4) * i - Math.PI / 2;
    const inner = 11;
    const outer = 16;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
    ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
    ctx.stroke();
  }

  if (kind === "both") {
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy + 14);
    ctx.lineTo(cx + 12, cy + 14);
    ctx.stroke();
  }
}

function pinImage(kind: BestFor, selected: boolean): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  paintPin(ctx, kind, selected);
  return ctx.getImageData(0, 0, 64, 64);
}

export async function registerPinImages(map: maplibregl.Map): Promise<void> {
  const kinds: BestFor[] = ["sunrise", "sunset", "both"];
  for (const kind of kinds) {
    const idle = `pin-${kind}`;
    const on = `pin-${kind}-on`;
    if (!map.hasImage(idle)) map.addImage(idle, pinImage(kind, false), { pixelRatio: 2 });
    if (!map.hasImage(on)) map.addImage(on, pinImage(kind, true), { pixelRatio: 2 });
  }
}
