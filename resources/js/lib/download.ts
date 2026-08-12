import { api } from './api';

/**
 * Download a file from an authenticated API endpoint.
 *
 * A plain <a href> can't carry the bearer token, and putting the token in the
 * query string would leak it into server logs and browser history. So fetch the
 * bytes through the normal axios instance (which attaches the header) and hand
 * the browser a temporary object URL instead.
 */
export async function downloadFile(path: string, fallbackName: string): Promise<void> {
    const res = await api.get(path, { responseType: 'blob' });

    // Prefer the server's filename when it sent one.
    const disposition = String(res.headers['content-disposition'] ?? '');
    const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
    const name = match ? decodeURIComponent(match[1]) : fallbackName;

    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revoking immediately can cancel the download in some browsers.
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
