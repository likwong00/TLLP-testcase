import { Hono } from "hono";
import { randomBytes } from "node:crypto";
import { createReadStream, createWriteStream, promises as fs } from "node:fs";
import path from "node:path";
import { FileModel } from "../../db/models/File";
import {
    FileRequestModel,
    type FileRequestDocument,
} from "../../db/models/FileRequest";
import { MultipartUploadModel } from "../../db/models/MultipartUpload";
import { ShareModel } from "../../db/models/Share";
import { requireAuth } from "../../middleware/auth";
import { getBlobPath } from "../../storage/blobStore";
import { MAX_MULTIPART_PARTS } from "../../utils/limits";
import { validateFileId, validateRequestId } from "./utils";

const router = new Hono();

router.post(
    "/:id/files/:fileId/multipart/parts",
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

        const body = await context.req.json().catch(() => null);
        const partNumber = Number(body?.partNumber);
        const size = Number(body?.size);
        const uploadId =
            body?.uploadId && typeof body.uploadId === "string"
                ? body.uploadId
                : null;

        if (!uploadId) {
            return context.json({ error: "Upload ID is required" }, 400);
        }
        if (!Number.isInteger(partNumber) || partNumber <= 0) {
            return context.json({ error: "Invalid part number" }, 400);
        }
        if (partNumber > MAX_MULTIPART_PARTS) {
            return context.json({ error: "Part number exceeds limit" }, 400);
        }
        if (!Number.isFinite(size) || size <= 0) {
            return context.json({ error: "Invalid part size" }, 400);
        }

        const file = await FileModel.findOne({ _id: fileId, requestId: id });
        if (!file) {
            return context.json({ error: "Not found" }, 404);
        }

        const multipart = await MultipartUploadModel.findOne({
            fileId: file._id,
            uploadId,
            status: { $in: ["pending", "uploading"] },
        }).sort({ createdAt: -1 });

        if (!multipart) {
            return context.json({ error: "Multipart upload not found" }, 404);
        }

        if (size > multipart.partSize) {
            return context.json({ error: "Part size exceeds limit" }, 400);
        }

        const existingPart = multipart.parts.find(
            (part: { partNumber: number }) => part.partNumber === partNumber,
        );

        const origin = new URL(context.req.url).origin;
        if (existingPart) {
            const uploadUrl = `${origin}/mock-s3/upload-part/${existingPart.uploadToken}`;
            return context.json({ partNumber, uploadUrl });
        }

        if (multipart.parts.length >= MAX_MULTIPART_PARTS) {
            return context.json({ error: "Too many parts" }, 400);
        }

        const uploadToken = randomBytes(24).toString("base64url");
        multipart.parts.push({
            partNumber,
            uploadToken,
            status: "pending",
        });
        multipart.status = "uploading";
        await multipart.save();

        const uploadUrl = `${origin}/mock-s3/upload-part/${uploadToken}`;
        return context.json({ partNumber, uploadUrl });
    },
);

router.post(
    "/:id/files/:fileId/multipart/complete",
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

        const body = await context.req.json().catch(() => null);
        const uploadId =
            body?.uploadId && typeof body.uploadId === "string"
                ? body.uploadId
                : null;
        const parts = Array.isArray(body?.parts) ? body.parts : null;

        const file = await FileModel.findOne({ _id: fileId, requestId: id });
        if (!file) {
            return context.json({ error: "Not found" }, 404);
        }

        const multipart = await MultipartUploadModel.findOne({
            fileId: file._id,
            ...(uploadId ? { uploadId } : {}),
            status: { $in: ["pending", "uploading"] },
        }).sort({ createdAt: -1 });

        if (!multipart) {
            return context.json({ error: "Multipart upload not found" }, 404);
        }

        if (multipart.parts.length === 0) {
            return context.json({ error: "No parts uploaded" }, 400);
        }

        if (multipart.parts.length > MAX_MULTIPART_PARTS) {
            return context.json({ error: "Too many parts" }, 400);
        }

        if (parts) {
            const seen = new Set<number>();
            for (const entry of parts) {
                const partNumber = Number(entry?.partNumber);
                const etag =
                    entry?.etag && typeof entry.etag === "string"
                        ? entry.etag
                        : undefined;
                if (!Number.isInteger(partNumber) || partNumber <= 0) {
                    return context.json({ error: "Invalid part number" }, 400);
                }
                if (seen.has(partNumber)) {
                    return context.json(
                        { error: "Duplicate part number" },
                        400,
                    );
                }
                seen.add(partNumber);
                const stored = multipart.parts.find(
                    (part: { partNumber: number }) =>
                        part.partNumber === partNumber,
                );
                if (!stored) {
                    return context.json({ error: "Missing part" }, 400);
                }
                if (etag) {
                    if (stored.etag && stored.etag !== etag) {
                        return context.json({ error: "ETag mismatch" }, 400);
                    }
                    if (!stored.etag) {
                        stored.etag = etag;
                    }
                }
            }
        }

        const pending = multipart.parts.filter(
            (part: { status: string }) => part.status !== "uploaded",
        );
        if (pending.length > 0) {
            return context.json({ error: "Multipart upload incomplete" }, 400);
        }

        const partNumbers = multipart.parts.map(
            (part: { partNumber: number }) => part.partNumber,
        );
        const uniquePartNumbers = new Set(partNumbers);
        if (uniquePartNumbers.size !== partNumbers.length) {
            return context.json(
                { error: "Duplicate part numbers detected" },
                400,
            );
        }

        const sortedParts = [...multipart.parts].sort(
            (a, b) => a.partNumber - b.partNumber,
        );

        for (let index = 0; index < sortedParts.length; index += 1) {
            if (sortedParts[index].partNumber !== index + 1) {
                return context.json({ error: "Missing part in sequence" }, 400);
            }
        }

        const totalSize = sortedParts.reduce((sum, part) => {
            if (typeof part.size !== "number") {
                return sum;
            }
            return sum + part.size;
        }, 0);

        if (sortedParts.some((part) => typeof part.size !== "number")) {
            return context.json({ error: "Missing part size" }, 400);
        }

        if (totalSize !== file.size) {
            return context.json({ error: "Multipart size mismatch" }, 400);
        }

        const finalKey = multipart.uploadId;
        const finalPath = getBlobPath(finalKey);

        try {
            await fs.mkdir(path.dirname(finalPath), { recursive: true });
            const writeStream = createWriteStream(finalPath, { flags: "w" });

            for (const part of sortedParts) {
                const partPath = getBlobPath(part.uploadToken);
                await new Promise<void>((resolve, reject) => {
                    const readStream = createReadStream(partPath);
                    readStream.on("error", reject);
                    readStream.on("end", resolve);
                    readStream.pipe(writeStream, { end: false });
                });
            }

            await new Promise<void>((resolve, reject) => {
                writeStream.on("error", reject);
                writeStream.on("finish", resolve);
                writeStream.end();
            });

            await Promise.all(
                sortedParts.map((part) =>
                    fs
                        .unlink(getBlobPath(part.uploadToken))
                        .catch(() => undefined),
                ),
            );

            file.storageKey = finalKey;
            file.uploadToken = undefined;
            file.status = "uploaded";
            await file.save();

            const request =
                await FileRequestModel.findById(id).lean<FileRequestDocument>();
            if (request?.shareId) {
                await ShareModel.findByIdAndUpdate(request.shareId, {
                    $addToSet: { fileIds: file._id },
                });
            }

            multipart.status = "completed";
            if (parts) {
                multipart.markModified("parts");
            }
            await multipart.save();

            return context.json({ ok: true, uploadId: multipart.uploadId });
        } catch (error) {
            await fs.unlink(finalPath).catch(() => undefined);
            multipart.status = "failed";
            await multipart.save();
            return context.json({ error: "Multipart merge failed" }, 500);
        }
    },
);

export default router;
