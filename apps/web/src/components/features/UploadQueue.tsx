"use client";

import { motion } from "motion/react";
import { File, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Progress } from "@/components/base/Progress";

interface QueueItem {
    id: string;
    file: File;
    progress: number;
    status: "pending" | "uploading" | "completed" | "error";
    error?: string;
}

interface UploadQueueProps {
    items: QueueItem[];
}

export default function UploadQueue({ items }: UploadQueueProps) {
    if (items.length === 0) return null;

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return (
            Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
        );
    };

    const getStatusIcon = (status: QueueItem["status"]) => {
        switch (status) {
            case "uploading":
                return (
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                );
            case "completed":
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            case "error":
                return <AlertCircle className="w-5 h-5 text-red-500" />;
            default:
                return <File className="w-5 h-5 text-gray-400" />;
        }
    };

    const completedCount = items.filter(
        (item) => item.status === "completed",
    ).length;
    const totalCount = items.length;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
        >
            <div className="p-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">Upload Progress</h3>
                    <span className="text-sm text-gray-600">
                        {completedCount} / {totalCount}
                    </span>
                </div>
                <Progress
                    value={(completedCount / totalCount) * 100}
                    className="h-2"
                />
            </div>

            <div className="max-h-80 overflow-y-auto">
                {items.map((item, index) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 border-b border-gray-100 last:border-b-0"
                    >
                        <div className="flex items-start gap-3">
                            <div className="shrink-0 mt-0.5">
                                {getStatusIcon(item.status)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="truncate mb-1">
                                    {item.file.name}
                                </p>
                                <p className="text-sm text-gray-500 mb-2">
                                    {formatFileSize(item.file.size)}
                                </p>

                                {item.status === "uploading" && (
                                    <div className="space-y-1">
                                        <Progress
                                            value={item.progress}
                                            className="h-1.5"
                                        />
                                        <p className="text-xs text-gray-500">
                                            {item.progress}%
                                        </p>
                                    </div>
                                )}

                                {item.status === "completed" && (
                                    <p className="text-sm text-green-600">
                                        Upload complete
                                    </p>
                                )}

                                {item.status === "error" && (
                                    <p className="text-sm text-red-600">
                                        {item.error || "Upload failed"}
                                    </p>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}
