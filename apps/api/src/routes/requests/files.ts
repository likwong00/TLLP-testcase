import { Hono } from "hono";
import { randomBytes } from "node:crypto";
import { RequestFileInitiateBodySchema } from "@file-service/shared";
import { FileModel } from "../../db/models/File";
import {
    FileRequestModel,
    type FileRequestDocument,
} from "../../db/models/FileRequest";
import { MultipartUploadModel } from "../../db/models/MultipartUpload";
import { ShareModel } from "../../db/models/Share";
import { requireAuth } from "../../middleware/auth";
import {
    MAX_FILE_SIZE_BYTES,
    MAX_FILES_PER_REQUEST,
    MULTIPART_PART_SIZE_BYTES,
} from "../../utils/limits";
import { validateFileId, validateRequestId } from "./utils";

const router = new Hono();

router.post("/:id/files/initiate", requireAuth("request"), async (context) => {
    const { id } = context.req.param();
    const idError = validateRequestId(context, id);
    if (idError) return idError;

    const auth = context.get("auth");
    if (auth.scopeId !== id) {
        return context.json({ error: "Unauthorized" }, 401);
    }

    const body = await context.req.json().catch(() => null);
    const parsedBody = RequestFileInitiateBodySchema.safeParse(body);
    if (!parsedBody.success) {
        return context.json(
            { error: "Invalid payload", details: parsedBody.error.flatten() },
            400,
        );
    }

    if (parsedBody.data.size > MAX_FILE_SIZE_BYTES) {
        return context.json(
            {
                error: `File too large (max ${Math.floor(
                    MAX_FILE_SIZE_BYTES / (1024 * 1024),
                )} MB)`,
            },
            413,
        );
    }

    const existingCount = await FileModel.countDocuments({ requestId: id });
    if (existingCount >= MAX_FILES_PER_REQUEST) {
        return context.json(
            {
                error: `File limit exceeded (max ${MAX_FILES_PER_REQUEST})`,
            },
            400,
        );
    }

    const duplicate = await FileModel.findOne({
        requestId: id,
        originalName: parsedBody.data.originalName,
        size: parsedBody.data.size,
        status: { $in: ["pending", "uploaded"] },
    }).lean();

    if (duplicate) {
        return context.json({ error: "File already exists" }, 409);
    }

    const isMultipart = Boolean(
        (parsedBody.data as { multipart?: boolean }).multipart,
    );
    const file = await FileModel.create({
        requestId: id,
        originalName: parsedBody.data.originalName,
        mimeType: parsedBody.data.mimeType,
        size: parsedBody.data.size,
        status: "pending",
        uploadToken: isMultipart ? undefined : undefined,
        storageKey: isMultipart ? undefined : undefined,
    });

    const origin = new URL(context.req.url).origin;

    if (isMultipart) {
        const uploadId = randomBytes(24).toString("base64url");
        await MultipartUploadModel.create({
            fileId: file._id,
            uploadId,
            partSize: MULTIPART_PART_SIZE_BYTES,
            parts: [],
            status: "pending",
        });

        return context.json({
            type: "multipart",
            fileId: file.id,
            uploadId,
            partSize: MULTIPART_PART_SIZE_BYTES,
        });
    }

    const uploadToken = randomBytes(24).toString("base64url");
    file.uploadToken = uploadToken;
    file.storageKey = uploadToken;
    await file.save();

    const uploadUrl = `${origin}/mock-s3/upload/${uploadToken}`;

    return context.json({ fileId: file.id, uploadUrl });
});

router.post(
    "/:id/files/:fileId/complete",
    requireAuth("request"),
    async (context) => {
        const { id, fileId } = context.req.param();
        const idError = validateRequestId(context, id);
        if (idError) return idError;

        const fileIdError = validateFileId(context, fileId);
        if (fileIdError) return fileIdError;

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

        const request =
            await FileRequestModel.findById(id).lean<FileRequestDocument>();
        if (request?.shareId) {
            await ShareModel.findByIdAndUpdate(request.shareId, {
                $addToSet: { fileIds: file._id },
            });
        }

        return context.json({ ok: true });
    },
);

router.get("/:id/files", requireAuth("request"), async (context) => {
    const { id } = context.req.param();
    const idError = validateRequestId(context, id);
    if (idError) return idError;

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
