import { API_URL } from "./config";

export const apiFetch = async (
    path: string,
    init: RequestInit | undefined,
    token: string | null,
) => {
    const headers = new Headers(init?.headers);
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    return fetch(`${API_URL}${path}`, {
        ...init,
        headers,
    });
};

export const shareFetch = async (
    path: string,
    init: RequestInit | undefined,
    token: string | null,
) => {
    const headers = new Headers(init?.headers);
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    return fetch(`${API_URL}${path}`, {
        ...init,
        headers,
    });
};
