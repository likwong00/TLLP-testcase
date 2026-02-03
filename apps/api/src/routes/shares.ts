import { Hono } from "hono";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { ShareModel, type ShareDocument } from "../db/models/Share";
import { AuthSessionModel } from "../db/models/AuthSession";
import { FileModel, type FileDocument } from "../db/models/File";
import { requireAuth } from "../middleware/auth";

const TOKEN_TTL_MS = 1000 * 60 * 60; // 1 hour

const router = new Hono();

router.post("/:id/auth", async (context) => {
    const { id } = context.req.param();
    const body = await context.req.json().catch(() => null);

    if (!body?.password || typeof body.password !== "string") {
        return context.json({ error: "Invalid password" }, 400);
    }

    const share = await ShareModel.findById(id).lean<ShareDocument>();
    if (!share) {
        return context.json({ error: "Not found" }, 404);
    }

    const isValidPassword = await bcrypt.compare(
        body.password,
        share.passwordHash,
    );

    if (!isValidPassword) {
        return context.json({ error: "Unauthorized" }, 401);
    }

    const token = randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    await AuthSessionModel.create({
        token,
        scope: "share",
        scopeId: id,
        expiresAt,
    });

    return context.json({ token });
});

router.get("/:id/files", requireAuth("share"), async (context) => {
    const { id } = context.req.param();
    const auth = context.get("auth");
    if (auth.scopeId !== id) {
        return context.json({ error: "Unauthorized" }, 401);
    }

    const share = await ShareModel.findById(id).lean<ShareDocument>();
    if (!share) {
        return context.json({ error: "Not found" }, 404);
    }

    const files = await FileModel.find({
        _id: { $in: share.fileIds },
        status: "uploaded",
    })
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

router.post(
    "/:id/files/:fileId/download-url",
    requireAuth("share"),
    async (context) => {
        const { id, fileId } = context.req.param();
        const auth = context.get("auth");
        if (auth.scopeId !== id) {
            return context.json({ error: "Unauthorized" }, 401);
        }

        const share = await ShareModel.findById(id).lean<ShareDocument>();
        if (!share) {
            return context.json({ error: "Not found" }, 404);
        }

        const isFileAllowed = share.fileIds.some(
            (storedId) => String(storedId) === fileId,
        );
        if (!isFileAllowed) {
            return context.json({ error: "Not found" }, 404);
        }

        const file = await FileModel.findById(fileId).lean<FileDocument>();
        if (!file || file.status !== "uploaded" || !file.storageKey) {
            return context.json({ error: "Not found" }, 404);
        }

        const origin = new URL(context.req.url).origin;
        const filename = encodeURIComponent(file.originalName);
        const url = `${origin}/mock-s3/download/${file.storageKey}?filename=${filename}`;

        return context.json({ url });
    },
);

export default router;
