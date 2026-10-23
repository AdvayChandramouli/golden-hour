import SunCalc from "suncalc";

export type Mode = "sunrise" | "sunset";

export const TIME_ZONE = "America/Chicago";
export const DOWNTOWN_DALLAS: [number, number] = [-96.797, 32.7767];

export interface DaySun {
  sunrise: Date;
  sunset: Date;
  solarNoon: Date;
}

export function chicagoTodayYmd(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const lookup = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${lookup("year")}-${lookup("month")}-${lookup("day")}`;
}

/** Midday on a Chicago calendar date, so suncalc stays on the intended day. */
export function chicagoNoon(ymd: string): Date {
  const [year, month, day] = ymd.split("-").map(Number);
  let date = new Date(Date.UTC(year, month - 1, day, 18, 0, 0));
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIME_ZONE,
      hour: "numeric",
      hourCycle: "h23",
    }).format(date),
  );
  date = new Date(date.getTime() + (12 - hour) * 60 * 60 * 1000);
  return date;
}

export function sunTimes(ymd: string, lng: number, lat: number): DaySun {
  const times = SunCalc.getTimes(chicagoNoon(ymd), lat, lng);
  return {
    sunrise: times.sunrise,
    sunset: times.sunset,
    solarNoon: times.solarNoon,
  };
}

export function defaultMode(now = new Date()): Mode {
  const ymd = chicagoTodayYmd(now);
  const times = sunTimes(ymd, DOWNTOWN_DALLAS[0], DOWNTOWN_DALLAS[1]);
  return now >= times.solarNoon ? "sunset" : "sunrise";
}

export function formatClock(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatChipDate(ymd: string): string {
  const noon = chicagoNoon(ymd);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).formatToParts(noon);
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("weekday")} ${get("month")} ${get("day")}`;
}
