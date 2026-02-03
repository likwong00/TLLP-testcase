"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";
import { Upload, File, X } from "lucide-react";
import { Button } from "@/components/base/Button";

interface FilePickerProps {
    onFilesSelected: (files: File[]) => void;
}

export default function FilePicker({ onFilesSelected }: FilePickerProps) {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        addFiles(files);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            addFiles(files);
        }
    };

    const addFiles = (files: File[]) => {
        setSelectedFiles((prev) => [...prev, ...files]);
    };

    const removeFile = (index: number) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleUpload = () => {
        if (selectedFiles.length > 0) {
            onFilesSelected(selectedFiles);
            setSelectedFiles([]);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return (
            Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
        );
    };

    return (
        <div className="space-y-4">
            <div
                onDrop={handleDrop}
                onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                    isDragging
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 hover:border-gray-400"
                }`}
            >
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                        <Upload className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                        <p className="mb-1">
                            Drag and drop files here, or{" "}
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="text-blue-600 hover:text-blue-700 underline"
                            >
                                browse
                            </button>
                        </p>
                        <p className="text-sm text-gray-500">
                            Upload any type of file
                        </p>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                </div>
            </div>

            {selectedFiles.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2"
                >
                    <h3 className="font-medium">
                        Selected Files ({selectedFiles.length})
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {selectedFiles.map((file, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group"
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <File className="w-5 h-5 text-gray-400 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate">{file.name}</p>
                                        <p className="text-sm text-gray-500">
                                            {formatFileSize(file.size)}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeFile(index)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </motion.div>
                        ))}
                    </div>

                    <Button onClick={handleUpload} className="w-full">
                        Upload {selectedFiles.length}{" "}
                        {selectedFiles.length === 1 ? "File" : "Files"}
                    </Button>
                </motion.div>
            )}
        </div>
    );
}
