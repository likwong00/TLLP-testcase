import { useEffect, useState } from "react";
import { createShare } from "@/components/apiClient";

type UseShareCreationOptions = {
    requestId: string;
    requestPassword: string | null;
    showShareDialog: boolean;
};

export default function useShareCreation({
    requestId,
    requestPassword,
    showShareDialog,
}: UseShareCreationOptions) {
    const [shareId, setShareId] = useState<string | null>(null);
    const [shareError, setShareError] = useState<string | null>(null);
    const [isCreatingShare, setIsCreatingShare] = useState(false);

    const createShareOnce = async () => {
        if (!requestPassword) return;
        setShareError(null);
        setIsCreatingShare(true);
        try {
            const { shareId: newShareId } = await createShare(
                requestId,
                requestPassword,
            );
            setShareId(newShareId);
        } catch (error) {
            setShareError(
                error instanceof Error
                    ? error.message
                    : "Failed to create share",
            );
        } finally {
            setIsCreatingShare(false);
        }
    };

    useEffect(() => {
        if (!showShareDialog || shareId || isCreatingShare) {
            return;
        }

        void createShareOnce();
    }, [showShareDialog, shareId, isCreatingShare]);

    return {
        shareId,
        shareError,
        isCreatingShare,
    };
}
