import type { MiddlewareHandler } from "hono";
import {
    AuthSessionModel,
    type AuthSessionDocument,
} from "../db/models/AuthSession";

export type AuthContext = {
    token: string;
    scope: "request";
    scopeId: string;
    expiresAt: Date;
};

declare module "hono" {
    interface ContextVariableMap {
        auth: AuthContext;
    }
}

export const requireAuth = (scope: "request"): MiddlewareHandler => {
    return async (context, next) => {
        const header = context.req.header("authorization") ?? "";
        const token = header.replace(/^Bearer\s+/i, "").trim();

        if (!token) {
            return context.json({ error: "Unauthorized" }, 401);
        }

        const session = await AuthSessionModel.findOne({
            token,
            scope,
        }).lean<AuthSessionDocument>();

        if (!session || session.expiresAt.getTime() < Date.now()) {
            return context.json({ error: "Unauthorized" }, 401);
        }

        context.set("auth", {
            token: session.token,
            scope: session.scope,
            scopeId: session.scopeId,
            expiresAt: session.expiresAt,
        });

        return next();
    };
};
