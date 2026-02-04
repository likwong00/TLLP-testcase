import { z } from "zod";
import { FileIdSchema, FileRequestIdSchema, ShareIdSchema } from "./ids";

export const FileMetadataSchema = z.object({
    id: FileIdSchema,
    requestId: FileRequestIdSchema.optional(),
    shareId: ShareIdSchema.optional(),
    name: z.string().min(1),
    size: z.number().int().nonnegative(),
    mimeType: z.string().min(1),
    createdAt: z.string().datetime().optional(),
});

export type FileMetadata = z.infer<typeof FileMetadataSchema>;
