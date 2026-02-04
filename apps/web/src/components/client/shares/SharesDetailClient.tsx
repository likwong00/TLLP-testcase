"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/base/Button";
import PasswordGate from "@/components/features/PasswordGate";
import FilesList from "@/components/features/FilesList";
import NotFoundCard from "@/components/features/NotFoundCard";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
    authShare,
    checkShareExists,
    getShareAuthToken,
    getShareDownloadUrl,
    listShareFiles,
    setShareAuthToken,
} from "@/components/apiClient";
import type { FileItem } from "@/components/types/file";

type SharesClientProps = {
    shareId: string;
};

export default function SharesDetailClient({ shareId }: SharesClientProps) {
    const router = useRouter();
    const [authenticated, setAuthenticated] = useState(false);
    const [files, setFiles] = useState<FileItem[]>([]);
    const [isLoadingFiles, setIsLoadingFiles] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const [existsStatus, setExistsStatus] = useState<
        "loading" | "exists" | "missing"
    >("loading");
    const [existsError, setExistsError] = useState<string | null>(null);

    useEffect(() => {
        const verifyExists = async () => {
            try {
                const result = await checkShareExists(shareId);
                if (!result.exists) {
                    setExistsStatus("missing");
                    return;
                }
                setExistsStatus("exists");
            } catch (error) {
                setExistsError(
                    error instanceof Error ? error.message : "Share not found",
                );
                setExistsStatus("missing");
            }
        };

        void verifyExists();
    }, [shareId]);

    useEffect(() => {
        const existingToken = getShareAuthToken(shareId);
        if (existingToken) {
            setAuthenticated(true);
        }
    }, []);

    const loadFiles = async () => {
        setIsLoadingFiles(true);
        try {
            const result = await listShareFiles(shareId);
            setFiles(
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
        if (authenticated) {
            void loadFiles();
        }
    }, [authenticated]);

    const handleDownload = async (fileId: string) => {
        const file = files.find((fileItem) => fileItem.id === fileId);
        if (!file) return;

        try {
            const { url } = await getShareDownloadUrl(shareId, fileId);
            toast.success(`Downloading ${file.name}`);
            window.location.assign(url);
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Download failed",
            );
        }
    };

    const handlePasswordSubmit = async (password: string) => {
        setAuthError(null);
        try {
            const { token } = await authShare(shareId, password);
            setShareAuthToken(shareId, token);
            setAuthenticated(true);
        } catch (error) {
            setAuthError(
                error instanceof Error
                    ? error.message
                    : "Authentication failed",
            );
        }
    };

    if (existsStatus === "missing") {
        return (
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="w-full max-w-md"
            >
                <NotFoundCard
                    title="Share not found"
                    description={
                        existsError ??
                        "This share ID doesn’t exist or has been removed."
                    }
                    backLabel="Back to home page"
                    onBack={() => router.push("/")}
                />
            </motion.div>
        );
    }

    if (existsStatus === "loading") {
        return null;
    }

    if (!authenticated) {
        return (
            <>
                <PasswordGate
                    mode="enter"
                    onSuccess={handlePasswordSubmit}
                    onCancel={() => router.push("/shares")}
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
                    onClick={() => router.push("/shares")}
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

            {isLoadingFiles ? (
                <p className="text-sm text-gray-500">Loading files...</p>
            ) : (
                <FilesList
                    files={files}
                    mode="download"
                    onDownload={handleDownload}
                />
            )}
        </motion.div>
    );
}
