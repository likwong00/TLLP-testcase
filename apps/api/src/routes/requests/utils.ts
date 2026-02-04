import type { Context } from "hono";
import mongoose from "mongoose";
import { FileIdSchema, FileRequestIdSchema } from "@file-service/shared";

export const validateRequestId = (context: Context, id: string) => {
    const parsedId = FileRequestIdSchema.safeParse(id);
    if (!parsedId.success || !mongoose.Types.ObjectId.isValid(id)) {
        return context.json(
            {
                error: "Invalid Request ID",
                details: parsedId.success
                    ? undefined
                    : parsedId.error.flatten(),
            },
            400,
        );
    }

    return null;
};

export const validateFileId = (context: Context, fileId: string) => {
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

    return null;
};
