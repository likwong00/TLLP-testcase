import { Hono } from "hono";
import { cors } from "hono/cors";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { CORS_ORIGIN, DEV_SEED_ENABLED, NODE_ENV } from "./env";
import { FileRequestModel } from "./db/models/FileRequest";
import { FileModel } from "./db/models/File";
import { AuthSessionModel } from "./db/models/AuthSession";
import { ShareModel } from "./db/models/Share";
import requestsRouter from "./routes/requests";
import mockS3Router from "./routes/mockS3";
import sharesRouter from "./routes/shares";

export const createServer = () => {
    const app = new Hono();

    app.use(
        "*",
        cors({
            origin: CORS_ORIGIN,
            credentials: true,
        }),
    );

    app.get("/health", (context) => context.json({ ok: true }));

    app.route("/requests", requestsRouter);
    app.route("/shares", sharesRouter);
    app.route("/mock-s3", mockS3Router);

    app.post("/dev/seed-request", async (context) => {
        if (!DEV_SEED_ENABLED || NODE_ENV === "production") {
            return context.json({ error: "Dev seed disabled" }, 404);
        }

        const password = randomBytes(6).toString("base64url");
        const passwordHash = await bcrypt.hash(password, 10);

        const request = await FileRequestModel.create({ passwordHash });

        return context.json({
            requestId: request.id,
            password,
        });
    });

    app.get("/dev/dump", async (context) => {
        if (!DEV_SEED_ENABLED || NODE_ENV === "production") {
            return context.json({ error: "Dev dump disabled" }, 404);
        }

        const [requests, files, sessions, shares] = await Promise.all([
            FileRequestModel.find().lean(),
            FileModel.find().lean(),
            AuthSessionModel.find().lean(),
            ShareModel.find().lean(),
        ]);

        return context.json({ requests, files, sessions, shares });
    });

    return app;
};
