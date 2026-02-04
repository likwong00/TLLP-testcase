import { Hono } from "hono";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import {
    RequestAuthBodySchema,
    RequestCreateBodySchema,
} from "@file-service/shared";
import {
    FileRequestModel,
    type FileRequestDocument,
} from "../../db/models/FileRequest";
import { AuthSessionModel } from "../../db/models/AuthSession";
import { requireAuth } from "../../middleware/auth";
import {
    checkAndRecordAuthAttempt,
    resetAuthAttempts,
} from "../../utils/limits";
import { validateRequestId } from "./utils";

const TOKEN_TTL_MS = 1000 * 60 * 60; // 1 hour

const router = new Hono();

router.post("/", async (context) => {
    const body = await context.req.json().catch(() => null);
    const parsedBody = RequestCreateBodySchema.safeParse(body);
    if (!parsedBody.success) {
        return context.json(
            {
                error: "Invalid request body",
                details: parsedBody.error.flatten(),
            },
            400,
        );
    }

    const passwordHash = await bcrypt.hash(parsedBody.data.password, 10);

    const request = await FileRequestModel.create({ passwordHash });

    const token = randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    await AuthSessionModel.create({
        token,
        scope: "request",
        scopeId: request.id,
        expiresAt,
    });

    return context.json({ id: request.id, token });
});

router.post("/:id/auth", async (context) => {
    const { id } = context.req.param();
    const body = await context.req.json().catch(() => null);

    const idError = validateRequestId(context, id);
    if (idError) return idError;

    const parsedBody = RequestAuthBodySchema.safeParse(body);
    if (!parsedBody.success) {
        return context.json(
            {
                error: "Invalid request body",
                details: parsedBody.error.flatten(),
            },
            400,
        );
    }

    const request =
        await FileRequestModel.findById(id).lean<FileRequestDocument>();
    if (!request) {
        return context.json({ error: "Not found" }, 404);
    }

    const rateKey = `request:${id}`;
    const rate = checkAndRecordAuthAttempt(rateKey);
    if (!rate.allowed) {
        const retryAfter = Math.max(
            1,
            Math.ceil((rate.resetAt - Date.now()) / 1000),
        );
        context.header("Retry-After", String(retryAfter));
        return context.json({ error: "Too many attempts" }, 429);
    }

    const isValidPassword = await bcrypt.compare(
        parsedBody.data.password,
        request.passwordHash,
    );

    if (!isValidPassword) {
        return context.json({ error: "Invalid Password" }, 401);
    }

    resetAuthAttempts(rateKey);

    const token = randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    await AuthSessionModel.create({
        token,
        scope: "request",
        scopeId: id,
        expiresAt,
    });

    return context.json({ token });
});

router.get("/:id", requireAuth("request"), async (context) => {
    const { id } = context.req.param();
    const idError = validateRequestId(context, id);
    if (idError) return idError;

    const auth = context.get("auth");
    if (auth?.scopeId !== id) {
        return context.json({ error: "Unauthorized" }, 401);
    }

    return context.json({ id });
});

router.get("/:id/exists", async (context) => {
    const { id } = context.req.param();
    const idError = validateRequestId(context, id);
    if (idError) return idError;

    const exists = await FileRequestModel.exists({ _id: id });
    return context.json({ exists: Boolean(exists) });
});

export default router;
