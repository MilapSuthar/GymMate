import express from "express";
import helmet from "helmet";
import cors from "cors";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler } from "./middleware/errorHandler";
import authRouter from "./modules/auth/auth.router";
import usersRouter from "./modules/users/users.router";
import photosRouter from "./modules/photos/photos.router";
import discoveryRouter from "./modules/discovery/discovery.router";
import swipesRouter from "./modules/swipes/swipes.router";
import matchesRouter from "./modules/matches/matches.router";
import messagesRouter from "./modules/messages/messages.router";
import moderationRouter from "./modules/moderation/moderation.router";
import notificationsRouter from "./modules/notifications/notifications.router";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/users/me/photos", photosRouter);
app.use("/api/v1/discover", discoveryRouter);
app.use("/api/v1/swipes", swipesRouter);
app.use("/api/v1/matches", matchesRouter);
app.use("/api/v1/matches/:matchId/messages", messagesRouter);
app.use("/api/v1/users", moderationRouter);
app.use("/api/v1/device-tokens", notificationsRouter);

app.use(errorHandler);

export default app;
