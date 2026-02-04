export const MAX_FILE_SIZE_BYTES = 1000 * 1024 * 1024; // 1GB limit
export const MAX_FILES_PER_REQUEST = 20;
export const MAX_FILES_PER_SHARE = 20;
export const MULTIPART_PART_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_MULTIPART_PARTS = 1000;

export const AUTH_RATE_LIMIT_MAX = 5;
export const AUTH_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minute lock out

type RateLimitEntry = {
    count: number;
    resetAt: number;
};

const authAttempts = new Map<string, RateLimitEntry>();

export const checkAndRecordAuthAttempt = (key: string) => {
    const now = Date.now();
    const existing = authAttempts.get(key);

    if (!existing || existing.resetAt <= now) {
        const entry = {
            count: 1,
            resetAt: now + AUTH_RATE_LIMIT_WINDOW_MS,
        };
        authAttempts.set(key, entry);
        return {
            allowed: true,
            remaining: AUTH_RATE_LIMIT_MAX - 1,
            resetAt: entry.resetAt,
        };
    }

    const nextCount = existing.count + 1;
    const entry = { ...existing, count: nextCount };
    authAttempts.set(key, entry);

    return {
        allowed: nextCount <= AUTH_RATE_LIMIT_MAX,
        remaining: Math.max(0, AUTH_RATE_LIMIT_MAX - nextCount),
        resetAt: entry.resetAt,
    };
};

export const resetAuthAttempts = (key: string) => {
    authAttempts.delete(key);
};
