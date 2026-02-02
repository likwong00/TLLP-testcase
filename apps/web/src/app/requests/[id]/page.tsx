"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/base/Button";
import PasswordGate from "@/components/PasswordGate";
import FilePicker from "@/components/FilePicker";
import FilesList from "@/components/FilesList";
import UploadQueue from "@/components/UploadQueue";
import { useRouter } from "next/navigation";

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

export default function RequestPage() {
    const router = useRouter();
    const [password, setPassword] = useState<string | null>(null);
    const [uploadedFiles, setUploadedFiles] = useState<FileItem[]>([]);
    const [uploadQueue, setUploadQueue] = useState<QueueItem[]>([]);
    const [showUploadOverlay, setShowUploadOverlay] = useState(false);
    const [filePickerKey, setFilePickerKey] = useState(0);

    const handlePasswordSuccess = (pwd: string) => {
        setPassword(pwd);
    };

    const handleFilesSelected = (files: File[]) => {
        // Create queue items for each file
        const newQueueItems: QueueItem[] = files.map((file) => ({
            id: Math.random().toString(36).substring(7),
            file,
            progress: 0,
            status: "pending" as const,
        }));

        setUploadQueue(newQueueItems);
        setShowUploadOverlay(true);

        // Simulate upload progress
        newQueueItems.forEach((item, index) => {
            setTimeout(() => {
                simulateUpload(item);
            }, index * 500);
        });
    };

    const simulateUpload = (item: QueueItem) => {
        // Update to uploading
        setUploadQueue((prev) =>
            prev.map((q) =>
                q.id === item.id ? { ...q, status: "uploading" as const } : q,
            ),
        );

        // Simulate progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 30;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);

                // Mark as completed
                setUploadQueue((prev) =>
                    prev.map((q) =>
                        q.id === item.id
                            ? {
                                  ...q,
                                  progress: 100,
                                  status: "completed" as const,
                              }
                            : q,
                    ),
                );

                // Add to uploaded files
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
                    prev.map((q) =>
                        q.id === item.id
                            ? { ...q, progress: Math.floor(progress) }
                            : q,
                    ),
                );
            }
        }, 200);
    };

    // Check if all uploads are completed
    useEffect(() => {
        if (uploadQueue.length > 0) {
            const allCompleted = uploadQueue.every(
                (item) =>
                    item.status === "completed" || item.status === "error",
            );

            if (allCompleted) {
                // Auto-close after 3 seconds
                const timer = setTimeout(() => {
                    setShowUploadOverlay(false);
                    setUploadQueue([]);
                    // Reset FilePicker to clear selected files
                    setFilePickerKey((prev) => prev + 1);
                }, 3000);

                return () => clearTimeout(timer);
            }
        }
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

    if (!password) {
        return (
            <PasswordGate
                mode="create"
                onSuccess={handlePasswordSuccess}
                onCancel={() => router.push("/")}
            />
        );
    }

    return (
        <>
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
                <div className="flex items-center gap-3 mb-6">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push("/")}
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

                {/* File Picker */}
                <div className="mb-6">
                    <FilePicker
                        key={filePickerKey}
                        onFilesSelected={handleFilesSelected}
                    />
                </div>

                {/* Uploaded Files List */}
                {uploadedFiles.length > 0 && (
                    <div>
                        <FilesList files={uploadedFiles} mode="upload" />
                    </div>
                )}
            </motion.div>

            {/* Upload Queue Overlay */}
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
                            onClick={(e) => e.stopPropagation()}
                        >
                            <UploadQueue items={uploadQueue} />

                            {/* Hint to close */}
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
