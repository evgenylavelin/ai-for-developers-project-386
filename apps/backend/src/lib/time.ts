import type { DayOfWeek } from "../types.js";

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function parseTime(value: string): number | null {
  const match = timePattern.exec(value);

  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

export function isValidTimeRange(startTime: string, endTime: string): boolean {
  const startMinutes = parseTime(startTime);
  const endMinutes = parseTime(endTime);

  return startMinutes !== null && endMinutes !== null && startMinutes < endMinutes;
}

export function weekday(date: Date): DayOfWeek {
  switch (date.getUTCDay()) {
    case 0:
      return "sunday";
    case 1:
      return "monday";
    case 2:
      return "tuesday";
    case 3:
      return "wednesday";
    case 4:
      return "thursday";
    case 5:
      return "friday";
    case 6:
      return "saturday";
    default:
      return "sunday";
  }
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function differenceInMinutes(later: Date, earlier: Date): number {
  return (later.getTime() - earlier.getTime()) / 60_000;
}

export function bookingWindowEnd(now: Date): Date {
  return addMinutes(now, 14 * 24 * 60);
}

export function setUtcTime(date: Date, time: string): Date {
  const minutes = parseTime(time);

  if (minutes === null) {
    return new Date(NaN);
  }

  const result = new Date(date);
  result.setUTCHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return result;
}
