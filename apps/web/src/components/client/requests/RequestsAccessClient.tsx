"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Plus, LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/base/Button";
import { Input } from "@/components/base/Input";
import { Label } from "@/components/base/Label";
import PasswordGate from "@/components/features/PasswordGate";
import {
    checkRequestExists,
    createRequest,
    requestAuth,
    setAuthToken,
    setRequestPassword,
} from "@/components/apiClient";

type Stage = "choice" | "join";

type PasswordMode = "create" | "enter" | null;

export default function RequestsAccessClient() {
    const router = useRouter();
    const [stage, setStage] = useState<Stage>("choice");
    const [passwordMode, setPasswordMode] = useState<PasswordMode>(null);
    const [requestId, setRequestId] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleJoinContinue = async () => {
        const trimmed = requestId.trim();
        if (!trimmed) {
            setError("Request ID is required");
            return;
        }
        setIsSubmitting(true);
        setError(null);
        try {
            const result = await checkRequestExists(trimmed);
            if (!result.exists) {
                setError("Request not found");
                return;
            }
            setPasswordMode("enter");
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to validate request",
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreate = () => {
        setError(null);
        setPasswordMode("create");
    };

    const handleOpenJoin = () => {
        if (!isSubmitting) {
            setError(null);
            setStage("join");
        }
    };

    const handleCloseJoin = () => {
        if (!isSubmitting) {
            setError(null);
            setStage("choice");
        }
    };

    const handlePasswordSuccess = async (password: string) => {
        if (passwordMode === "enter") {
            const trimmed = requestId.trim();
            if (!trimmed) {
                setError("Request ID is required");
                setPasswordMode(null);
                return;
            }

            setIsSubmitting(true);
            setError(null);
            try {
                const { token } = await requestAuth(trimmed, password);
                setAuthToken(trimmed, token);
                setRequestPassword(trimmed, password);
                router.push(`/requests/${trimmed}`);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Access failed");
            } finally {
                setIsSubmitting(false);
                setPasswordMode(null);
            }

            return;
        }

        if (passwordMode === "create") {
            setIsSubmitting(true);
            setError(null);
            try {
                const { id, token } = await createRequest(password);
                setAuthToken(id, token);
                setRequestPassword(id, password);
                router.push(`/requests/${id}?share=1`);
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to create request",
                );
            } finally {
                setIsSubmitting(false);
                setPasswordMode(null);
            }
        }
    };

    const handleCancelPassword = () => {
        if (!isSubmitting) {
            setPasswordMode(null);
        }
    };

    return (
        <>
            <AnimatePresence mode="wait">
                {stage === "choice" ? (
                    <motion.div
                        key="choice"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", duration: 0.6 }}
                        className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <Button
                                asChild
                                variant="ghost"
                                size="sm"
                                className="rounded-full"
                            >
                                <Link href="/">
                                    <ArrowLeft className="w-4 h-4" />
                                </Link>
                            </Button>
                            <div>
                                <h2>Requests</h2>
                                <p className="text-sm text-gray-600">
                                    Create a request or join an existing one.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Button className="w-full" onClick={handleCreate}>
                                <span className="flex items-center gap-2">
                                    <Plus className="w-4 h-4" />
                                    Create a new request
                                </span>
                            </Button>
                            <Button
                                className="w-full"
                                variant="outline"
                                onClick={handleOpenJoin}
                            >
                                <span className="flex items-center gap-2">
                                    <LogIn className="w-4 h-4" />
                                    Join an existing request
                                </span>
                            </Button>
                        </div>
                    </motion.div>
                ) : (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key="join"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ type: "spring", duration: 0.6 }}
                            className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="rounded-full"
                                    onClick={handleCloseJoin}
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                </Button>
                                <div>
                                    <h2>Join Existing Request</h2>
                                    <p className="text-sm text-gray-600">
                                        Join an existing request through Request
                                        ID, the owner of the request should be
                                        able to share it.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="requestId">Request ID</Label>
                                <Input
                                    id="requestId"
                                    value={requestId}
                                    onChange={(event) =>
                                        setRequestId(event.target.value)
                                    }
                                    placeholder="Enter request ID"
                                />
                            </div>

                            {error ? (
                                <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg mt-4">
                                    {error}
                                </p>
                            ) : null}

                            <div className="flex gap-3 pt-4">
                                <Button
                                    className="flex-1"
                                    onClick={handleJoinContinue}
                                    disabled={isSubmitting}
                                >
                                    <span className="flex items-center gap-2">
                                        <LogIn className="w-4 h-4" />
                                        Continue to password
                                    </span>
                                </Button>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                )}
            </AnimatePresence>

            {passwordMode ? (
                <PasswordGate
                    mode={passwordMode}
                    onSuccess={handlePasswordSuccess}
                    onCancel={handleCancelPassword}
                />
            ) : null}
        </>
    );
}
