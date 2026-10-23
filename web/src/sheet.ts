import { accessIcon, settingSunIcon, sunIcon } from "./icons";
import type { Mode } from "./sun";
import type { Access, Spot } from "./types";

export type SheetState =
  | { kind: "empty" }
  | { kind: "error"; message: string }
  | { kind: "spot"; spot: Spot; mode: Mode };

function accessCopy(access: Access): string {
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

function emphasize(word: string, on: boolean): string {
  const cls = on ? "spot__emphasis" : "";
  return `<span class="${cls}">${escapeHtml(word)}</span>`;
}

function bestForLine(bestFor: Spot["best_for"], mode: Mode): string {
  const icon = bestFor === "sunset" || (bestFor === "both" && mode === "sunset")
    ? settingSunIcon
    : sunIcon;
  if (bestFor === "both") {
    return `${icon} Best for ${emphasize("sunrise", mode === "sunrise")} and ${emphasize("sunset", mode === "sunset")}`;
  }
  return `${icon} Best for ${emphasize(bestFor, true)}`;
}

export function renderSheet(inner: HTMLElement, state: SheetState): void {
  if (state.kind === "empty") {
    inner.innerHTML = `<p class="sheet-empty">Tap a spot</p>`;
    inner.className = "sheet__inner is-empty";
    return;
  }

  if (state.kind === "error") {
    inner.innerHTML = `
      <div class="sheet-error">
        <p class="sheet-error__msg">${escapeHtml(state.message)}</p>
        <button type="button" class="retry" data-retry>Retry</button>
      </div>`;
    inner.className = "sheet__inner is-error";
    return;
  }

  const { spot, mode } = state;
  const access = accessCopy(spot.access);
  const uncertainAccess =
    spot.access === "restricted" || spot.access === "unknown";
  const score = spot.horizon_score?.[mode] ?? null;
  const horizon =
    score === null
      ? ""
      : `<div class="horizon" role="meter" aria-label="${mode} horizon ${score.toFixed(2)}" aria-valuemin="0" aria-valuemax="1" aria-valuenow="${score}">
          <span class="horizon__value tabular">${score.toFixed(2)} <span class="horizon__mode">${escapeHtml(mode)}</span></span>
          <span class="horizon__track"><span class="horizon__fill" style="--horizon: ${Math.max(0, Math.min(1, score))}"></span></span>
        </div>`;

  inner.innerHTML = `
    <div class="spot">
      <div class="spot__main">
        <h2 class="spot__name">${escapeHtml(spot.name)}</h2>
        <p class="spot__meta">
          <span class="spot__row">${bestForLine(spot.best_for, mode)}</span>
          <span class="spot__row ${uncertainAccess ? "is-uncertain" : ""}">${accessIcon} Access ${escapeHtml(access)}</span>
          ${spot.verified === false ? `<span class="spot__mark">Uncertain</span>` : ""}
        </p>
      </div>
      ${horizon}
    </div>`;
  inner.className = "sheet__inner is-spot";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
