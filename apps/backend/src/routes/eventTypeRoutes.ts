import type { FastifyInstance } from "fastify";

import { AppError } from "../lib/errors.js";
import { EventTypeService } from "../services/eventTypeService.js";

export function registerEventTypeRoutes(app: FastifyInstance, eventTypeService: EventTypeService) {
  app.get("/event-types", async () => eventTypeService.listEventTypes());

  app.post("/event-types", async (request, reply) => {
    try {
      const created = eventTypeService.createEventType(request.body);
      return reply.code(201).send(created);
    } catch (error) {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send({ code: error.code, message: error.message });
      }

      throw error;
    }
  });
}