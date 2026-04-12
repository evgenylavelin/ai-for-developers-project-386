import { defaultSchedule, type OwnerSchedule } from "../types.js";

export class InMemoryScheduleRepository {
  private schedule: OwnerSchedule = cloneSchedule(defaultSchedule);

  get(): OwnerSchedule {
    return cloneSchedule(this.schedule);
  }

  save(schedule: OwnerSchedule): OwnerSchedule {
    this.schedule = cloneSchedule(schedule);
    return cloneSchedule(this.schedule);
  }
}

function cloneSchedule(schedule: OwnerSchedule): OwnerSchedule {
  return {
    ...schedule,
    workingDays: [...schedule.workingDays],
  };
}