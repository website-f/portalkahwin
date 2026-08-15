import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Type, Plus, Trash2, Lock, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../../lib/api';
import { useLang, dict } from '../../context/LangContext';
import {
    CARD_FONTS, makeGoogleFont, parseGoogleFontsImport, registerCustomFonts,
    loadCardFont, allCardFonts, type CardFont,
} from '../../lib/cardFonts';
import { catalogGroupFor } from '../../lib/googleFontsCatalog';
import { FontSearchSelect } from '../../components/FontSearchSelect';

const PAGE_SIZE = 12;
const GROUPS = ['serif', 'sans', 'display', 'script'] as const;

/**
 * Dedicated admin page for the card display fonts — moved out of Settings once
 * the collection grew past a screenful. Shows the FULL inventory a host can pick
 * (built-ins + admin-added), paginated and filterable, and both ways to add more
 * (search the catalogue, or paste a Google embed / @import).
 */
export function AdminFonts() {
    const { lang } = useLang();
    const [cardFonts, setCardFonts] = useState<CardFont[]>([]); // admin-added (removable)
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [pasteCode, setPasteCode] = useState('');
    const [msg, setMsg] = useState<string | null>(null);
    const [filter, setFilter] = useState('');
    const [catFilter, setCatFilter] = useState<'all' | CardFont['group']>('all');
    const [page, setPage] = useState(1);

    const C = dict({
        bm: {
            title: 'Fon Kad', back: 'Kembali ke Tetapan',
            sub: 'Semua fon yang boleh dipilih hos untuk nama pada kad — fon terbina + fon Google yang anda tambah.',
            searchLabel: 'Cari & tambah fon', searchPh: 'Cari fon Google… cth. Poppins',
            noMatch: 'Tiada dalam senarai — taip nama untuk tambah sebagai fon tersuai.',
            useCustom: (q: string) => `Guna “${q}”`,
            pasteLabel: 'Atau tampal kod embed / @import', pasteAdd: 'Tambah dari kod',
            pasteHint: 'Di Google Fonts → “Get embed code”, salin baris <link> atau @import dan tampal di sini. Berat & gaya dikekalkan.',
            addedN: (n: number) => `${n} fon ditambah.`,
            already: 'Sudah ada dalam koleksi.', pasteNone: 'Tiada Google Font ditemui dalam kod itu.',
            inventory: 'Fon dalam sistem',
            countLine: (t: number, b: number, c: number) => `${t} fon · ${b} terbina · ${c} tambahan`,
            filterPh: 'Tapis fon…', all: 'Semua',
            groups: { serif: 'Serif', script: 'Skrip', display: 'Paparan', sans: 'Sans' } as Record<CardFont['group'], string>,
            builtin: 'Terbina', removeConfirm: 'Buang fon ini?',
            empty: 'Tiada fon sepadan.', pageOf: (a: number, b: number) => `Halaman ${a} / ${b}`,
            prev: 'Sebelum', next: 'Seterusnya', saving: 'Menyimpan…',
        },
        en: {
            title: 'Card Fonts', back: 'Back to Settings',
            sub: 'Every font a host can pick for the names on a card — the built-ins plus the Google fonts you add.',
            searchLabel: 'Search & add a font', searchPh: 'Search Google Fonts… e.g. Poppins',
            noMatch: 'Not in the list — type a name to add it as a custom family.',
            useCustom: (q: string) => `Use “${q}”`,
            pasteLabel: 'Or paste embed / @import code', pasteAdd: 'Add from code',
            pasteHint: 'On Google Fonts → “Get embed code”, copy the <link> or @import line and paste it here. Weights & styles are kept.',
            addedN: (n: number) => `${n} font${n === 1 ? '' : 's'} added.`,
            already: 'Already in your collection.', pasteNone: 'No Google Fonts found in that code.',
            inventory: 'Fonts in the system',
            countLine: (t: number, b: number, c: number) => `${t} fonts · ${b} built-in · ${c} added`,
            filterPh: 'Filter fonts…', all: 'All',
            groups: { serif: 'Serif', script: 'Script', display: 'Display', sans: 'Sans' } as Record<CardFont['group'], string>,
            builtin: 'Built-in', removeConfirm: 'Remove this font?',
            empty: 'No fonts match.', pageOf: (a: number, b: number) => `Page ${a} of ${b}`,
            prev: 'Prev', next: 'Next', saving: 'Saving…',
        },
        zh: {
            title: '请柬字体', back: '返回设置',
            sub: '主持人可为请柬姓名选用的全部字体——内置字体加上您添加的 Google 字体。',
            searchLabel: '搜索并添加字体', searchPh: '搜索 Google 字体… 例如 Poppins',
            noMatch: '列表中没有——输入名称以添加为自定义字体。',
            useCustom: (q: string) => `使用“${q}”`,
            pasteLabel: '或粘贴嵌入 / @import 代码', pasteAdd: '从代码添加',
            pasteHint: '在 Google Fonts →「Get embed code」复制 <link> 或 @import 一行粘贴到此。粗细与样式将保留。',
            addedN: (n: number) => `已添加 ${n} 个字体。`,
            already: '已在您的字体集中。', pasteNone: '未在该代码中找到 Google 字体。',
            inventory: '系统中的字体',
            countLine: (t: number, b: number, c: number) => `${t} 个字体 · ${b} 个内置 · ${c} 个添加`,
            filterPh: '筛选字体…', all: '全部',
            groups: { serif: '衬线体', script: '手写体', display: '展示体', sans: '无衬线体' } as Record<CardFont['group'], string>,
            builtin: '内置', removeConfirm: '移除此字体？',
            empty: '没有匹配的字体。', pageOf: (a: number, b: number) => `第 ${a} / ${b} 页`,
            prev: '上一页', next: '下一页', saving: '保存中…',
        },
    }, lang);

    useEffect(() => {
        api.get<{ card_fonts?: CardFont[] }>('/admin/settings').then((r) => {
            const fonts = Array.isArray(r.data.card_fonts) ? r.data.card_fonts : [];
            setCardFonts(fonts);
            registerCustomFonts(fonts);
        }).finally(() => setLoading(false));
    }, []);

    // The full inventory the host editor sees: built-ins + admin-added.
    const all = useMemo(() => {
        const customIds = new Set(cardFonts.map((f) => f.id));
        return [...CARD_FONTS.filter((f) => !customIds.has(f.id)), ...cardFonts];
    }, [cardFonts]);

    const filtered = useMemo(() => {
        const q = filter.trim().toLowerCase();
        return all
            .filter((f) => catFilter === 'all' || f.group === catFilter)
            .filter((f) => !q || f.label.toLowerCase().includes(q));
    }, [all, filter, catFilter]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const clampedPage = Math.min(page, pageCount);
    const shown = filtered.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

    // Load faces for the current page so the previews render in their own font.
    useEffect(() => { shown.forEach((f) => loadCardFont(f.id)); }, [clampedPage, filter, catFilter, cardFonts]); // eslint-disable-line react-hooks/exhaustive-deps
    // A filter change should send you back to page 1.
    useEffect(() => { setPage(1); }, [filter, catFilter]);

    async function persist(next: CardFont[]) {
        setCardFonts(next);
        registerCustomFonts(next); // live immediately for the editor + cards
        setSaving(true);
        try { await api.put('/admin/settings', { card_fonts: next }); }
        finally { setSaving(false); }
    }
    function addFonts(incoming: CardFont[]): number {
        const haveIds = new Set(cardFonts.map((f) => f.id));
        const haveLabels = new Set(allCardFonts().map((f) => f.label.toLowerCase())); // built-ins + added
        const fresh = incoming.filter((f) => f && f.id && !haveIds.has(f.id) && !haveLabels.has(f.label.toLowerCase()));
        if (!fresh.length) return 0;
        void persist([...cardFonts, ...fresh]);
        fresh.forEach((f) => loadCardFont(f.id));
        return fresh.length;
    }
    const addFromCatalog = (name: string, group: CardFont['group']) => {
        const n = addFonts([makeGoogleFont(name, group)]);
        setMsg(n ? C.addedN(n) : C.already);
    };
    function addFromPaste() {
        const parsed = parseGoogleFontsImport(pasteCode);
        if (!parsed.length) { setMsg(C.pasteNone); return; }
        const n = addFonts(parsed.map((p) => makeGoogleFont(p.family, catalogGroupFor(p.family), p.google)));
        setPasteCode('');
        setMsg(n ? C.addedN(n) : C.already);
    }
    function removeFont(id: string) {
        if (!window.confirm(C.removeConfirm)) return;
        void persist(cardFonts.filter((f) => f.id !== id));
    }

    const isCustom = (f: CardFont) => cardFonts.some((c) => c.id === f.id);
    const takenLabels = new Set(all.map((f) => f.label.toLowerCase()));

    return (
        <div>
            <div className="page-head spread">
                <div className="row">
                    <Link to="/admin/settings" className="btn btn-ghost btn-sm"><ArrowLeft size={15} /></Link>
                    <div>
                        <h1 style={{ fontSize: 26 }}><Type size={20} style={{ verticalAlign: '-3px', marginRight: 8, color: 'var(--plum)' }} />{C.title}</h1>
                        <p className="muted" style={{ margin: 0, fontSize: 13 }}>{C.sub}</p>
                    </div>
                </div>
                <Link to="/admin/settings" className="btn btn-ghost btn-sm"><ArrowLeft size={15} /> {C.back}</Link>
            </div>

            {/* ---- Add fonts ---- */}
            <div className="panel" style={{ maxWidth: 920, margin: '4px auto 0' }}>
                <div className="field" style={{ margin: 0 }}>
                    <label>{C.searchLabel}</label>
                    <FontSearchSelect
                        taken={takenLabels}
                        onPick={addFromCatalog}
                        placeholder={C.searchPh}
                        noMatch={C.noMatch}
                        useCustom={C.useCustom}
                    />
                </div>
                <div className="field" style={{ margin: '16px 0 0' }}>
                    <label>{C.pasteLabel}</label>
                    <textarea
                        value={pasteCode}
                        onChange={(e) => setPasteCode(e.target.value)}
                        placeholder={"@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@300..700&family=Baloo+2&display=swap');"}
                        rows={3}
                        style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: 12.5, resize: 'vertical' }}
                    />
                    <div className="row" style={{ marginTop: 8, gap: 10, alignItems: 'center' }}>
                        <button type="button" className="btn btn-primary btn-sm" onClick={addFromPaste} disabled={!pasteCode.trim() || saving}>
                            <Plus size={15} /> {C.pasteAdd}
                        </button>
                        {msg && <span className="muted" style={{ fontSize: 12.5 }}>{msg}</span>}
                    </div>
                    <small className="muted" style={{ display: 'block', marginTop: 6 }}>{C.pasteHint}</small>
                </div>
            </div>

            {/* ---- Inventory ---- */}
            <div className="panel" style={{ maxWidth: 920, margin: '18px auto 0' }}>
                <div className="spread" style={{ alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                    <div>
                        <h3 style={{ margin: 0 }}>{C.inventory}</h3>
                        <p className="muted" style={{ margin: '2px 0 0', fontSize: 12.5 }}>
                            {C.countLine(all.length, CARD_FONTS.length, cardFonts.length)}
                        </p>
                    </div>
                    <input
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        placeholder={C.filterPh}
                        style={{ maxWidth: 220 }}
                    />
                </div>

                <div className="row wrap" style={{ gap: 6, marginBottom: 14 }}>
                    <button type="button" className={`btn btn-sm ${catFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setCatFilter('all')}>{C.all}</button>
                    {GROUPS.map((g) => (
                        <button key={g} type="button" className={`btn btn-sm ${catFilter === g ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setCatFilter(g)}>{C.groups[g]}</button>
                    ))}
                </div>

                {loading ? (
                    <p className="muted" style={{ fontSize: 13 }}>…</p>
                ) : filtered.length === 0 ? (
                    <p className="muted" style={{ fontSize: 13 }}>{C.empty}</p>
                ) : (
                    <>
                        <div style={{ display: 'grid', gap: 8 }}>
                            {shown.map((f) => (
                                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', border: '1px solid var(--line)', borderRadius: 10 }}>
                                    <span style={{ fontFamily: f.stack, fontSize: 23, lineHeight: 1.1, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.label}</span>
                                    <span className={`badge fss-${f.group}`} style={{ background: 'var(--cream)' }}>{C.groups[f.group]}</span>
                                    {isCustom(f) ? (
                                        <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--bad)' }} onClick={() => removeFont(f.id)} aria-label={f.label}><Trash2 size={14} /></button>
                                    ) : (
                                        <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Lock size={11} /> {C.builtin}</span>
                                    )}
                                </div>
                            ))}
                        </div>

                        {pageCount > 1 && (
                            <div className="row" style={{ justifyContent: 'center', gap: 14, marginTop: 16 }}>
                                <button type="button" className="btn btn-ghost btn-sm" disabled={clampedPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft size={15} /> {C.prev}</button>
                                <span className="muted" style={{ fontSize: 13 }}>{C.pageOf(clampedPage, pageCount)}</span>
                                <button type="button" className="btn btn-ghost btn-sm" disabled={clampedPage >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>{C.next} <ChevronRight size={15} /></button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
