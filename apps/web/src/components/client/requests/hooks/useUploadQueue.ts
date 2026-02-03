import { useCallback, useEffect, useState } from "react";
import {
    completeRequestFile,
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

export default function useUploadQueue({
    requestId,
    isEnabled,
}: UseUploadQueueOptions): UseUploadQueueResult {
    const [uploadedFiles, setUploadedFiles] = useState<FileItem[]>([]);
    const [uploadQueue, setUploadQueue] = useState<QueueItem[]>([]);
    const [showUploadOverlay, setShowUploadOverlay] = useState(false);
    const [filePickerKey, setFilePickerKey] = useState(0);
    const [isLoadingFiles, setIsLoadingFiles] = useState(false);

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
            setUploadQueue((prev) =>
                prev.map((queueItem) =>
                    queueItem.id === item.id
                        ? { ...queueItem, status: "uploading", progress: 10 }
                        : queueItem,
                ),
            );

            try {
                const { fileId, uploadUrl } = await initiateRequestFile(
                    requestId,
                    item.file,
                );

                setUploadQueue((prev) =>
                    prev.map((queueItem) =>
                        queueItem.id === item.id
                            ? { ...queueItem, progress: 70 }
                            : queueItem,
                    ),
                );

                await uploadToSignedUrl(uploadUrl, item.file);
                await completeRequestFile(requestId, fileId);

                setUploadQueue((prev) =>
                    prev.map((queueItem) =>
                        queueItem.id === item.id
                            ? {
                                  ...queueItem,
                                  status: "completed",
                                  progress: 100,
                              }
                            : queueItem,
                    ),
                );

                await loadFiles();
            } catch (error) {
                setUploadQueue((prev) =>
                    prev.map((queueItem) =>
                        queueItem.id === item.id
                            ? {
                                  ...queueItem,
                                  status: "error",
                                  error:
                                      error instanceof Error
                                          ? error.message
                                          : "Upload failed",
                              }
                            : queueItem,
                    ),
                );
            }
        },
        [loadFiles, requestId],
    );

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

            newQueueItems.forEach((item, index) => {
                setTimeout(() => {
                    void uploadFile(item);
                }, index * 300);
            });
        },
        [uploadFile],
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
