import { Hono } from "hono";
import { createReadStream, promises as fs } from "node:fs";
import { Readable } from "node:stream";
import { getBlobPath, saveBlobStream } from "../storage/blobStore";

const router = new Hono();

router.put("/upload/:token", async (context) => {
    const { token } = context.req.param();
    await saveBlobStream(token, context.req.raw.body);
    return context.json({ ok: true });
});

router.get("/download/:token", async (context) => {
    const { token } = context.req.param();
    const filePath = getBlobPath(token);
    const rawFilename = context.req.query("filename") ?? "";
    const safeFilename = rawFilename.replace(/["]+/g, "");

    try {
        const stat = await fs.stat(filePath);
        const nodeStream = createReadStream(filePath);
        const body = Readable.toWeb(nodeStream);

        return new Response(body, {
            headers: {
                "Content-Type": "application/octet-stream",
                "Content-Length": stat.size.toString(),
                "Content-Disposition": `attachment; filename=\"${
                    safeFilename || `${token}.bin`
                }\"`,
            },
        });
    } catch {
        return context.json({ error: "Not found" }, 404);
    }
});

export default router;
