import { z } from "zod";
import { PasswordSchema, SessionTokenSchema } from "./auth";
import { FileIdSchema, FileRequestIdSchema, ShareIdSchema } from "./ids";

export const RequestCreateBodySchema = z.object({
    password: PasswordSchema,
});

export const RequestCreateResponseSchema = z.object({
    id: FileRequestIdSchema,
    token: SessionTokenSchema,
});

export const RequestAuthBodySchema = z.object({
    password: PasswordSchema,
});

export const RequestAuthResponseSchema = z.object({
    token: SessionTokenSchema,
});

export const RequestGetResponseSchema = z.object({
    id: FileRequestIdSchema,
});

export const RequestFileInitiateBodySchema = z.object({
    originalName: z.string().min(1).max(255),
    mimeType: z.string().min(1).max(255),
    size: z.number().int().nonnegative(),
    multipart: z.boolean().optional(),
});

export const RequestFileInitiateResponseSchema = z.object({
    fileId: FileIdSchema,
    uploadUrl: z.string().url(),
});

export const RequestMultipartInitiateResponseSchema = z.object({
    type: z.literal("multipart"),
    fileId: FileIdSchema,
    uploadId: z.string().min(1),
    partSize: z.number().int().positive(),
});

export const RequestFileCompleteResponseSchema = z.object({
    ok: z.boolean(),
});

export const RequestFileSchema = z.object({
    id: FileIdSchema,
    name: z.string().min(1),
    size: z.number().int().nonnegative(),
    mimeType: z.string().min(1),
    uploadedAt: z.string().datetime(),
    status: z.enum(["pending", "uploaded", "failed"]),
});

export const RequestFilesResponseSchema = z.object({
    files: z.array(RequestFileSchema),
});

export const RequestCreateShareBodySchema = z.object({
    password: PasswordSchema,
});

export const RequestCreateShareResponseSchema = z.object({
    shareId: ShareIdSchema,
});

export type RequestCreateBody = z.infer<typeof RequestCreateBodySchema>;
export type RequestCreateResponse = z.infer<typeof RequestCreateResponseSchema>;
export type RequestAuthBody = z.infer<typeof RequestAuthBodySchema>;
export type RequestAuthResponse = z.infer<typeof RequestAuthResponseSchema>;
export type RequestGetResponse = z.infer<typeof RequestGetResponseSchema>;
export type RequestFileInitiateBody = z.infer<
    typeof RequestFileInitiateBodySchema
>;
export type RequestFileInitiateResponse = z.infer<
    typeof RequestFileInitiateResponseSchema
>;
export type RequestMultipartInitiateResponse = z.infer<
    typeof RequestMultipartInitiateResponseSchema
>;
export type RequestFileCompleteResponse = z.infer<
    typeof RequestFileCompleteResponseSchema
>;
export type RequestFile = z.infer<typeof RequestFileSchema>;
export type RequestFilesResponse = z.infer<typeof RequestFilesResponseSchema>;
export type RequestCreateShareBody = z.infer<
    typeof RequestCreateShareBodySchema
>;
export type RequestCreateShareResponse = z.infer<
    typeof RequestCreateShareResponseSchema
>;
