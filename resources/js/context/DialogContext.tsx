import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { useLang } from './LangContext';

interface ConfirmOpts {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
}

interface DialogState {
    kind: 'confirm' | 'alert';
    opts: ConfirmOpts;
    resolve: (v: boolean) => void;
}

interface DialogCtx {
    confirm: (opts: ConfirmOpts | string) => Promise<boolean>;
    alert: (opts: Omit<ConfirmOpts, 'cancelText'> | string) => Promise<void>;
}

const Ctx = createContext<DialogCtx>(null as unknown as DialogCtx);

export function DialogProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<DialogState | null>(null);
    const { lang } = useLang();
    const t = {
        bm: { ok: 'OK', cancel: 'Batal', confirm: 'Sahkan', title: 'Sahkan' },
        en: { ok: 'OK', cancel: 'Cancel', confirm: 'Confirm', title: 'Please confirm' },
    }[lang];

    const confirm = useCallback((opts: ConfirmOpts | string) => {
        const o = typeof opts === 'string' ? { message: opts } : opts;
        return new Promise<boolean>((resolve) => setState({ kind: 'confirm', opts: o, resolve }));
    }, []);

    const alert = useCallback((opts: Omit<ConfirmOpts, 'cancelText'> | string) => {
        const o = typeof opts === 'string' ? { message: opts } : opts;
        return new Promise<void>((resolve) => setState({ kind: 'alert', opts: o, resolve: () => resolve() }));
    }, []);

    const close = useCallback((v: boolean) => {
        setState((s) => { s?.resolve(v); return null; });
    }, []);

    useEffect(() => {
        if (!state) return;
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') close(false);
            if (e.key === 'Enter') close(true);
        }
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [state, close]);

    return (
        <Ctx.Provider value={{ confirm, alert }}>
            {children}
            {state && (
                <div className="dlg-root" role="alertdialog" aria-modal="true">
                    <div className="dlg-backdrop" onClick={() => close(false)} />
                    <div className="dlg-panel">
                        <div className="dlg-icon" data-danger={state.opts.danger ? 'true' : 'false'}>
                            {state.opts.danger ? <AlertTriangle size={26} /> : <HelpCircle size={26} />}
                        </div>
                        <h3>{state.opts.title ?? t.title}</h3>
                        <p>{state.opts.message}</p>
                        <div className="dlg-actions">
                            {state.kind === 'confirm' && (
                                <button className="btn btn-ghost" onClick={() => close(false)}>
                                    {state.opts.cancelText ?? t.cancel}
                                </button>
                            )}
                            <button
                                className={`btn ${state.opts.danger ? 'btn-danger' : 'btn-primary'}`}
                                onClick={() => close(true)}
                                autoFocus
                            >
                                {state.opts.confirmText ?? (state.kind === 'confirm' ? t.confirm : t.ok)}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Ctx.Provider>
    );
}

export function useDialog() {
    return useContext(Ctx);
}
