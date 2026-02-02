import { Hono } from "hono";
import { saveBlobStream } from "../storage/blobStore";

const router = new Hono();

router.put("/upload/:token", async (context) => {
    const { token } = context.req.param();
    await saveBlobStream(token, context.req.raw.body);
    return context.json({ ok: true });
});

export default router;
