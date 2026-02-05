type ExistsCacheEntry = {
    exists: boolean;
    expiresAt: number;
};

export type ExistsCache = {
    read: (id: string) => boolean | null;
    write: (id: string, exists: boolean) => void;
};

export const createExistsCache = (ttlMs: number): ExistsCache => {
    const cache = new Map<string, ExistsCacheEntry>();

    const read = (id: string) => {
        const entry = cache.get(id);
        if (!entry) return null;
        if (entry.expiresAt <= Date.now()) {
            cache.delete(id);
            return null;
        }
        return entry.exists;
    };

    const write = (id: string, exists: boolean) => {
        cache.set(id, { exists, expiresAt: Date.now() + ttlMs });
    };

    return { read, write };
};
