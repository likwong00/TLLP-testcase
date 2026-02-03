"use client";

import { motion } from "motion/react";
import {
    File,
    Download,
    FileText,
    Image,
    Music,
    Video,
    Archive,
} from "lucide-react";
import { Button } from "@/components/base/Button";
import type { FileItem } from "@/components/types/file";

interface FilesListProps {
    files: FileItem[];
    mode: "upload" | "download";
    onDownload?: (fileId: string) => void;
}

export default function FilesList({ files, mode, onDownload }: FilesListProps) {
    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return (
            Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
        );
    };

    const getFileIcon = (type: string) => {
        if (type.startsWith("image/"))
            return <Image className="w-5 h-5 text-blue-500" />;
        if (type.startsWith("video/"))
            return <Video className="w-5 h-5 text-purple-500" />;
        if (type.startsWith("audio/"))
            return <Music className="w-5 h-5 text-green-500" />;
        if (type.includes("zip") || type.includes("rar"))
            return <Archive className="w-5 h-5 text-orange-500" />;
        if (type.includes("pdf") || type.includes("text"))
            return <FileText className="w-5 h-5 text-red-500" />;
        return <File className="w-5 h-5 text-gray-500" />;
    };

    const formatDate = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return "Just now";
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    if (files.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <File className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500">
                    {mode === "upload"
                        ? "No files uploaded yet"
                        : "No files available"}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">
                    {mode === "upload" ? "Uploaded Files" : "Available Files"} (
                    {files.length})
                </h3>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
                {files.map((file, index) => (
                    <motion.div
                        key={file.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                    >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            {getFileIcon(file.type)}
                            <div className="min-w-0 flex-1">
                                <p className="truncate">{file.name}</p>
                                <p className="text-sm text-gray-500">
                                    {formatFileSize(file.size)} •{" "}
                                    {formatDate(file.uploadedAt)}
                                </p>
                            </div>
                        </div>

                        {mode === "download" && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDownload?.(file.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Download className="w-4 h-4" />
                            </Button>
                        )}
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
