import { API_URL } from "./config";
import { createExistsCache } from "./existsCache";
import { shareFetch } from "./http";
import { getShareAuthToken } from "./storage";

const EXISTS_CACHE_TTL_MS = 1000 * 15;
const shareExistsCache = createExistsCache(EXISTS_CACHE_TTL_MS);

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

export const checkShareExists = async (shareId: string) => {
    const cached = shareExistsCache.read(shareId);
    if (cached !== null) {
        return { exists: cached };
    }

    const response = await fetch(`${API_URL}/shares/${shareId}/exists`, {
        method: "GET",
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to validate share");
    }

    const data = (await response.json()) as { exists: boolean };
    shareExistsCache.write(shareId, data.exists);
    return data;
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
