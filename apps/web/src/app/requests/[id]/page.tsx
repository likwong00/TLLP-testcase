"use client";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Link2 } from "lucide-react";
import { Button } from "@/components/base/Button";
import FilePicker from "@/components/FilePicker";
import FilesList from "@/components/FilesList";
import UploadQueue from "@/components/UploadQueue";
import PasswordGate from "@/components/PasswordGate";
import { useRouter, useSearchParams } from "next/navigation";
import {
    getAuthToken,
    getRequest,
    setAuthToken,
    initiateRequestFile,
    completeRequestFile,
    listRequestFiles,
    uploadToSignedUrl,
    requestAuth,
} from "@/components/apiClient";
interface FileItem {
    id: string;
    name: string;
    size: number;
    uploadedAt: Date;
    type: string;
}
interface QueueItem {
    id: string;
    file: File;
    progress: number;
    status: "pending" | "uploading" | "completed" | "error";
    error?: string;
}
type RequestPageProps = {
    params: { id: string };
};
export default function RequestPage({ params }: RequestPageProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [token, setToken] = useState<string | null>(null);
    const [isMockAccess, setIsMockAccess] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const [uploadedFiles, setUploadedFiles] = useState<FileItem[]>([]);
    const [uploadQueue, setUploadQueue] = useState<QueueItem[]>([]);
    const [showUploadOverlay, setShowUploadOverlay] = useState(false);
    const [filePickerKey, setFilePickerKey] = useState(0);
    const [isLoadingFiles, setIsLoadingFiles] = useState(false);
    const [showShareDialog, setShowShareDialog] = useState(false);
    const [shareUrl, setShareUrl] = useState("");

    const shareLink = useMemo(() => {
        const suffix = isMockAccess ? "?mock=1" : "";
        if (typeof window === "undefined") {
            return `/requests/${params.id}${suffix}`;
        }
        return `${window.location.origin}/requests/${params.id}${suffix}`;
    }, [params.id, isMockAccess]);

    useEffect(() => {
        if (searchParams.get("mock") === "1") {
            setIsMockAccess(true);
        }
        if (searchParams.get("share") === "1") {
            setShowShareDialog(true);
        }
    }, [searchParams]);

    useEffect(() => {
        if (!token && !isMockAccess) {
            const existing = getAuthToken();
            if (existing) {
                setToken(existing);
            }
        }
    }, [token, isMockAccess]);

    const loadFiles = async () => {
        if (!token || isMockAccess) return;
        setIsLoadingFiles(true);
        try {
            const result = await listRequestFiles(params.id);
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
    };

    useEffect(() => {
        if (!token || isMockAccess) return;

        const verifyAccess = async () => {
            try {
                await getRequest(params.id);
            } catch (error) {
                setAuthError(
                    error instanceof Error
                        ? error.message
                        : "Authentication failed",
                );
                setToken(null);
                setAuthToken(null);
            }
        };

        void verifyAccess();
    }, [token, params.id, isMockAccess]);

    const handleFilesSelected = (files: File[]) => {
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
                if (isMockAccess) {
                    simulateUpload(item);
                } else {
                    void uploadFile(item);
                }
            }, index * 300);
        });
    };

    const uploadFile = async (item: QueueItem) => {
        setUploadQueue((prev) =>
            prev.map((queueItem) =>
                queueItem.id === item.id
                    ? { ...queueItem, status: "uploading", progress: 10 }
                    : queueItem,
            ),
        );

        try {
            const { fileId, uploadUrl } = await initiateRequestFile(
                params.id,
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
            await completeRequestFile(params.id, fileId);

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
    };

    const simulateUpload = (item: QueueItem) => {
        setUploadQueue((prev) =>
            prev.map((queueItem) =>
                queueItem.id === item.id
                    ? { ...queueItem, status: "uploading" as const }
                    : queueItem,
            ),
        );

        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 30;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);

                setUploadQueue((prev) =>
                    prev.map((queueItem) =>
                        queueItem.id === item.id
                            ? {
                                  ...queueItem,
                                  progress: 100,
                                  status: "completed" as const,
                              }
                            : queueItem,
                    ),
                );

                const newFile: FileItem = {
                    id: item.id,
                    name: item.file.name,
                    size: item.file.size,
                    uploadedAt: new Date(),
                    type: item.file.type,
                };
                setUploadedFiles((prev) => [...prev, newFile]);
            } else {
                setUploadQueue((prev) =>
                    prev.map((queueItem) =>
                        queueItem.id === item.id
                            ? { ...queueItem, progress: Math.floor(progress) }
                            : queueItem,
                    ),
                );
            }
        }, 200);
    };

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

    const handleCloseOverlay = () => {
        const allCompleted = uploadQueue.every(
            (item) => item.status === "completed" || item.status === "error",
        );

        if (allCompleted) {
            setShowUploadOverlay(false);
            setUploadQueue([]);
            setFilePickerKey((prev) => prev + 1);
        }
    };

    const handleCopyShare = async () => {
        if (!shareUrl) return;
        await navigator.clipboard.writeText(shareUrl);
    };

    useEffect(() => {
        if (token && !isMockAccess) {
            void loadFiles();
        }
    }, [token, isMockAccess]);

    useEffect(() => {
        if (showShareDialog) {
            setShareUrl(shareLink);
        }
    }, [showShareDialog, shareLink]);

    const handlePasswordSubmit = async (password: string) => {
        setAuthError(null);
        try {
            const { token: newToken } = await requestAuth(params.id, password);
            setAuthToken(newToken);
            setToken(newToken);
        } catch (error) {
            setAuthError(
                error instanceof Error
                    ? error.message
                    : "Authentication failed",
            );
        }
    };

    if (!token && !isMockAccess) {
        return (
            <>
                <PasswordGate
                    mode="enter"
                    onSuccess={handlePasswordSubmit}
                    onCancel={() => router.push("/requests")}
                />
                {authError ? (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-full text-sm shadow-lg">
                        {authError}
                    </div>
                ) : null}
            </>
        );
    }

    return (
        <>
            <div className="flex flex-col lg:flex-row gap-6 items-start w-full max-w-5xl">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: "spring", duration: 0.5 }}
                    className="bg-white rounded-2xl shadow-2xl p-8 w-full lg:flex-1 max-h-[90vh] overflow-y-auto"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push("/requests")}
                            className="rounded-full"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <div className="flex-1">
                            <h2>File Request</h2>
                            <p className="text-sm text-gray-600">
                                Upload files to this request
                            </p>
                        </div>
                    </div>

                    <div className="mb-6">
                        <FilePicker
                            key={filePickerKey}
                            onFilesSelected={handleFilesSelected}
                        />
                    </div>

                    {isLoadingFiles ? (
                        <p className="text-sm text-gray-500">
                            Loading files...
                        </p>
                    ) : (
                        <FilesList files={uploadedFiles} mode="upload" />
                    )}
                </motion.div>

                {showShareDialog ? (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ type: "spring", duration: 0.4 }}
                        className="bg-white rounded-2xl shadow-2xl p-6 w-full lg:w-80"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <Link2 className="w-5 h-5 text-blue-600" />
                            <h3 className="text-lg font-medium">
                                Share this request
                            </h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                            Send this link to someone so they can upload files
                            to your request.
                        </p>
                        <div className="flex flex-col gap-3">
                            <input
                                readOnly
                                value={shareUrl}
                                className="w-full border rounded-lg px-3 py-2 text-sm"
                            />
                            <Button variant="outline" onClick={handleCopyShare}>
                                Copy link
                            </Button>
                        </div>
                    </motion.div>
                ) : null}
            </div>

            <AnimatePresence>
                {showUploadOverlay && uploadQueue.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={handleCloseOverlay}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: "spring", duration: 0.4 }}
                            className="w-full max-w-md"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <UploadQueue items={uploadQueue} />

                            {uploadQueue.every(
                                (item) =>
                                    item.status === "completed" ||
                                    item.status === "error",
                            ) && (
                                <motion.p
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                    className="text-center text-sm text-white mt-4"
                                >
                                    Click outside to close or auto-closing in
                                    3s...
                                </motion.p>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
