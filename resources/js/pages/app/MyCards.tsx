import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Pencil, ExternalLink, Trash2, Users, Eye, MailPlus, Check, Sparkles, Lock, ShoppingCart } from 'lucide-react';
import { api } from '../../lib/api';
import { Drawer } from '../../components/Drawer';
import { TemplateThumb } from '../../components/TemplateThumb';
import { useDialog } from '../../context/DialogContext';
import { useLang } from '../../context/LangContext';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

interface Card {
    id: string;
    slug: string;
    template_key: string;
    status: 'draft' | 'published';
    groom_name: string;
    bride_name: string;
    views: number;
    guests_count: number;
}
interface Tpl {
    id: string;
    key: string;
    name: string;
    category: string;
    description?: string;
    tier: 'free' | 'premium';
    price_myr: string | number;
    palette?: Record<string, string> | null;
    thumbnail?: string | null;
}

/** True when a create request was rejected because it needs a premium upgrade. */
function requiresUpgrade(err: unknown): boolean {
    const e = err as { response?: { status?: number; data?: { requires_upgrade?: boolean } } };
    return e?.response?.status === 403 && !!e.response?.data?.requires_upgrade;
}

export function MyCards() {
    const [cards, setCards] = useState<Card[]>([]);
    const [templates, setTemplates] = useState<Tpl[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNew, setShowNew] = useState(false);
    const [params, setParams] = useSearchParams();
    const nav = useNavigate();
    const dialog = useDialog();
    const { user } = useAuth();
    const { setItem } = useCart();
    const isPremiumUser = user?.plan === 'premium' || user?.role === 'admin';

    const [tplKey, setTplKey] = useState<string>('');
    const [groom, setGroom] = useState('');
    const [bride, setBride] = useState('');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { lang } = useLang();
    const C = ({
        bm: {
            title: 'Kad Saya',
            subtitle: 'Urus semua jemputan digital anda dari satu ruang yang kemas.',
            createNew: 'Cipta Kad Baharu',
            noCards: 'Belum ada kad lagi',
            emptyBlurb: 'Mulakan kad kahwin digital pertama anda dalam beberapa minit — pilih rekaan, masukkan nama pengantin dan teruskan menyunting.',
            createCard: 'Cipta Kad',
            weddingCard: 'Kad kahwin',
            published: 'Terbit',
            draft: 'Draf',
            views: 'tontonan',
            edit: 'Sunting',
            view: 'Lihat',
            deleteCard: 'Padam kad',
            confirmDelete: 'Padam kad ini? Tindakan ini tidak boleh diundur.',
            createFailed: 'Kad belum berjaya dicipta. Sila cuba sekali lagi.',
            creating: 'Mencipta…',
            create: 'Cipta',
            cancel: 'Batal',
            chooseTemplate: 'Pilih Rekaan',
            free: 'Percuma',
            premium: 'Premium',
            premiumNotice: 'Rekaan ini eksklusif untuk pelan Premium.',
            upgradeCta: 'Naik Taraf',
            addToCart: 'Tambah ke Troli',
            groomName: 'Nama pengantin lelaki',
            brideName: 'Nama pengantin perempuan',
            groomPlaceholder: 'cth. Danial',
            bridePlaceholder: 'cth. Aisyah',
        },
        en: {
            title: 'My Cards',
            subtitle: 'Manage your digital wedding cards',
            createNew: 'Create new card',
            noCards: 'No cards yet',
            emptyBlurb: "Create your first digital wedding card in minutes — pick a template, enter the couple's names, and start editing.",
            createCard: 'Create card',
            weddingCard: 'Wedding Card',
            published: 'Published',
            draft: 'Draft',
            views: 'views',
            edit: 'Edit',
            view: 'View',
            deleteCard: 'Delete card',
            confirmDelete: 'Delete this card? This action cannot be undone.',
            createFailed: 'Failed to create card. Please try again.',
            creating: 'Creating…',
            create: 'Create',
            cancel: 'Cancel',
            chooseTemplate: 'Choose template',
            free: 'Free',
            premium: 'Premium',
            premiumNotice: 'This design is exclusive to the Premium plan.',
            upgradeCta: 'Upgrade',
            addToCart: 'Add to cart',
            groomName: "Groom's name",
            brideName: "Bride's name",
            groomPlaceholder: 'e.g. Danial',
            bridePlaceholder: 'e.g. Aisyah',
        },
    })[lang];

    useEffect(() => {
        Promise.all([api.get<Card[]>('/invitations'), api.get<Tpl[]>('/templates')])
            .then(([c, t]) => {
                setCards(c.data);
                setTemplates(t.data);
                const preset = params.get('tpl');
                const first = t.data[0]?.key ?? '';
                if (preset && t.data.some((x) => x.key === preset)) {
                    setTplKey(preset);
                    setShowNew(true);
                } else {
                    setTplKey(first);
                }
            })
            .finally(() => setLoading(false));
        // Load once on mount; the ?tpl preselect is a first-load concern only.
    }, []);

    const tplByKey = useMemo(() => {
        const m = new Map<string, Tpl>();
        templates.forEach((t) => m.set(t.key, t));
        return m;
    }, [templates]);

    function openDrawer() {
        setError(null);
        if (!tplKey && templates[0]) setTplKey(templates[0].key);
        setShowNew(true);
    }

    function closeDrawer() {
        setShowNew(false);
        setError(null);
        if (params.get('tpl')) {
            params.delete('tpl');
            setParams(params, { replace: true });
        }
    }

    async function create(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setCreating(true);
        try {
            const r = await api.post('/invitations', {
                template_key: tplKey,
                groom_name: groom,
                bride_name: bride,
            });
            nav(`/app/cards/${r.data.id}/edit`);
        } catch (err: unknown) {
            if (requiresUpgrade(err)) {
                setShowNew(false);
                nav('/app/upgrade');
            } else {
                setError(C.createFailed);
            }
        } finally {
            setCreating(false);
        }
    }

    async function remove(id: string) {
        if (!(await dialog.confirm({ message: C.confirmDelete, danger: true }))) return;
        await api.delete(`/invitations/${id}`);
        setCards((c) => c.filter((x) => x.id !== id));
    }

    if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

    const selTpl = tplByKey.get(tplKey);
    const needsUpgrade = selTpl?.tier === 'premium' && !isPremiumUser;
    const canCreate = tplKey !== '' && groom.trim() !== '' && bride.trim() !== '' && !creating && !needsUpgrade;

    return (
        <div>
            <div className="page-head spread">
                <div>
                    <h1>{C.title}</h1>
                    <p className="muted" style={{ margin: 0 }}>{C.subtitle}</p>
                </div>
                <button className="btn btn-primary" onClick={openDrawer}><Plus size={16} /> {C.createNew}</button>
            </div>

            {cards.length === 0 ? (
                <div className="panel center" style={{ padding: 48 }}>
                    <div style={emptyIcon}><MailPlus size={30} color="var(--plum)" /></div>
                    <h3 style={{ marginTop: 14, marginBottom: 4 }}>{C.noCards}</h3>
                    <p className="muted" style={{ maxWidth: 380, margin: '0 auto 18px' }}>
                        {C.emptyBlurb}
                    </p>
                    <button className="btn btn-primary" onClick={openDrawer}><Plus size={16} /> {C.createCard}</button>
                </div>
            ) : (
                <div className="tpl-grid">
                    {cards.map((c) => {
                        const t = tplByKey.get(c.template_key);
                        return (
                            <div className="tpl-card" key={c.id}>
                                <div style={cardThumb}>
                                    <TemplateThumb
                                        name={t?.name ?? c.template_key}
                                        category={t?.category ?? C.weddingCard}
                                        palette={t?.palette}
                                        thumbnail={t?.thumbnail}
                                    />
                                    <span className="badge" style={thumbBadge}>
                                        {c.status === 'published'
                                            ? <span className="badge badge-ok"><Check size={12} /> {C.published}</span>
                                            : <span className="badge">{C.draft}</span>}
                                    </span>
                                </div>
                                <div className="tpl-body">
                                    <h3 style={{ margin: '0 0 4px' }}>{c.bride_name} &amp; {c.groom_name}</h3>
                                    <div className="row" style={{ gap: 16, margin: '2px 0 16px', color: 'var(--muted)', fontSize: 13 }}>
                                        <span className="row" style={{ gap: 6 }}><Eye size={15} /> {c.views} {C.views}</span>
                                        <span className="row" style={{ gap: 6 }}><Users size={15} /> {c.guests_count} RSVP</span>
                                    </div>
                                    <div className="row wrap">
                                        <Link to={`/app/cards/${c.id}/edit`} className="btn btn-primary btn-sm grow"><Pencil size={14} /> {C.edit}</Link>
                                        {c.status === 'published' && (
                                            <a href={`/e/${c.slug}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm"><ExternalLink size={14} /> {C.view}</a>
                                        )}
                                        <button className="btn btn-ghost btn-sm" onClick={() => remove(c.id)} style={{ color: 'var(--bad)' }} aria-label={C.deleteCard}><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <Drawer
                open={showNew}
                onClose={closeDrawer}
                title={C.createNew}
                width={520}
                footer={
                    <>
                        <button type="button" className="btn btn-ghost grow" onClick={closeDrawer}>{C.cancel}</button>
                        {needsUpgrade ? (
                            <button
                                type="button"
                                className="btn btn-gold grow"
                                onClick={() => {
                                    if (selTpl) setItem({ key: selTpl.key, name: selTpl.name, price: Number(selTpl.price_myr), thumbnail: selTpl.thumbnail ?? null });
                                    closeDrawer();
                                    nav('/app/checkout');
                                }}
                            >
                                <ShoppingCart size={16} /> {C.addToCart}
                            </button>
                        ) : (
                            <button type="submit" form="new-card-form" className="btn btn-primary grow" disabled={!canCreate}>
                                <Sparkles size={16} /> {creating ? C.creating : C.create}
                            </button>
                        )}
                    </>
                }
            >
                <form id="new-card-form" onSubmit={create}>
                    <label style={pickerLabel}>{C.chooseTemplate}</label>
                    <div style={pickerGrid}>
                        {templates.map((t) => {
                            const selected = t.key === tplKey;
                            return (
                                <button
                                    type="button"
                                    key={t.id}
                                    onClick={() => setTplKey(t.key)}
                                    style={{ ...pickerCard, ...(selected ? pickerCardOn : {}) }}
                                    aria-pressed={selected}
                                >
                                    <div style={pickerThumb}>
                                        <TemplateThumb name={t.name} category={t.category} palette={t.palette} thumbnail={t.thumbnail} />
                                        {selected && <span style={pickerCheck}><Check size={14} /></span>}
                                    </div>
                                    <div style={{ padding: '9px 10px 10px' }}>
                                        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 5 }}>{t.name}</div>
                                        {t.tier === 'free'
                                            ? <span className="badge badge-free">{C.free}</span>
                                            : <span className="badge badge-gold">{!isPremiumUser && <Lock size={11} style={{ marginRight: 3 }} />}RM{Number(t.price_myr)}</span>}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {needsUpgrade && (
                        <div className="row" style={{ gap: 8, background: '#fbf1d8', color: '#8a6a1e', padding: '10px 12px', borderRadius: 10, fontSize: 13, marginTop: 12 }}>
                            <Lock size={15} /> {C.premiumNotice}
                        </div>
                    )}

                    <div className="field" style={{ marginTop: 20 }}>
                        <label>{C.groomName}</label>
                        <input value={groom} onChange={(e) => setGroom(e.target.value)} placeholder={C.groomPlaceholder} required />
                    </div>
                    <div className="field">
                        <label>{C.brideName}</label>
                        <input value={bride} onChange={(e) => setBride(e.target.value)} placeholder={C.bridePlaceholder} required />
                    </div>

                    {error && <p className="form-err">{error}</p>}
                </form>
            </Drawer>
        </div>
    );
}

const emptyIcon: React.CSSProperties = {
    width: 64, height: 64, borderRadius: 18, background: 'var(--cream)',
    display: 'grid', placeItems: 'center', margin: '0 auto',
};
const cardThumb: React.CSSProperties = {
    position: 'relative', height: 190, overflow: 'hidden', background: 'var(--cream)',
    borderBottom: '1px solid var(--line)',
};
const thumbBadge: React.CSSProperties = {
    position: 'absolute', top: 10, right: 10, background: 'transparent', padding: 0,
};
const pickerLabel: React.CSSProperties = {
    display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 10,
};
const pickerGrid: React.CSSProperties = {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12,
};
const pickerCard: React.CSSProperties = {
    padding: 0, textAlign: 'left', background: '#fff', border: '2px solid var(--line)',
    borderRadius: 14, overflow: 'hidden', cursor: 'pointer', transition: '0.16s ease',
};
const pickerCardOn: React.CSSProperties = {
    borderColor: 'var(--plum)', boxShadow: '0 8px 22px -12px rgba(91,42,69,0.5)',
};
const pickerThumb: React.CSSProperties = {
    position: 'relative', height: 150, overflow: 'hidden', background: 'var(--cream)',
};
const pickerCheck: React.CSSProperties = {
    position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: '50%',
    background: 'var(--plum)', color: '#fff', display: 'grid', placeItems: 'center',
};
