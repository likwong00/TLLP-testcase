const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

const REQUEST_TOKENS_KEY = "tllp.requestTokens";
const SHARE_TOKENS_KEY = "tllp.shareTokens";
const REQUEST_PASSWORDS_KEY = "tllp.requestPasswords";
const DEFAULT_TOKEN_TTL_MS = 1000 * 60 * 60;

const canUseLocalStorage =
    typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const canUseSessionStorage =
    typeof window !== "undefined" &&
    typeof window.sessionStorage !== "undefined";

const readLocalStorage = (key: string) => {
    if (!canUseLocalStorage) return null;
    try {
        return window.localStorage.getItem(key);
    } catch {
        return null;
    }
};

const writeLocalStorage = (key: string, value: string | null) => {
    if (!canUseLocalStorage) return;
    try {
        if (value === null) {
            window.localStorage.removeItem(key);
        } else {
            window.localStorage.setItem(key, value);
        }
    } catch {
        return;
    }
};

const readSessionStorage = (key: string) => {
    if (!canUseSessionStorage) return null;
    try {
        return window.sessionStorage.getItem(key);
    } catch {
        return null;
    }
};

const writeSessionStorage = (key: string, value: string | null) => {
    if (!canUseSessionStorage) return;
    try {
        if (value === null) {
            window.sessionStorage.removeItem(key);
        } else {
            window.sessionStorage.setItem(key, value);
        }
    } catch {
        return;
    }
};

type StoredToken = {
    token: string;
    expiresAt: number;
};

type TokenStore = Record<string, StoredToken>;

const parseTokenStore = (raw: string | null): TokenStore => {
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw) as TokenStore;
        if (parsed && typeof parsed === "object") {
            return parsed;
        }
    } catch {
        return {};
    }
    return {};
};

const parsePasswordStore = (raw: string | null): Record<string, string> => {
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw) as Record<string, string>;
        if (parsed && typeof parsed === "object") {
            return parsed;
        }
    } catch {
        return {};
    }
    return {};
};

const pruneExpiredTokens = (store: TokenStore) => {
    const now = Date.now();
    let changed = false;
    for (const [key, value] of Object.entries(store)) {
        if (!value?.expiresAt || value.expiresAt <= now) {
            delete store[key];
            changed = true;
        }
    }
    return changed;
};

let requestTokenStore = parseTokenStore(readLocalStorage(REQUEST_TOKENS_KEY));
let shareTokenStore = parseTokenStore(readLocalStorage(SHARE_TOKENS_KEY));
let requestPasswordStore = parsePasswordStore(
    readSessionStorage(REQUEST_PASSWORDS_KEY),
);

if (pruneExpiredTokens(requestTokenStore)) {
    writeLocalStorage(REQUEST_TOKENS_KEY, JSON.stringify(requestTokenStore));
}

if (pruneExpiredTokens(shareTokenStore)) {
    writeLocalStorage(SHARE_TOKENS_KEY, JSON.stringify(shareTokenStore));
}

if (typeof window !== "undefined" && canUseLocalStorage) {
    window.addEventListener("storage", (event) => {
        if (event.key === REQUEST_TOKENS_KEY) {
            requestTokenStore = parseTokenStore(event.newValue);
            pruneExpiredTokens(requestTokenStore);
            return;
        }
        if (event.key === SHARE_TOKENS_KEY) {
            shareTokenStore = parseTokenStore(event.newValue);
            pruneExpiredTokens(shareTokenStore);
        }
    });
}

export const setAuthToken = (
    requestId: string,
    token: string | null,
    expiresAt = Date.now() + DEFAULT_TOKEN_TTL_MS,
) => {
    if (!requestId) return;
    if (token === null) {
        delete requestTokenStore[requestId];
    } else {
        requestTokenStore[requestId] = { token, expiresAt };
    }
    writeLocalStorage(REQUEST_TOKENS_KEY, JSON.stringify(requestTokenStore));
};

export const getAuthToken = (requestId: string) => {
    const entry = requestTokenStore[requestId];
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
        delete requestTokenStore[requestId];
        writeLocalStorage(REQUEST_TOKENS_KEY, JSON.stringify(requestTokenStore));
        return null;
    }
    return entry.token;
};

export const setRequestPassword = (requestId: string, password: string | null) => {
    if (!requestId) return;
    if (password === null) {
        delete requestPasswordStore[requestId];
    } else {
        requestPasswordStore[requestId] = password;
    }
    writeSessionStorage(
        REQUEST_PASSWORDS_KEY,
        JSON.stringify(requestPasswordStore),
    );
};

export const getRequestPassword = (requestId: string) =>
    requestPasswordStore[requestId] ?? null;

export const setShareAuthToken = (
    shareId: string,
    token: string | null,
    expiresAt = Date.now() + DEFAULT_TOKEN_TTL_MS,
) => {
    if (!shareId) return;
    if (token === null) {
        delete shareTokenStore[shareId];
    } else {
        shareTokenStore[shareId] = { token, expiresAt };
    }
    writeLocalStorage(SHARE_TOKENS_KEY, JSON.stringify(shareTokenStore));
};

export const getShareAuthToken = (shareId: string) => {
    const entry = shareTokenStore[shareId];
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
        delete shareTokenStore[shareId];
        writeLocalStorage(SHARE_TOKENS_KEY, JSON.stringify(shareTokenStore));
        return null;
    }
    return entry.token;
};

const apiFetch = async (
    path: string,
    init: RequestInit | undefined,
    token: string | null,
) => {
    const headers = new Headers(init?.headers);
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    return fetch(`${API_URL}${path}`, {
        ...init,
        headers,
    });
};

const shareFetch = async (
    path: string,
    init: RequestInit | undefined,
    token: string | null,
) => {
    const headers = new Headers(init?.headers);
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    return fetch(`${API_URL}${path}`, {
        ...init,
        headers,
    });
};

export const requestAuth = async (requestId: string, password: string) => {
    const response = await fetch(`${API_URL}/requests/${requestId}/auth`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error ?? "Authentication failed");
    }

    return (await response.json()) as { token: string };
};

export const createRequest = async (password: string) => {
    const response = await fetch(`${API_URL}/requests`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to create request");
    }

    return (await response.json()) as { id: string; token: string };
};

export const getRequest = async (requestId: string) => {
    const response = await apiFetch(
        `/requests/${requestId}`,
        { method: "GET" },
        getAuthToken(requestId),
    );

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error ?? "Unauthorized");
    }

    return (await response.json()) as { id: string };
};

export const initiateRequestFile = async (requestId: string, file: File) => {
    const response = await apiFetch(
        `/requests/${requestId}/files/initiate`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                originalName: file.name,
                mimeType: file.type || "application/octet-stream",
                size: file.size,
            }),
        },
        getAuthToken(requestId),
    );

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to initiate upload");
    }

    return (await response.json()) as { fileId: string; uploadUrl: string };
};

export const uploadToSignedUrl = async (uploadUrl: string, file: File) => {
    const response = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
            "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
    });

    if (!response.ok) {
        throw new Error("Upload failed");
    }
};

export const completeRequestFile = async (
    requestId: string,
    fileId: string,
) => {
    const response = await apiFetch(
        `/requests/${requestId}/files/${fileId}/complete`,
        { method: "POST" },
        getAuthToken(requestId),
    );

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to complete upload");
    }
};

export type RequestFile = {
    id: string;
    name: string;
    size: number;
    mimeType: string;
    uploadedAt: string;
    status: "pending" | "uploaded" | "failed";
};

export const listRequestFiles = async (requestId: string) => {
    const response = await apiFetch(
        `/requests/${requestId}/files`,
        { method: "GET" },
        getAuthToken(requestId),
    );

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to load files");
    }

    return (await response.json()) as { files: RequestFile[] };
};

export const createShare = async (requestId: string, password: string) => {
    const response = await apiFetch(
        `/requests/${requestId}/create-share`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ password }),
        },
        getAuthToken(requestId),
    );

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to create share");
    }

    return (await response.json()) as { shareId: string };
};

export const authShare = async (shareId: string, password: string) => {
    const response = await fetch(`${API_URL}/shares/${shareId}/auth`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error ?? "Authentication failed");
    }

    return (await response.json()) as { token: string };
};

export type ShareFile = {
    id: string;
    name: string;
    size: number;
    mimeType: string;
    uploadedAt: string;
    status: "pending" | "uploaded" | "failed";
};

export const listShareFiles = async (shareId: string) => {
    const response = await shareFetch(
        `/shares/${shareId}/files`,
        { method: "GET" },
        getShareAuthToken(shareId),
    );

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to load files");
    }

    return (await response.json()) as { files: ShareFile[] };
};

export const getShareDownloadUrl = async (shareId: string, fileId: string) => {
    const response = await shareFetch(
        `/shares/${shareId}/files/${fileId}/download-url`,
        { method: "POST" },
        getShareAuthToken(shareId),
    );

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to get download URL");
    }

    return (await response.json()) as { url: string };
};

export const seedRequest = async () => {
    const response = await fetch(`${API_URL}/dev/seed-request`, {
        method: "POST",
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to create request");
    }

    return (await response.json()) as { requestId: string; password: string };
};
