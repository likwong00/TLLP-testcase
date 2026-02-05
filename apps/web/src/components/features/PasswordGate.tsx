"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/base/Button";
import { Input } from "@/components/base/Input";
import { Label } from "@/components/base/Label";

interface PasswordGateProps {
    mode: "create" | "enter";
    onSuccess: (password: string) => void;
    onCancel?: () => void;
}

export default function PasswordGate({
    mode,
    onSuccess,
    onCancel,
}: PasswordGateProps) {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");

    const getPasswordError = (value: string) => {
        if (value.length < 8) {
            return "Password must be at least 8 characters";
        }
        if (!/[a-z]/.test(value)) {
            return "Password must include a lowercase letter";
        }
        if (!/[A-Z]/.test(value)) {
            return "Password must include an uppercase letter";
        }
        if (!/[0-9]/.test(value)) {
            return "Password must include a number";
        }
        if (!/[^A-Za-z0-9]/.test(value)) {
            return "Password must include a symbol";
        }
        return "";
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!password) {
            setError("Password is required");
            return;
        }

        if (mode === "create") {
            const passwordError = getPasswordError(password);
            if (passwordError) {
                setError(passwordError);
                return;
            }

            if (password !== confirmPassword) {
                setError("Passwords do not match");
                return;
            }
        }

        onSuccess(password);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onCancel}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-center mb-6">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                        <Lock className="w-8 h-8 text-blue-600" />
                    </div>
                </div>

                <h2 className="text-center mb-2">
                    {mode === "create" ? "Create Password" : "Enter Password"}
                </h2>
                <p className="text-center text-gray-600 mb-6">
                    {mode === "create"
                        ? "Set a password to protect your file share"
                        : "Enter the password to access files"}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password"
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? (
                                    <EyeOff className="w-5 h-5" />
                                ) : (
                                    <Eye className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                        {mode === "create" ? (
                            <p className="text-xs text-gray-500">
                                Use at least 8 characters with upper/lowercase
                                letters, a number, and a symbol.
                            </p>
                        ) : null}
                    </div>

                    {mode === "create" && (
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">
                                Confirm Password
                            </Label>
                            <Input
                                id="confirmPassword"
                                type={showPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) =>
                                    setConfirmPassword(e.target.value)
                                }
                                placeholder="Confirm password"
                            />
                        </div>
                    )}

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-sm text-red-600 bg-red-50 p-3 rounded-lg"
                        >
                            {error}
                        </motion.div>
                    )}

                    <div className="flex gap-3 pt-2">
                        {onCancel && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onCancel}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                        )}
                        <Button type="submit" className="flex-1">
                            {mode === "create" ? "Create" : "Access"}
                        </Button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}
