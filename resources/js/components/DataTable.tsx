import { useMemo, useState, type ReactNode } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { useLang, dict } from '../context/LangContext';

export interface Column<T> {
    key: string;
    label: string;
    render?: (row: T) => ReactNode;
    sortValue?: (row: T) => string | number;
    sortable?: boolean;
    align?: 'left' | 'right' | 'center';
}

interface Props<T> {
    columns: Column<T>[];
    rows: T[];
    searchKeys?: (keyof T)[];
    pageSize?: number;
    onRowClick?: (row: T) => void;
    empty?: ReactNode;
    toolbar?: ReactNode;
    /** When set, renders an Export button that downloads the current filtered+sorted rows as `<exportName>.csv`. */
    exportName?: string;
    /**
     * Enables row selection. `rowId` must be stable across renders — selection
     * is tracked by id, not index, so it survives sorting, filtering and paging.
     * `bulkActions` are rendered once at least one row is picked.
     */
    rowId?: (row: T) => string;
    bulkActions?: (selected: T[], clear: () => void) => ReactNode;
}

/** Responsive data table with client-side search, sort and pagination. */
export function DataTable<T extends Record<string, any>>({
    columns, rows, searchKeys = [], pageSize = 10, onRowClick, empty, toolbar, exportName,
    rowId, bulkActions,
}: Props<T>) {
    const { lang } = useLang();
    const t = dict({
        bm: { search: 'Cari…', empty: 'Belum ada rekod.', records: 'rekod', page: 'halaman', export: 'Eksport',
            selectAll: 'Pilih semua', selectRow: 'Pilih baris', selectedN: (n: number) => `${n} dipilih`, clear: 'Batal pilih' },
        en: { search: 'Search…', empty: 'No records.', records: 'records', page: 'page', export: 'Export',
            selectAll: 'Select all', selectRow: 'Select row', selectedN: (n: number) => `${n} selected`, clear: 'Clear' },
        zh: { search: '搜索…', empty: '暂无记录。', records: '条记录', page: '第', export: '导出',
            selectAll: '全选', selectRow: '选择此行', selectedN: (n: number) => `已选 ${n} 项`, clear: '取消选择' },
    }, lang);
    const [q, setQ] = useState('');
    const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
    const [page, setPage] = useState(1);
    const [picked, setPicked] = useState<Set<string>>(() => new Set());

    const selectable = !!rowId && !!bulkActions;
    const idOf = (row: T) => rowId!(row);

    const filtered = useMemo(() => {
        let out = rows;
        if (q && searchKeys.length) {
            const s = q.toLowerCase();
            out = out.filter((r) => searchKeys.some((k) => String(r[k] ?? '').toLowerCase().includes(s)));
        }
        if (sort) {
            const col = columns.find((c) => c.key === sort.key);
            const val = (r: T) => (col?.sortValue ? col.sortValue(r) : r[sort.key]);
            out = [...out].sort((a, b) => {
                const av = val(a), bv = val(b);
                if (av === bv) return 0;
                const res = av > bv ? 1 : -1;
                return sort.dir === 'asc' ? res : -res;
            });
        }
        return out;
    }, [rows, q, sort, columns, searchKeys]);

    const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const current = Math.min(page, pages);
    const slice = filtered.slice((current - 1) * pageSize, current * pageSize);

    function toggleSort(key: string) {
        setSort((s) => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
    }

    function exportCsv() {
        if (!exportName) return;
        // RFC 4180: wrap every field in double-quotes and double any internal quotes.
        const esc = (v: unknown) => `"${(v == null ? '' : String(v)).replace(/"/g, '""')}"`;
        const lines = [
            columns.map((c) => esc(c.label)).join(','),
            ...filtered.map((row) =>
                columns.map((c) => esc(c.sortValue ? c.sortValue(row) : row[c.key])).join(',')),
        ];
        // Prepend a UTF-8 BOM so Excel renders accented characters correctly.
        const csv = '﻿' + lines.join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${exportName}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Selection is scoped to what is currently visible: "select all" on a
    // filtered table means the filtered rows, never the hidden ones.
    const selected = selectable ? filtered.filter((r) => picked.has(idOf(r))) : [];
    const allShown = filtered.length > 0 && filtered.every((r) => picked.has(idOf(r)));
    const clearPicked = () => setPicked(new Set());

    function toggleRow(row: T): void {
        const id = idOf(row);
        setPicked((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }

    function toggleAll(): void {
        setPicked(allShown ? new Set() : new Set(filtered.map(idOf)));
    }

    return (
        <div className="dt">
            <div className="dt-toolbar">
                {searchKeys.length > 0 && (
                    <div className="dt-search">
                        <Search size={15} />
                        <input placeholder={t.search} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
                    </div>
                )}
                {exportName && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={exportCsv}>
                        <Download size={15} /> {t.export}
                    </button>
                )}
                {toolbar}
            </div>

            {/* The bulk bar replaces nothing — it appears above the rows only
                while a selection exists, so the table never shifts otherwise. */}
            {selectable && selected.length > 0 && (
                <div className="dt-bulk">
                    <strong>{t.selectedN(selected.length)}</strong>
                    <div className="row wrap" style={{ gap: 8 }}>
                        {bulkActions!(selected, clearPicked)}
                        <button type="button" className="btn btn-ghost btn-sm" onClick={clearPicked}>{t.clear}</button>
                    </div>
                </div>
            )}

            <div className="table-wrap">
                <table className="table">
                    <thead>
                        <tr>
                            {selectable && (
                                <th style={{ width: 40 }}>
                                    <input
                                        type="checkbox"
                                        aria-label={t.selectAll}
                                        checked={allShown}
                                        ref={(el) => {
                                            // Indeterminate is a property, not an attribute — React
                                            // cannot set it through JSX.
                                            if (el) el.indeterminate = selected.length > 0 && !allShown;
                                        }}
                                        onChange={toggleAll}
                                    />
                                </th>
                            )}
                            {columns.map((c) => (
                                <th key={c.key} style={{ textAlign: c.align ?? 'left', cursor: c.sortable ? 'pointer' : 'default' }}
                                    onClick={() => c.sortable && toggleSort(c.key)}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                        {c.label}
                                        {c.sortable && sort?.key === c.key && (sort.dir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />)}
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {slice.length === 0 && (
                            <tr><td colSpan={columns.length + (selectable ? 1 : 0)} className="muted center" style={{ padding: 28 }}>{empty ?? t.empty}</td></tr>
                        )}
                        {slice.map((row, i) => (
                            <tr
                                key={selectable ? idOf(row) : i}
                                onClick={() => onRowClick?.(row)}
                                style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                                className={selectable && picked.has(idOf(row)) ? 'is-picked' : undefined}
                            >
                                {selectable && (
                                    <td onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            aria-label={t.selectRow}
                                            checked={picked.has(idOf(row))}
                                            onChange={() => toggleRow(row)}
                                        />
                                    </td>
                                )}
                                {columns.map((c) => (
                                    <td key={c.key} style={{ textAlign: c.align ?? 'left' }}>
                                        {c.render ? c.render(row) : String(row[c.key] ?? '')}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {pages > 1 && (
                <div className="dt-pager">
                    <span className="muted">{filtered.length} {t.records} · {t.page} {current}/{pages}</span>
                    <div className="row">
                        <button className="btn btn-ghost btn-sm" disabled={current <= 1} onClick={() => setPage(current - 1)}><ChevronLeft size={15} /></button>
                        <button className="btn btn-ghost btn-sm" disabled={current >= pages} onClick={() => setPage(current + 1)}><ChevronRight size={15} /></button>
                    </div>
                </div>
            )}
        </div>
    );
}
