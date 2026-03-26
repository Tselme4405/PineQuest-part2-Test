/**
 * Custom Next.js server with Socket.IO.
 * Run with: npx tsx server.ts   (dev)
 *       or: NODE_ENV=production npx tsx server.ts   (prod)
 */

import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import { setIO } from "./lib/socket-server";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT ?? "3000", 10);

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    path: "/api/socketio",
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  setIO(io);

  io.on("connection", (socket) => {
    socket.on("join:teacher", () => {
      socket.join("teachers");
    });

    socket.on("join:session", (sessionId: string) => {
      socket.join(`session:${sessionId}`);
    });

    socket.on("disconnect", () => {
      // cleanup handled by socket.io
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
