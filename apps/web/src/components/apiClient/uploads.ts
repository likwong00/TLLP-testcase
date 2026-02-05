import { apiFetch } from "./http";
import { getAuthToken } from "./storage";

export const uploadToSignedUrl = async (
    uploadUrl: string,
    blob: Blob,
    onProgress?: (progress: number) => void,
    contentType?: string,
) => {
    return await new Promise<{ etag?: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader(
            "Content-Type",
            contentType || blob.type || "application/octet-stream",
        );

        if (onProgress) {
            xhr.upload.onprogress = (event) => {
                if (!event.lengthComputable) return;
                const progress = Math.round((event.loaded / event.total) * 100);
                onProgress(progress);
            };
        }

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                const etag = xhr.getResponseHeader("ETag") ?? undefined;
                resolve({ etag: etag ? etag.replace(/\"/g, "") : undefined });
                return;
            }
            reject(new Error("Upload failed"));
        };

        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.onabort = () => reject(new Error("Upload cancelled"));

        xhr.send(blob);
    });
};

export const createMultipartPart = async (
    requestId: string,
    fileId: string,
    uploadId: string,
    partNumber: number,
    size: number,
) => {
    const response = await apiFetch(
        `/requests/${requestId}/files/${fileId}/multipart/parts`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ uploadId, partNumber, size }),
        },
        getAuthToken(requestId),
    );

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to prepare multipart part");
    }

    return (await response.json()) as { partNumber: number; uploadUrl: string };
};

export const completeMultipartUpload = async (
    requestId: string,
    fileId: string,
    uploadId: string,
    parts: Array<{ partNumber: number; etag?: string }>,
) => {
    const response = await apiFetch(
        `/requests/${requestId}/files/${fileId}/multipart/complete`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ uploadId, parts }),
        },
        getAuthToken(requestId),
    );

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to complete multipart upload");
    }

    return (await response.json()) as { ok: true; uploadId: string };
};
