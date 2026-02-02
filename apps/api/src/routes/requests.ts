import { Hono } from "hono";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import {
    FileRequestModel,
    type FileRequestDocument,
} from "../db/models/FileRequest";
import { AuthSessionModel } from "../db/models/AuthSession";
import { FileModel } from "../db/models/File";
import { requireAuth } from "../middleware/auth";

const TOKEN_TTL_MS = 1000 * 60 * 60; // 1 hour

const router = new Hono();

router.post("/", async (context) => {
    const body = await context.req.json().catch(() => null);

    if (!body?.password || typeof body.password !== "string") {
        return context.json({ error: "Invalid password" }, 400);
    }

    const passwordHash = await bcrypt.hash(body.password, 10);

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

    if (!body?.password || typeof body.password !== "string") {
        return context.json({ error: "Invalid password" }, 400);
    }

    const request =
        await FileRequestModel.findById(id).lean<FileRequestDocument>();
    if (!request) {
        return context.json({ error: "Not found" }, 404);
    }

    const isValidPassword = await bcrypt.compare(
        body.password,
        request.passwordHash,
    );

    if (!isValidPassword) {
        return context.json({ error: "Unauthorized" }, 401);
    }

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
    const auth = context.get("auth");
    if (auth?.scopeId !== id) {
        return context.json({ error: "Unauthorized" }, 401);
    }

    return context.json({ id });
});

router.post("/:id/files/initiate", requireAuth("request"), async (context) => {
    const { id } = context.req.param();
    const auth = context.get("auth");
    if (auth.scopeId !== id) {
        return context.json({ error: "Unauthorized" }, 401);
    }

    const body = await context.req.json().catch(() => null);
    if (!body?.originalName || !body?.mimeType || !body?.size) {
        return context.json({ error: "Invalid payload" }, 400);
    }

    const uploadToken = randomBytes(24).toString("base64url");
    const file = await FileModel.create({
        requestId: id,
        originalName: body.originalName,
        mimeType: body.mimeType,
        size: body.size,
        status: "pending",
        uploadToken,
        storageKey: uploadToken,
    });

    const origin = new URL(context.req.url).origin;
    const uploadUrl = `${origin}/mock-s3/upload/${uploadToken}`;

    return context.json({ fileId: file.id, uploadUrl });
});

router.post(
    "/:id/files/:fileId/complete",
    requireAuth("request"),
    async (context) => {
        const { id, fileId } = context.req.param();
        const auth = context.get("auth");
        if (auth.scopeId !== id) {
            return context.json({ error: "Unauthorized" }, 401);
        }

        const file = await FileModel.findOne({ _id: fileId, requestId: id });
        if (!file) {
            return context.json({ error: "Not found" }, 404);
        }

        file.status = "uploaded";
        file.uploadToken = undefined;
        await file.save();

        return context.json({ ok: true });
    },
);

router.get("/:id/files", requireAuth("request"), async (context) => {
    const { id } = context.req.param();
    const auth = context.get("auth");
    if (auth.scopeId !== id) {
        return context.json({ error: "Unauthorized" }, 401);
    }

    const files = await FileModel.find({ requestId: id, status: "uploaded" })
        .sort({ createdAt: -1 })
        .lean();

    return context.json({
        files: files.map((file) => ({
            id: String(file._id),
            name: file.originalName,
            size: file.size,
            mimeType: file.mimeType,
            uploadedAt: file.createdAt,
            status: file.status,
        })),
    });
});

export default router;
