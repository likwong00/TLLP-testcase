import { z } from "zod";

export const PasswordSchema = z.string().min(4);
export const SessionTokenSchema = z.string().min(10);

export const AuthRequestSchema = z.object({
    password: PasswordSchema,
});

export const AuthResponseSchema = z.object({
    sessionToken: SessionTokenSchema,
});

export type AuthRequest = z.infer<typeof AuthRequestSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
