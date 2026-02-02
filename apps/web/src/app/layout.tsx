import type { Metadata } from "next";

import "@/styles/tailwind.css";
import { Toaster } from "@/components/base/Sonner";

export const metadata: Metadata = {
    title: "File Service",
    description: "Upload and download files securely",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>
                <div className="min-h-screen w-full bg-linear-to-br from-blue-50 via-purple-50 to-pink-50 relative overflow-hidden">
                    {/* Decorative background pattern */}
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-400 rounded-full blur-3xl"></div>
                        <div className="absolute top-1/2 right-0 w-96 h-96 bg-purple-400 rounded-full blur-3xl"></div>
                        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-pink-400 rounded-full blur-3xl"></div>
                    </div>

                    {/* Dot pattern overlay */}
                    <div
                        className="absolute inset-0 opacity-20"
                        style={{
                            backgroundImage: `radial-gradient(circle, #000 1px, transparent 1px)`,
                            backgroundSize: "24px 24px",
                        }}
                    />

                    {/* Main content */}
                    <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
                        {children}
                    </div>

                    <Toaster />
                </div>
            </body>
        </html>
    );
}
