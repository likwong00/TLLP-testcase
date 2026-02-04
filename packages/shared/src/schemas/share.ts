import { z } from "zod";
import { PasswordSchema, SessionTokenSchema } from "./auth";
import { FileIdSchema, ShareIdSchema } from "./ids";

export const ShareAuthBodySchema = z.object({
    password: PasswordSchema,
});

export const ShareAuthResponseSchema = z.object({
    token: SessionTokenSchema,
});

export const ShareFileSchema = z.object({
    id: FileIdSchema,
    name: z.string().min(1),
    size: z.number().int().nonnegative(),
    mimeType: z.string().min(1),
    uploadedAt: z.string().datetime(),
    status: z.enum(["pending", "uploaded", "failed"]),
});

export const ShareFilesResponseSchema = z.object({
    files: z.array(ShareFileSchema),
});

export const ShareDownloadUrlResponseSchema = z.object({
    url: z.string().url(),
});

export const ShareIdResponseSchema = z.object({
    shareId: ShareIdSchema,
});

export type ShareAuthBody = z.infer<typeof ShareAuthBodySchema>;
export type ShareAuthResponse = z.infer<typeof ShareAuthResponseSchema>;
export type ShareFile = z.infer<typeof ShareFileSchema>;
export type ShareFilesResponse = z.infer<typeof ShareFilesResponseSchema>;
export type ShareDownloadUrlResponse = z.infer<
    typeof ShareDownloadUrlResponseSchema
>;
export type ShareIdResponse = z.infer<typeof ShareIdResponseSchema>;
