import { useCallback, useEffect, useRef, useState } from "react";
import {
    completeRequestFile,
    completeMultipartUpload,
    createMultipartPart,
    initiateRequestFile,
    listRequestFiles,
    uploadToSignedUrl,
} from "@/components/apiClient";
import type { FileItem } from "@/components/types/file";

type QueueItem = {
    id: string;
    file: File;
    progress: number;
    status: "pending" | "uploading" | "completed" | "error";
    error?: string;
};

type UseUploadQueueOptions = {
    requestId: string;
    isEnabled: boolean;
};

type UseUploadQueueResult = {
    uploadQueue: QueueItem[];
    showUploadOverlay: boolean;
    filePickerKey: number;
    uploadedFiles: FileItem[];
    isLoadingFiles: boolean;
    setUploadedFiles: React.Dispatch<React.SetStateAction<FileItem[]>>;
    setIsLoadingFiles: React.Dispatch<React.SetStateAction<boolean>>;
    handleFilesSelected: (files: File[]) => void;
    handleCloseOverlay: () => void;
    loadFiles: () => Promise<void>;
};

const MAX_UPLOAD_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 800;
const MAX_PARALLEL_UPLOADS = 3;
const MULTIPART_THRESHOLD_BYTES = 20 * 1024 * 1024;
const MULTIPART_CONCURRENCY = 5;

export default function useUploadQueue({
    requestId,
    isEnabled,
}: UseUploadQueueOptions): UseUploadQueueResult {
    const [uploadedFiles, setUploadedFiles] = useState<FileItem[]>([]);
    const [uploadQueue, setUploadQueue] = useState<QueueItem[]>([]);
    const [showUploadOverlay, setShowUploadOverlay] = useState(false);
    const [filePickerKey, setFilePickerKey] = useState(0);
    const [isLoadingFiles, setIsLoadingFiles] = useState(false);
    const uploadQueueRef = useRef<QueueItem[]>([]);
    const inFlightCountRef = useRef(0);

    const mapUploadError = useCallback((error: unknown) => {
        const raw = error instanceof Error ? error.message : "Upload failed";
        const normalized = raw.toLowerCase();

        if (normalized.includes("file already exists")) {
            return "This file already exists in the request.";
        }

        if (normalized.includes("too many requests")) {
            return "Too many uploads right now. Please try again in a moment.";
        }

        if (
            normalized.includes("too large") ||
            normalized.includes("file size")
        ) {
            return "This file is too large to upload.";
        }

        if (normalized.includes("max files")) {
            return "This request has reached the maximum number of files.";
        }

        if (
            normalized.includes("authentication") ||
            normalized.includes("unauthorized")
        ) {
            return "Your session expired. Please sign in again.";
        }

        return raw || "Upload failed";
    }, []);

    const updateQueueItem = useCallback(
        (id: string, updater: (item: QueueItem) => QueueItem) => {
            setUploadQueue((prev) =>
                prev.map((queueItem) =>
                    queueItem.id === id ? updater(queueItem) : queueItem,
                ),
            );
        },
        [],
    );

    const waitForRetry = useCallback((attempt: number) => {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
        return new Promise((resolve) => setTimeout(resolve, delay));
    }, []);

    const loadFiles = useCallback(async () => {
        if (!isEnabled) return;
        setIsLoadingFiles(true);
        try {
            const result = await listRequestFiles(requestId);
            setUploadedFiles(
                result.files.map((file) => ({
                    id: file.id,
                    name: file.name,
                    size: file.size,
                    uploadedAt: new Date(file.uploadedAt),
                    type: file.mimeType,
                })),
            );
        } finally {
            setIsLoadingFiles(false);
        }
    }, [isEnabled, requestId]);

    const uploadFile = useCallback(
        async (item: QueueItem) => {
            const attemptUpload = async (attempt: number): Promise<void> => {
                updateQueueItem(item.id, (queueItem) => ({
                    ...queueItem,
                    status: "uploading",
                    progress: 0,
                    error: undefined,
                }));

                try {
                    updateQueueItem(item.id, (queueItem) => ({
                        ...queueItem,
                        progress: Math.max(queueItem.progress, 5),
                    }));

                    const initiateResult = await initiateRequestFile(
                        requestId,
                        item.file,
                        {
                            multipart:
                                item.file.size >= MULTIPART_THRESHOLD_BYTES,
                        },
                    );

                    if (initiateResult.type === "single") {
                        await uploadToSignedUrl(
                            initiateResult.uploadUrl,
                            item.file,
                            (progress) => {
                                const mapped =
                                    5 + Math.round((progress / 100) * 85);
                                updateQueueItem(item.id, (queueItem) => ({
                                    ...queueItem,
                                    progress: Math.max(
                                        queueItem.progress,
                                        mapped,
                                    ),
                                }));
                            },
                            item.file.type,
                        );

                        updateQueueItem(item.id, (queueItem) => ({
                            ...queueItem,
                            progress: Math.max(queueItem.progress, 95),
                        }));

                        await completeRequestFile(
                            requestId,
                            initiateResult.fileId,
                        );
                    } else {
                        const { fileId, uploadId, partSize } = initiateResult;
                        const totalParts = Math.ceil(item.file.size / partSize);
                        const uploadedBytes = new Array(totalParts).fill(0);

                        const updateOverallProgress = () => {
                            const totalUploaded = uploadedBytes.reduce(
                                (sum, value) => sum + value,
                                0,
                            );
                            const percent = Math.min(
                                100,
                                Math.round(
                                    (totalUploaded / item.file.size) * 100,
                                ),
                            );
                            const mapped = 5 + Math.round((percent / 100) * 85);
                            updateQueueItem(item.id, (queueItem) => ({
                                ...queueItem,
                                progress: Math.max(queueItem.progress, mapped),
                            }));
                        };

                        const partsQueue = Array.from(
                            { length: totalParts },
                            (_, index) => index,
                        );
                        const uploadedParts: Array<{
                            partNumber: number;
                            etag?: string;
                        }> = [];

                        const runWorker = async () => {
                            while (partsQueue.length > 0) {
                                const index = partsQueue.shift();
                                if (index === undefined) return;
                                const start = index * partSize;
                                const end = Math.min(
                                    start + partSize,
                                    item.file.size,
                                );
                                const partBlob = item.file.slice(start, end);
                                const partNumber = index + 1;

                                const { uploadUrl } = await createMultipartPart(
                                    requestId,
                                    fileId,
                                    uploadId,
                                    partNumber,
                                    partBlob.size,
                                );

                                const { etag } = await uploadToSignedUrl(
                                    uploadUrl,
                                    partBlob,
                                    (progress) => {
                                        const loaded = Math.round(
                                            (progress / 100) * partBlob.size,
                                        );
                                        uploadedBytes[index] = Math.min(
                                            partBlob.size,
                                            loaded,
                                        );
                                        updateOverallProgress();
                                    },
                                    item.file.type,
                                );

                                uploadedBytes[index] = partBlob.size;
                                updateOverallProgress();

                                uploadedParts.push({ partNumber, etag });
                            }
                        };

                        await Promise.all(
                            Array.from(
                                {
                                    length: Math.min(
                                        MULTIPART_CONCURRENCY,
                                        totalParts,
                                    ),
                                },
                                () => runWorker(),
                            ),
                        );

                        updateQueueItem(item.id, (queueItem) => ({
                            ...queueItem,
                            progress: Math.max(queueItem.progress, 95),
                        }));

                        await completeMultipartUpload(
                            requestId,
                            fileId,
                            uploadId,
                            uploadedParts,
                        );
                    }

                    updateQueueItem(item.id, (queueItem) => ({
                        ...queueItem,
                        status: "completed",
                        progress: 100,
                    }));

                    await loadFiles();
                } catch (error) {
                    if (attempt < MAX_UPLOAD_RETRIES) {
                        updateQueueItem(item.id, (queueItem) => ({
                            ...queueItem,
                            status: "uploading",
                            error: "Retrying upload...",
                        }));
                        await waitForRetry(attempt);
                        return attemptUpload(attempt + 1);
                    }

                    updateQueueItem(item.id, (queueItem) => ({
                        ...queueItem,
                        status: "error",
                        error: mapUploadError(error),
                    }));
                }
            };

            await attemptUpload(0);
        },
        [loadFiles, requestId, updateQueueItem, waitForRetry, mapUploadError],
    );

    const startNextUpload = useCallback(() => {
        if (inFlightCountRef.current >= MAX_PARALLEL_UPLOADS) return;
        const nextItem = uploadQueueRef.current.shift();
        if (!nextItem) return;

        inFlightCountRef.current += 1;
        void uploadFile(nextItem).finally(() => {
            inFlightCountRef.current -= 1;
            startNextUpload();
        });
    }, [uploadFile]);

    const handleFilesSelected = useCallback(
        (files: File[]) => {
            const newQueueItems: QueueItem[] = files.map((file) => ({
                id: Math.random().toString(36).substring(7),
                file,
                progress: 0,
                status: "pending" as const,
            }));

            setUploadQueue(newQueueItems);
            setShowUploadOverlay(true);

            uploadQueueRef.current = [...newQueueItems];
            inFlightCountRef.current = 0;

            for (let i = 0; i < MAX_PARALLEL_UPLOADS; i += 1) {
                startNextUpload();
            }
        },
        [startNextUpload],
    );

    useEffect(() => {
        if (uploadQueue.length > 0) {
            const allCompleted = uploadQueue.every(
                (item) =>
                    item.status === "completed" || item.status === "error",
            );

            if (allCompleted) {
                const timer = setTimeout(() => {
                    setShowUploadOverlay(false);
                    setUploadQueue([]);
                    setFilePickerKey((prev) => prev + 1);
                }, 3000);

                return () => clearTimeout(timer);
            }
        }

        return undefined;
    }, [uploadQueue]);

    const handleCloseOverlay = useCallback(() => {
        const allCompleted = uploadQueue.every(
            (item) => item.status === "completed" || item.status === "error",
        );

        if (allCompleted) {
            setShowUploadOverlay(false);
            setUploadQueue([]);
            setFilePickerKey((prev) => prev + 1);
        }
    }, [uploadQueue]);

    return {
        uploadQueue,
        showUploadOverlay,
        filePickerKey,
        uploadedFiles,
        isLoadingFiles,
        setUploadedFiles,
        setIsLoadingFiles,
        handleFilesSelected,
        handleCloseOverlay,
        loadFiles,
    };
}
