import { z } from "zod";

export const IdSchema = z.string().min(1);

export const FileIdSchema = IdSchema;
export const FileRequestIdSchema = IdSchema;
export const ShareIdSchema = IdSchema;
export const AuthSessionIdSchema = IdSchema;

export type Id = z.infer<typeof IdSchema>;
export type FileId = z.infer<typeof FileIdSchema>;
export type FileRequestId = z.infer<typeof FileRequestIdSchema>;
export type ShareId = z.infer<typeof ShareIdSchema>;
export type AuthSessionId = z.infer<typeof AuthSessionIdSchema>;
