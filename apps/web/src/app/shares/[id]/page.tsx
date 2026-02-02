"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/base/Button";
import PasswordGate from "@/components/PasswordGate";
import FilesList from "@/components/FilesList";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface FileItem {
    id: string;
    name: string;
    size: number;
    uploadedAt: Date;
    type: string;
}

// Mock data for demonstration
const MOCK_FILES: FileItem[] = [
    {
        id: "1",
        name: "presentation.pdf",
        size: 2458624,
        uploadedAt: new Date(Date.now() - 3600000),
        type: "application/pdf",
    },
    {
        id: "2",
        name: "project-photos.zip",
        size: 15728640,
        uploadedAt: new Date(Date.now() - 7200000),
        type: "application/zip",
    },
    {
        id: "3",
        name: "video-demo.mp4",
        size: 52428800,
        uploadedAt: new Date(Date.now() - 86400000),
        type: "video/mp4",
    },
    {
        id: "4",
        name: "document.docx",
        size: 1048576,
        uploadedAt: new Date(Date.now() - 172800000),
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
    {
        id: "5",
        name: "image.jpg",
        size: 3145728,
        uploadedAt: new Date(Date.now() - 259200000),
        type: "image/jpeg",
    },
];

export default function SharePage() {
    const router = useRouter();
    const [authenticated, setAuthenticated] = useState(false);
    const [files, setFiles] = useState<FileItem[]>([]);

    const handlePasswordSuccess = (pwd: string) => {
        // Simulate authentication
        setAuthenticated(true);
        // Load mock files
        setFiles(MOCK_FILES);
    };

    const handleDownload = (fileId: string) => {
        const file = files.find((f) => f.id === fileId);
        if (file) {
            toast.success(`Downloading ${file.name}`);
            // In a real app, this would trigger an actual download
        }
    };

    if (!authenticated) {
        return (
            <PasswordGate
                mode="enter"
                onSuccess={handlePasswordSuccess}
                onCancel={() => router.push("/")}
            />
        );
    }

    return (
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
                    <h2>Download Files</h2>
                    <p className="text-sm text-gray-600">
                        Click on any file to download
                    </p>
                </div>
            </div>

            <FilesList
                files={files}
                mode="download"
                onDownload={handleDownload}
            />
        </motion.div>
    );
}
