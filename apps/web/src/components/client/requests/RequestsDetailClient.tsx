"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Link2, Copy, Eye, EyeOff } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/base/Button";
import FilePicker from "@/components/features/FilePicker";
import FilesList from "@/components/features/FilesList";
import NotFoundCard from "@/components/features/NotFoundCard";
import UploadQueue from "@/components/features/UploadQueue";
import PasswordGate from "@/components/features/PasswordGate";
import {
    checkRequestExists,
    getAuthToken,
    getRequest,
    setAuthToken,
    getRequestPassword,
    setRequestPassword,
    requestAuth,
} from "@/components/apiClient";
import useShareCreation from "@/components/client/requests/hooks/useShareCreation";
import useUploadQueue from "@/components/client/requests/hooks/useUploadQueue";

type RequestsDetailClientProps = {
    requestId: string;
};

export default function RequestsDetailClient({
    requestId,
}: RequestsDetailClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [token, setToken] = useState<string | null>(null);
    const [authError, setAuthError] = useState<string | null>(null);
    const [existsStatus, setExistsStatus] = useState<
        "loading" | "exists" | "missing"
    >("loading");
    const [existsError, setExistsError] = useState<string | null>(null);
    const [showShareDialog, setShowShareDialog] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const requestPassword = getRequestPassword(requestId);

    const {
        uploadQueue,
        showUploadOverlay,
        filePickerKey,
        uploadedFiles,
        isLoadingFiles,
        handleFilesSelected,
        handleCloseOverlay,
        loadFiles,
    } = useUploadQueue({ requestId, isEnabled: Boolean(token) });

    const { shareId, shareError } = useShareCreation({
        requestId,
        requestPassword,
        showShareDialog,
    });

    useEffect(() => {
        const verifyExists = async () => {
            try {
                const result = await checkRequestExists(requestId);
                if (!result.exists) {
                    setExistsStatus("missing");
                    return;
                }
                setExistsStatus("exists");
            } catch (error) {
                setExistsError(
                    error instanceof Error
                        ? error.message
                        : "Request not found",
                );
                setExistsStatus("missing");
            }
        };

        void verifyExists();
    }, [requestId]);

    useEffect(() => {
        if (searchParams.get("share") === "1") {
            setShowShareDialog(true);
        }
    }, [searchParams]);

    useEffect(() => {
        if (!token) {
            const existing = getAuthToken(requestId);
            if (existing) {
                setToken(existing);
            }
        }
    }, [token]);

    useEffect(() => {
        if (!token) return;

        const verifyAccess = async () => {
            try {
                await getRequest(requestId);
            } catch (error) {
                setAuthError(
                    error instanceof Error
                        ? error.message
                        : "Authentication failed",
                );
                setToken(null);
                setAuthToken(requestId, null);
            }
        };

        void verifyAccess();
    }, [token, requestId]);

    const handleCopyShareId = async () => {
        if (!shareId) return;
        await navigator.clipboard.writeText(shareId);
    };

    const handleCopyRequestId = async () => {
        if (!requestId) return;
        await navigator.clipboard.writeText(requestId);
    };

    const handleCopyPassword = async () => {
        if (!requestPassword) return;
        await navigator.clipboard.writeText(requestPassword);
    };

    useEffect(() => {
        if (token) {
            void loadFiles();
        }
    }, [token, loadFiles]);

    const handlePasswordSubmit = async (password: string) => {
        setAuthError(null);
        try {
            const { token: newToken } = await requestAuth(requestId, password);
            setAuthToken(requestId, newToken);
            setRequestPassword(requestId, password);
            setToken(newToken);
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
                transition={{ type: "spring", duration: 0.5 }}
                className="w-full max-w-md"
            >
                <NotFoundCard
                    title="Request not found"
                    description={
                        existsError ??
                        "This request ID doesn’t exist or has been removed."
                    }
                    backLabel="Back to landing page"
                    backHref="/"
                />
            </motion.div>
        );
    }

    if (existsStatus === "loading") {
        return null;
    }

    if (!token) {
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
                            asChild
                            variant="ghost"
                            size="sm"
                            className="rounded-full"
                        >
                            <Link href="/requests">
                                <ArrowLeft className="w-4 h-4" />
                            </Link>
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
                            <h3 className="text-lg font-medium">Share files</h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                            Share these IDs to other users so they can
                            upload/download files from this request/share.
                        </p>
                        <div className="flex flex-col gap-3">
                            <div>
                                <p className="text-xs font-medium text-gray-500 mb-2">
                                    Request upload ID
                                </p>
                                <div className="flex items-center gap-2">
                                    <input
                                        readOnly
                                        value={requestId}
                                        className="flex-1 border rounded-lg px-3 py-2 text-sm"
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleCopyRequestId}
                                    >
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-gray-500 mb-2">
                                    Share download ID
                                </p>
                                <div className="flex items-center gap-2">
                                    <input
                                        readOnly
                                        value={shareId || "Generating..."}
                                        className="flex-1 border rounded-lg px-3 py-2 text-sm"
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleCopyShareId}
                                        disabled={!shareId}
                                    >
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-gray-500 mb-2">
                                    Password
                                </p>
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            readOnly
                                            type={
                                                isPasswordVisible
                                                    ? "text"
                                                    : "password"
                                            }
                                            value={
                                                requestPassword ??
                                                "Not available"
                                            }
                                            className="w-full border rounded-lg px-3 py-2 pr-10 text-sm"
                                        />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                                            onClick={() =>
                                                setIsPasswordVisible(
                                                    (previous) => !previous,
                                                )
                                            }
                                        >
                                            {isPasswordVisible ? (
                                                <EyeOff className="w-4 h-4" />
                                            ) : (
                                                <Eye className="w-4 h-4" />
                                            )}
                                        </Button>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleCopyPassword}
                                        disabled={!requestPassword}
                                    >
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                            {shareError ? (
                                <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                                    {shareError}
                                </p>
                            ) : null}
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
