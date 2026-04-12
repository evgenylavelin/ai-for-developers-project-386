import { randomUUID } from "node:crypto";

import { AppError } from "../lib/errors.js";
import { InMemoryEventTypeRepository } from "../repositories/inMemoryEventTypeRepository.js";
import type { CreateEventTypeInput } from "../types.js";

export class EventTypeService {
  constructor(private readonly repository: InMemoryEventTypeRepository) {}

  listEventTypes() {
    return this.repository.list();
  }

  createEventType(input: unknown) {
    const payload = toEventTypeInput(input);

    if (!Number.isInteger(payload.durationMinutes) || payload.durationMinutes <= 0) {
      throw new AppError(400, "bad_request", "durationMinutes must be a positive integer.");
    }

    return this.repository.save({
      id: randomUUID(),
      title: payload.title,
      description: payload.description,
      durationMinutes: payload.durationMinutes,
    });
  }
}

function toEventTypeInput(input: unknown): CreateEventTypeInput {
  if (!input || typeof input !== "object") {
    throw new AppError(400, "bad_request", "title must be a non-empty string.");
  }

  const { title, description, durationMinutes } = input as Record<string, unknown>;
  const trimmedTitle = typeof title === "string" ? title.trim() : "";

  if (!trimmedTitle) {
    throw new AppError(400, "bad_request", "title must be a non-empty string.");
  }

  if (description !== undefined && typeof description !== "string") {
    throw new AppError(400, "bad_request", "description must be a string if provided.");
  }

  if (typeof durationMinutes !== "number") {
    throw new AppError(400, "bad_request", "durationMinutes must be a positive integer.");
  }

  return {
    title: trimmedTitle,
    description: description?.trim() || undefined,
    durationMinutes,
  };
}