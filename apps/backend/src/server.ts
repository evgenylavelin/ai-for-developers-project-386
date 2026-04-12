import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 3001);
const app = createApp();

app.listen({ port, host: "0.0.0.0" }).catch((error: Error) => {
  app.log.error(error);
  process.exit(1);
});