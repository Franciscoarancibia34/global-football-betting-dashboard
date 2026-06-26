import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { createLiveOddsEngine } from "@/app/lib/realtime/live-engine";
import { logger } from "@/app/lib/server/logger";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.APP_HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? 3000);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    await handle(req, res);
  });

  const io = new Server(httpServer, {
    path: "/api/socket",
    cors: { origin: "*" }
  });

  const liveEngine = createLiveOddsEngine(io);
  liveEngine.start();

  io.on("connection", (socket) => {
    logger.info({ socketId: socket.id }, "socket connected");
    socket.emit("connection-status", { status: "LIVE", at: new Date().toISOString() });
    socket.on("disconnect", () => logger.info({ socketId: socket.id }, "socket disconnected"));
  });

  httpServer.listen(port, hostname, () => {
    logger.info(`Global Football Betting Intelligence Dashboard ready on http://localhost:${port}`);
  });
});
