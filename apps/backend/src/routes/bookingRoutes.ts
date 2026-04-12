import type { FastifyInstance } from "fastify";

import { AppError } from "../lib/errors.js";
import { BookingService } from "../services/bookingService.js";

export function registerBookingRoutes(app: FastifyInstance, bookingService: BookingService) {
  app.get("/event-types/:eventTypeId/availability", async (request, reply) => {
    try {
      const { eventTypeId } = request.params as { eventTypeId: string };
      return bookingService.getAvailability(eventTypeId);
    } catch (error) {
      return handleAppError(reply, error);
    }
  });

  app.get("/bookings", async () => bookingService.listBookings());

  app.post("/bookings", async (request, reply) => {
    try {
      const created = bookingService.createBooking(request.body);
      return reply.code(201).send(created);
    } catch (error) {
      return handleAppError(reply, error);
    }
  });

  app.post("/bookings/:bookingId([^:]+)::cancel", async (request, reply) => {
    try {
      const { bookingId: rawBookingId } = request.params as { bookingId: string };
      const bookingId = rawBookingId.endsWith(":cancel") ? rawBookingId.slice(0, -7) : rawBookingId;
      return bookingService.cancelBooking(bookingId);
    } catch (error) {
      return handleAppError(reply, error);
    }
  });
}

function handleAppError(reply: { code: (statusCode: number) => { send: (payload: unknown) => unknown } }, error: unknown) {
  if (error instanceof AppError) {
    return reply.code(error.statusCode).send({ code: error.code, message: error.message });
  }

  throw error;
}
