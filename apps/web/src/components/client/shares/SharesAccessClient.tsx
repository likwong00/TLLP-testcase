"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/base/Button";
import { Input } from "@/components/base/Input";
import { Label } from "@/components/base/Label";
import PasswordGate from "@/components/features/PasswordGate";
import {
    authShare,
    checkShareExists,
    setShareAuthToken,
} from "@/components/apiClient";

type Stage = "enter" | "password";

export default function SharesAccessClient() {
    const router = useRouter();
    const [stage, setStage] = useState<Stage>("enter");
    const [shareId, setShareId] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleContinue = async () => {
        const trimmed = shareId.trim();
        if (!trimmed) {
            setError("Share ID is required");
            return;
        }
        setIsSubmitting(true);
        setError(null);
        try {
            const result = await checkShareExists(trimmed);
            if (!result.exists) {
                setError("Share not found");
                return;
            }
            setStage("password");
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Unable to validate share",
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePasswordSuccess = async (password: string) => {
        const trimmed = shareId.trim();
        if (!trimmed) {
            setError("Share ID is required");
            setStage("enter");
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            const { token } = await authShare(trimmed, password);
            setShareAuthToken(trimmed, token);
            router.push(`/shares/${trimmed}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Access failed");
        } finally {
            setIsSubmitting(false);
            setStage("enter");
        }
    };

    return (
        <>
            <motion.div
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
                        <h2>Shares</h2>
                        <p className="text-sm text-gray-600">
                            Enter a share ID to access files.
                        </p>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {stage === "enter" ? (
                        <motion.div
                            key="enter"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-4"
                        >
                            <div className="space-y-2">
                                <Label htmlFor="shareId">Share ID</Label>
                                <Input
                                    id="shareId"
                                    value={shareId}
                                    onChange={(event) =>
                                        setShareId(event.target.value)
                                    }
                                    placeholder="Enter share ID"
                                />
                            </div>

                            {error ? (
                                <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                                    {error}
                                </p>
                            ) : null}

                            <Button
                                className="w-full"
                                onClick={handleContinue}
                                disabled={isSubmitting}
                            >
                                <span className="flex items-center gap-2">
                                    <LogIn className="w-4 h-4" />
                                    Continue to password
                                </span>
                            </Button>
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </motion.div>

            {stage === "password" ? (
                <PasswordGate
                    mode="enter"
                    onSuccess={handlePasswordSuccess}
                    onCancel={() => setStage("enter")}
                />
            ) : null}
        </>
    );
}
