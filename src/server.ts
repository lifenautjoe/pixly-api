import "dotenv/config";
import validateEnv from "./utils/validateEnv";
import "reflect-metadata";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import hpp from "hpp";
import morgan from "morgan";
import compression from "compression";
import errorMiddleware from "./middlewares/error.middleware";
import { logger, stream } from "./utils/logger";
import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { PixlyService } from "./services/PixlyService";

validateEnv();

const app = express();
const port = process.env.PORT || 80;
const corsOrigin = process.env.CORS_ORIGIN || "*";
const env = process.env.NODE_ENV || "development";

// Middleware

if (env === "production") {
  app.use(morgan("combined", { stream }));
  app.use(cors({ origin: true, credentials: true }));
} else if (env === "development") {
  app.use(morgan("dev", { stream }));
  app.use(cors({ origin: true, credentials: true }));
}

app.use(hpp());
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes (if we had any)

// ...

// Error handlers

app.use(errorMiddleware);

// Start server

const server = new HttpServer(app);
const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"],
  },
});

new PixlyService(io, logger);

server.listen(port, () => {
  logger.info(`👾 Pixly is now listening on port ${port}`);
});
