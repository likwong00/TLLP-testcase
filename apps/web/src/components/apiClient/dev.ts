import { API_URL } from "./config";

export const seedRequest = async () => {
    const response = await fetch(`${API_URL}/dev/seed-request`, {
        method: "POST",
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to create request");
    }

    return (await response.json()) as { requestId: string; password: string };
};
