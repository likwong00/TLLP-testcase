import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/base/Button";

type NotFoundCardProps = {
    title: string;
    description: string;
    backLabel: string;
    backHref?: string;
    onBack?: () => void;
};

export default function NotFoundCard({
    title,
    description,
    backLabel,
    backHref,
    onBack,
}: NotFoundCardProps) {
    const backButton = backHref ? (
        <Button asChild className="w-full">
            <Link href={backHref}>{backLabel}</Link>
        </Button>
    ) : (
        <Button className="w-full" onClick={onBack}>
            {backLabel}
        </Button>
    );

    return (
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
            <div className="flex items-center gap-3 mb-6">
                {backHref ? (
                    <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="rounded-full"
                    >
                        <Link href={backHref}>
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                    </Button>
                ) : (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onBack}
                        className="rounded-full"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                )}
                <div>
                    <h2>{title}</h2>
                    <p className="text-sm text-gray-600">{description}</p>
                </div>
            </div>
            {backButton}
        </div>
    );
}
