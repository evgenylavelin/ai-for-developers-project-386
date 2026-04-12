import type { EventType } from "../types.js";

export class InMemoryEventTypeRepository {
  private readonly items = new Map<string, EventType>();

  list(): EventType[] {
    return [...this.items.values()].map(cloneEventType);
  }

  get(id: string): EventType | null {
    const eventType = this.items.get(id);

    return eventType ? cloneEventType(eventType) : null;
  }

  save(eventType: EventType): EventType {
    const clonedEventType = cloneEventType(eventType);

    this.items.set(clonedEventType.id, clonedEventType);

    return cloneEventType(clonedEventType);
  }
}

function cloneEventType(eventType: EventType): EventType {
  return { ...eventType };
}