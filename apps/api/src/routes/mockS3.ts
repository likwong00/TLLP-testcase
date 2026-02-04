import { Hono, type Context } from "hono";
import { createReadStream, promises as fs } from "node:fs";
import { randomBytes } from "node:crypto";
import { Readable } from "node:stream";
import { getBlobPath, saveBlobStream } from "../storage/blobStore";
import { FileModel } from "../db/models/File";
import { MultipartUploadModel } from "../db/models/MultipartUpload";
import { MAX_FILE_SIZE_BYTES } from "../utils/limits";

const router = new Hono();

const handleUpload = async (
    context: Context,
    options: { requireMultipart: boolean },
) => {
    const { token } = context.req.param();
    const file = options.requireMultipart
        ? null
        : await FileModel.findOne({ uploadToken: token });
    const multipart = await MultipartUploadModel.findOne({
        "parts.uploadToken": token,
    });

    if (options.requireMultipart) {
        if (!multipart) {
            return context.json({ error: "Not found" }, 404);
        }
    } else if (!file && !multipart) {
        return context.json({ error: "Not found" }, 404);
    }

    if (file && file.size > MAX_FILE_SIZE_BYTES) {
        return context.json(
            {
                error: `File too large (max ${Math.floor(
                    MAX_FILE_SIZE_BYTES / (1024 * 1024),
                )} MB)`,
            },
            413,
        );
    }

    if (multipart) {
        const part = multipart.parts.find(
            (entry: { uploadToken: string }) => entry.uploadToken === token,
        );
        if (!part) {
            return context.json({ error: "Not found" }, 404);
        }
    }

    const contentLengthHeader = context.req.header("content-length");
    const contentLength = contentLengthHeader
        ? Number(contentLengthHeader)
        : null;
    if (
        (file && contentLength && contentLength > MAX_FILE_SIZE_BYTES) ||
        (multipart && contentLength && contentLength > multipart.partSize)
    ) {
        return context.json(
            {
                error: `File too large (max ${Math.floor(
                    (file ? MAX_FILE_SIZE_BYTES : multipart.partSize) /
                        (1024 * 1024),
                )} MB)`,
            },
            413,
        );
    }

    const filePath = await saveBlobStream(token, context.req.raw.body);
    const stat = await fs.stat(filePath);
    if (file && stat.size > MAX_FILE_SIZE_BYTES) {
        await fs.unlink(filePath).catch(() => undefined);
        return context.json(
            {
                error: `File too large (max ${Math.floor(
                    MAX_FILE_SIZE_BYTES / (1024 * 1024),
                )} MB)`,
            },
            413,
        );
    }

    if (multipart && stat.size > multipart.partSize) {
        await fs.unlink(filePath).catch(() => undefined);
        return context.json(
            {
                error: `File too large (max ${Math.floor(
                    multipart.partSize / (1024 * 1024),
                )} MB)`,
            },
            413,
        );
    }

    let etag: string | undefined;
    if (multipart) {
        etag = randomBytes(16).toString("hex");
        await MultipartUploadModel.updateOne(
            { _id: multipart._id },
            {
                $set: {
                    "parts.$[part].status": "uploaded",
                    "parts.$[part].size": stat.size,
                    "parts.$[part].etag": etag,
                },
            },
            {
                arrayFilters: [{ "part.uploadToken": token }],
            },
        );
        context.header("ETag", etag);
    }

    return context.json({ ok: true, etag });
};

router.put("/upload/:token", async (context) =>
    handleUpload(context, { requireMultipart: false }),
);

router.put("/upload-part/:token", async (context) =>
    handleUpload(context, { requireMultipart: true }),
);

router.get("/download/:token", async (context) => {
    const { token } = context.req.param();
    const filePath = getBlobPath(token);
    const rawFilename = context.req.query("filename") ?? "";
    const safeFilename = rawFilename.replace(/["]+/g, "");

    try {
        const stat = await fs.stat(filePath);
        const nodeStream = createReadStream(filePath);
        const body = Readable.toWeb(nodeStream);

        const defaultName = `${token}.bin`;
        const resolvedName = safeFilename || defaultName;
        const asciiFallback =
            resolvedName.replace(/[^\x20-\x7E]/g, "") || defaultName;
        const encodedFilename = encodeURIComponent(resolvedName);

        return new Response(body, {
            headers: {
                "Content-Type": "application/octet-stream",
                "Content-Length": stat.size.toString(),
                "Content-Disposition": `attachment; filename=\"${asciiFallback}\"; filename*=UTF-8''${encodedFilename}`,
            },
        });
    } catch {
        return context.json({ error: "Not found" }, 404);
    }
});

export default router;
