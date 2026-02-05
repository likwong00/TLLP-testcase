import { API_URL } from "./config";
import { createExistsCache } from "./existsCache";
import { apiFetch } from "./http";
import { getAuthToken } from "./storage";

const EXISTS_CACHE_TTL_MS = 1000 * 15;
const requestExistsCache = createExistsCache(EXISTS_CACHE_TTL_MS);

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

export const checkRequestExists = async (requestId: string) => {
    const cached = requestExistsCache.read(requestId);
    if (cached !== null) {
        return { exists: cached };
    }

    const response = await fetch(`${API_URL}/requests/${requestId}/exists`, {
        method: "GET",
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to validate request");
    }

    const data = (await response.json()) as { exists: boolean };
    requestExistsCache.write(requestId, data.exists);
    return data;
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

export type InitiateRequestResponse =
    | { type: "single"; fileId: string; uploadUrl: string }
    | {
          type: "multipart";
          fileId: string;
          uploadId: string;
          partSize: number;
      };

export const initiateRequestFile = async (
    requestId: string,
    file: File,
    options?: { multipart?: boolean },
): Promise<InitiateRequestResponse> => {
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
                multipart: options?.multipart ?? false,
            }),
        },
        getAuthToken(requestId),
    );

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to initiate upload");
    }

    const data = (await response.json()) as
        | { fileId: string; uploadUrl: string }
        | {
              type: "multipart";
              fileId: string;
              uploadId: string;
              partSize: number;
          };

    if ("uploadUrl" in data) {
        return { type: "single", fileId: data.fileId, uploadUrl: data.uploadUrl };
    }

    return data;
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
