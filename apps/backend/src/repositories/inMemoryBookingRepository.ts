import type { Booking } from "../types.js";

export class InMemoryBookingRepository {
  private readonly items = new Map<string, Booking>();

  list(): Booking[] {
    return [...this.items.values()].map(cloneBooking);
  }

  get(id: string): Booking | null {
    const booking = this.items.get(id);

    return booking ? cloneBooking(booking) : null;
  }

  save(booking: Booking): Booking {
    const clonedBooking = cloneBooking(booking);

    this.items.set(clonedBooking.id, clonedBooking);

    return cloneBooking(clonedBooking);
  }
}

function cloneBooking(booking: Booking): Booking {
  return { ...booking };
}
