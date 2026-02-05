import { z } from "zod";

export const PasswordSchema = z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-z]/, "Password must include a lowercase letter")
    .regex(/[A-Z]/, "Password must include an uppercase letter")
    .regex(/[0-9]/, "Password must include a number")
    .regex(/[^A-Za-z0-9]/, "Password must include a symbol");
export const SessionTokenSchema = z.string().min(10);

export const AuthRequestSchema = z.object({
    password: PasswordSchema,
});

export const AuthResponseSchema = z.object({
    sessionToken: SessionTokenSchema,
});

export type AuthRequest = z.infer<typeof AuthRequestSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
