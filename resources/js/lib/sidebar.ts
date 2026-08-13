import { useCallback, useEffect, useState } from 'react';

const KEY = 'pk_sidebar_collapsed';

/**
 * Whether the panel sidebar is collapsed to an icon rail, persisted across
 * visits — a layout preference the user set once should not reset on reload.
 *
 * Desktop only: below 860px the sidebar is a full-width drawer, so the shell's
 * CSS ignores the collapsed class there.
 */
export function useSidebarCollapsed(): [boolean, () => void] {
    const [collapsed, setCollapsed] = useState<boolean>(() => {
        try {
            return localStorage.getItem(KEY) === '1';
        } catch {
            return false;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(KEY, collapsed ? '1' : '0');
        } catch {
            /* private mode — the preference just does not persist */
        }
    }, [collapsed]);

    return [collapsed, useCallback(() => setCollapsed((v) => !v), [])];
}
