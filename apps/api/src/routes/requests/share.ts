import { Hono } from "hono";
import bcrypt from "bcryptjs";
import { RequestCreateShareBodySchema } from "@file-service/shared";
import { FileModel } from "../../db/models/File";
import { FileRequestModel } from "../../db/models/FileRequest";
import { ShareModel } from "../../db/models/Share";
import { requireAuth } from "../../middleware/auth";
import { MAX_FILES_PER_SHARE } from "../../utils/limits";
import { validateRequestId } from "./utils";

const router = new Hono();

router.post("/:id/create-share", requireAuth("request"), async (context) => {
    const { id } = context.req.param();
    const idError = validateRequestId(context, id);
    if (idError) return idError;

    const auth = context.get("auth");
    if (auth.scopeId !== id) {
        return context.json({ error: "Unauthorized" }, 401);
    }

    const request = await FileRequestModel.findById(id);
    if (!request) {
        return context.json({ error: "Not found" }, 404);
    }

    if (request.shareId) {
        return context.json({ shareId: request.shareId });
    }

    const body = await context.req.json().catch(() => null);
    const parsedBody = RequestCreateShareBodySchema.safeParse(body);
    if (!parsedBody.success) {
        return context.json(
            {
                error: "Invalid request body",
                details: parsedBody.error.flatten(),
            },
            400,
        );
    }

    const files = await FileModel.find({ requestId: id, status: "uploaded" })
        .sort({ createdAt: -1 })
        .lean();

    if (files.length > MAX_FILES_PER_SHARE) {
        return context.json(
            {
                error: `Share file limit exceeded (max ${MAX_FILES_PER_SHARE})`,
            },
            400,
        );
    }

    const passwordHash = await bcrypt.hash(parsedBody.data.password, 10);
    const share = await ShareModel.create({
        passwordHash,
        fileIds: files.map((file) => file._id),
    });

    request.shareId = share.id;
    await request.save();

    return context.json({ shareId: share.id });
});

export default router;
