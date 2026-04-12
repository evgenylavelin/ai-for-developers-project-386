import type { FastifyInstance } from "fastify";

import { AppError } from "../lib/errors.js";
import { ScheduleService } from "../services/scheduleService.js";

export function registerScheduleRoutes(app: FastifyInstance, scheduleService: ScheduleService) {
  app.get("/schedule", async () => scheduleService.getSchedule());

  app.put("/schedule", async (request, reply) => {
    try {
      return scheduleService.updateSchedule(request.body);
    } catch (error) {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send({ code: error.code, message: error.message });
      }

      throw error;
    }
  });
}