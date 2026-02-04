import { Hono } from "hono";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import {
    FileIdSchema,
    ShareAuthBodySchema,
    ShareIdSchema,
} from "@file-service/shared";
import { ShareModel, type ShareDocument } from "../db/models/Share";
import { AuthSessionModel } from "../db/models/AuthSession";
import { FileModel, type FileDocument } from "../db/models/File";
import { requireAuth } from "../middleware/auth";
import {
    MAX_FILES_PER_SHARE,
    checkAndRecordAuthAttempt,
    resetAuthAttempts,
} from "../utils/limits";

const TOKEN_TTL_MS = 1000 * 60 * 60; // 1 hour

const router = new Hono();

router.post("/:id/auth", async (context) => {
    const { id } = context.req.param();
    const body = await context.req.json().catch(() => null);

    const parsedId = ShareIdSchema.safeParse(id);
    if (!parsedId.success || !mongoose.Types.ObjectId.isValid(id)) {
        return context.json(
            {
                error: "Invalid Share ID",
                details: parsedId.success
                    ? undefined
                    : parsedId.error.flatten(),
            },
            400,
        );
    }

    const parsedBody = ShareAuthBodySchema.safeParse(body);
    if (!parsedBody.success) {
        return context.json(
            {
                error: "Invalid request body",
                details: parsedBody.error.flatten(),
            },
            400,
        );
    }

    const share = await ShareModel.findById(id).lean<ShareDocument>();
    if (!share) {
        return context.json({ error: "Not found" }, 404);
    }

    const rateKey = `share:${id}`;
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
        share.passwordHash,
    );

    if (!isValidPassword) {
        return context.json({ error: "Invalid Password" }, 401);
    }

    resetAuthAttempts(rateKey);

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

router.get("/:id/exists", async (context) => {
    const { id } = context.req.param();
    const parsedId = ShareIdSchema.safeParse(id);
    if (!parsedId.success || !mongoose.Types.ObjectId.isValid(id)) {
        return context.json(
            {
                error: "Invalid Share ID",
                details: parsedId.success
                    ? undefined
                    : parsedId.error.flatten(),
            },
            400,
        );
    }

    const exists = await ShareModel.exists({ _id: id });
    return context.json({ exists: Boolean(exists) });
});

router.get("/:id/files", requireAuth("share"), async (context) => {
    const { id } = context.req.param();
    const parsedId = ShareIdSchema.safeParse(id);
    if (!parsedId.success || !mongoose.Types.ObjectId.isValid(id)) {
        return context.json(
            {
                error: "Invalid Share ID",
                details: parsedId.success
                    ? undefined
                    : parsedId.error.flatten(),
            },
            400,
        );
    }
    const auth = context.get("auth");
    if (auth.scopeId !== id) {
        return context.json({ error: "Unauthorized" }, 401);
    }

    const share = await ShareModel.findById(id).lean<ShareDocument>();
    if (!share) {
        return context.json({ error: "Not found" }, 404);
    }

    if (share.fileIds.length > MAX_FILES_PER_SHARE) {
        return context.json(
            {
                error: `Share file limit exceeded (max ${MAX_FILES_PER_SHARE})`,
            },
            400,
        );
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
        const parsedId = ShareIdSchema.safeParse(id);
        if (!parsedId.success || !mongoose.Types.ObjectId.isValid(id)) {
            return context.json(
                {
                    error: "Invalid Share ID",
                    details: parsedId.success
                        ? undefined
                        : parsedId.error.flatten(),
                },
                400,
            );
        }
        const parsedFileId = FileIdSchema.safeParse(fileId);
        if (!parsedFileId.success || !mongoose.Types.ObjectId.isValid(fileId)) {
            return context.json(
                {
                    error: "Invalid file id",
                    details: parsedFileId.success
                        ? undefined
                        : parsedFileId.error.flatten(),
                },
                400,
            );
        }
        const auth = context.get("auth");
        if (auth.scopeId !== id) {
            return context.json({ error: "Unauthorized" }, 401);
        }

        const share = await ShareModel.findById(id).lean<ShareDocument>();
        if (!share) {
            return context.json({ error: "Not found" }, 404);
        }

        if (share.fileIds.length > MAX_FILES_PER_SHARE) {
            return context.json(
                {
                    error: `Share file limit exceeded (max ${MAX_FILES_PER_SHARE})`,
                },
                400,
            );
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
