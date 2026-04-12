import { AppError } from "../lib/errors.js";
import { isValidTimeRange } from "../lib/time.js";
import { InMemoryScheduleRepository } from "../repositories/inMemoryScheduleRepository.js";
import type { DayOfWeek, OwnerSchedule } from "../types.js";

const dayOfWeekValues = new Set<DayOfWeek>([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);

export class ScheduleService {
  constructor(private readonly repository: InMemoryScheduleRepository) {}

  getSchedule() {
    return this.repository.get();
  }

  updateSchedule(input: unknown) {
    const schedule = toOwnerSchedule(input);

    if (schedule.workingDays.length === 0) {
      throw new AppError(400, "bad_request", "Укажите хотя бы один рабочий день.");
    }

    if (schedule.hasInvalidWorkingDays || !schedule.workingDays.every((day) => dayOfWeekValues.has(day))) {
      throw new AppError(400, "bad_request", "Укажите корректные рабочие дни.");
    }

    if (!isValidTimeRange(schedule.startTime, schedule.endTime)) {
      throw new AppError(400, "bad_request", "Укажите корректный диапазон рабочего времени.");
    }

    return this.repository.save({
      workingDays: schedule.workingDays,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
    });
  }
}

function toOwnerSchedule(input: unknown): OwnerSchedule & { hasInvalidWorkingDays: boolean } {
  if (!input || typeof input !== "object") {
    return { workingDays: [], startTime: "", endTime: "", hasInvalidWorkingDays: false };
  }

  const { workingDays, startTime, endTime } = input as Record<string, unknown>;
  const hasInvalidWorkingDays = Array.isArray(workingDays)
    ? workingDays.some((day) => typeof day !== "string")
    : false;

  return {
    workingDays: Array.isArray(workingDays) ? (workingDays.filter((day) => typeof day === "string") as DayOfWeek[]) : [],
    startTime: typeof startTime === "string" ? startTime : "",
    endTime: typeof endTime === "string" ? endTime : "",
    hasInvalidWorkingDays,
  };
}