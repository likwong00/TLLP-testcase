const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
    authToken = token;
};

export const getAuthToken = () => authToken;

const apiFetch = async (path: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (authToken) {
        headers.set("Authorization", `Bearer ${authToken}`);
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
    const response = await apiFetch(`/requests/${requestId}`, {
        method: "GET",
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error ?? "Unauthorized");
    }

    return (await response.json()) as { id: string };
};

export const initiateRequestFile = async (requestId: string, file: File) => {
    const response = await apiFetch(`/requests/${requestId}/files/initiate`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            originalName: file.name,
            mimeType: file.type || "application/octet-stream",
            size: file.size,
        }),
    });

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
        {
            method: "POST",
        },
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
    const response = await apiFetch(`/requests/${requestId}/files`, {
        method: "GET",
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to load files");
    }

    return (await response.json()) as { files: RequestFile[] };
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
