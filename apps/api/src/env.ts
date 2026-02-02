export const PORT = Number(process.env.PORT ?? 8787);
export const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:3000";
export const NODE_ENV = process.env.NODE_ENV ?? "development";
export const DEV_SEED_ENABLED =
    process.env.DEV_SEED_ENABLED?.toLowerCase() !== "false";
