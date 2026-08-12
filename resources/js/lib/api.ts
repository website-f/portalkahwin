import axios from 'axios';
import { url } from './base';

const TOKEN_KEY = 'pk_token';

export const api = axios.create({
    // Resolves to /api at a domain root, /app/api when mounted in a subdirectory.
    baseURL: url('/api'),
    headers: { Accept: 'application/json' },
});

export function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
}

api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
