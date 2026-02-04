"use client";

import { motion } from "motion/react";
import { Upload, Download } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/base/Button";

export default function LandingClient() {
    return (
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md"
        >
            <div className="text-center mb-8">
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <h1 className="mb-2">File Service</h1>
                    <p className="text-gray-600">
                        Secure file uploads and downloads with password
                        protection
                    </p>
                </motion.div>
            </div>

            <div className="space-y-4">
                <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    <Button
                        asChild
                        className="w-full h-auto py-6"
                        variant="default"
                    >
                        <Link
                            href="/requests"
                            className="flex w-full flex-col items-center text-center gap-2"
                        >
                            <Upload className="w-8 h-8" />
                            <div>
                                <div className="font-semibold">
                                    Request Files
                                </div>
                                <div className="text-sm opacity-90">
                                    Let others upload files to you
                                </div>
                            </div>
                        </Link>
                    </Button>
                </motion.div>

                <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                >
                    <Button
                        asChild
                        className="w-full h-auto py-6"
                        variant="outline"
                    >
                        <Link
                            href="/shares"
                            className="flex w-full flex-col items-center text-center gap-2"
                        >
                            <Download className="w-8 h-8" />
                            <div>
                                <div className="font-semibold">
                                    Download Files
                                </div>
                                <div className="text-sm opacity-70">
                                    Access files shared with you
                                </div>
                            </div>
                        </Link>
                    </Button>
                </motion.div>
            </div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500"
            >
                All transfers are password protected
            </motion.div>
        </motion.div>
    );
}
