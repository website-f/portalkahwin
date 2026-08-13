import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Radio } from 'lucide-react';
import { getTemplate } from '../templates/registry';
import { CardStage } from '../templates/PkSec';
import { mediaUrl, mediaUrls } from '../lib/base';
import { formatHijri } from '../lib/datetime';
import { useLang, dict } from '../context/LangContext';
import { WishlistView } from '../components/WishlistView';
import type { InvitationData } from '../templates/types';
import type { Inv } from '../pages/app/CardEditor';

// Natural width the card is rendered at before it is scaled to fit the
// device frame. The stage is drawn at this width, then transform-scaled so
// its visual width matches the frame — a shrunk-down "real device" view.
const STAGE_W = 460;

/**
 * Live, continuously re-rendering preview of the wedding card.
 * Maps the snake_case editor state (`Inv`) onto the camelCase
 * `InvitationData` the templates consume, then renders the chosen
 * template in `preview` mode inside a scaled, scrollable phone frame.
 *
 * Section toggles are mirrored here exactly as the backend suppresses them on
 * the live card: when a section flag is false its data is omitted so the
 * template simply does not render that block. `sections` is also passed
 * through for any template that honours it directly.
 */
export function LivePreview({ inv, baseKey, templateConfig }: { inv: Inv; baseKey?: string; templateConfig?: import('../templates/customConfig').CustomTemplateConfig }) {
    const { lang } = useLang();
    const C = dict({
        bm: { livePreview: 'Pratonton Langsung' },
        en: { livePreview: 'Live Preview' },
        zh: { livePreview: '实时预览' },
    }, lang);
    const frameRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [stageH, setStageH] = useState(0);
    // One "screenful" in STAGE_W coordinates. Templates size their cover section
    // with min-height: var(--pk-vh, 100vh) — and raw 100vh here would mean the
    // whole browser window, not this little phone frame, so a full-height hero
    // came out far taller than the screen it is supposed to fill.
    const [frameVh, setFrameVh] = useState<number | null>(null);

    // Keep the scaled stage sized to the frame, and reserve the correct
    // (scaled) height so vertical scrolling covers exactly the card.
    useLayoutEffect(() => {
        const frame = frameRef.current;
        const stage = stageRef.current;
        if (!frame || !stage) return;

        const measure = () => {
            const contentW = frame.clientWidth;
            const s = Math.min(1, contentW / STAGE_W);
            setScale(s);
            setStageH(stage.offsetHeight * s);
            // Undo the scale so the hero fills exactly the visible frame.
            //
            // Guard hard: min-height: var(--pk-vh, 100vh) only uses its fallback
            // when the variable is UNDEFINED. A defined-but-nonsense value (0px
            // from an unlaid-out frame, NaNpx from a zero scale) is invalid at
            // computed-value time, which silently drops min-height to `auto` and
            // collapses the cover onto its own content.
            const vh = frame.clientHeight / s;
            setFrameVh(Number.isFinite(vh) && vh > 200 ? vh : null);
        };

        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(frame);
        ro.observe(stage);
        return () => ro.disconnect();
    }, []);

    // Per-section visibility — default on. Mirrors the live card's suppression.
    const on = (key: string): boolean => inv.sections?.[key] ?? true;

    const liveData = useMemo<InvitationData>(() => {
        const vis = (key: string): boolean => inv.sections?.[key] ?? true;
        return {
            groomName: inv.groom_name,
            brideName: inv.bride_name,
            groomShort: inv.groom_short,
            brideShort: inv.bride_short,
            groomParents: inv.groom_parents,
            brideParents: inv.bride_parents,
            openingLine: vis('opening') ? inv.opening_line : undefined,
            bismillah: inv.bismillah,
            coverImage: mediaUrl(inv.cover_image),
            akadAt: inv.akad_at,
            receptionAt: inv.reception_at,
            dateLabel: inv.date_label,
            timeLabel: inv.time_label,
            hijriLabel: formatHijri(inv.akad_at ?? inv.reception_at, lang, inv.hijri_label),
            venueName: vis('location') ? inv.venue_name : undefined,
            venueAddress: vis('location') ? inv.venue_address : undefined,
            mapsUrl: vis('location') ? inv.maps_url : undefined,
            wazeUrl: vis('location') ? inv.waze_url : undefined,
            program: vis('program') ? inv.program : undefined,
            contacts: vis('contacts') ? inv.contacts : undefined,
            gift: vis('gift') ? inv.gift : undefined,
            galleryImages: vis('gallery') ? mediaUrls(inv.gallery_images) : undefined,
            musicUrl: mediaUrl(inv.music_url),
            palette: inv.palette,
            fontId: inv.font_id,
            sections: inv.sections,
            sectionOrder: inv.section_order,
            templateConfig,
        };
    }, [inv, templateConfig]);

    const showWishlist = on('wishlist') && !!inv.wishlist && inv.wishlist.length > 0;
    // A contributed design renders with its base component (baseKey) + custom palette.
    const Tpl = getTemplate(baseKey || inv.template_key);

    return (
        <div style={{ width: '100%' }}>
            <div className="lp-labelrow">
                <span className="lp-pill">
                    <Radio size={13} color="var(--gold)" /> {C.livePreview}
                </span>
                <span className="lp-slug">· /e/{inv.slug}</span>
            </div>

            <div className="lp-device">
                <span className="lp-speaker" aria-hidden="true" />
                <div
                    ref={frameRef}
                    className="pk-scroll lp-screen"
                    style={{ height: 'min(70vh, 760px)' }}
                >
                    <div style={{ height: stageH, overflow: 'hidden' }}>
                        <div
                            ref={stageRef}
                            style={{
                                width: STAGE_W,
                                transform: `scale(${scale})`,
                                transformOrigin: 'top left',
                                // preview is display-only; scrolling happens on the frame
                                pointerEvents: 'none',
                                ...(frameVh ? ({ '--pk-vh': `${frameVh}px` } as React.CSSProperties) : null),
                            }}
                        >
                            {/* RSVP is bottom-bar only on the live card — no inline `rsvp` slot.
                                `wishes` is a live guestbook (fetched on the real card); the preview
                                leaves it unset so the template shows its neutral placeholder, which
                                matches the live card when the Ucapan section is switched off.
                                `wishlist` is injected only when present AND its section is on. */}
                            <CardStage order={inv.section_order} hidden={{ wishes: !on('wishes') }} fontId={inv.font_id}>
                                <Tpl
                                    data={liveData}
                                    preview
                                    slots={{
                                        wishlist: showWishlist ? <WishlistView items={inv.wishlist} /> : undefined,
                                    }}
                                />
                            </CardStage>
                        </div>
                    </div>
                </div>
            </div>

            <style>{LP_CSS}</style>
        </div>
    );
}

const LP_CSS = `
.lp-labelrow { display: flex; align-items: center; justify-content: center; gap: 8px; margin: 0 0 16px; flex-wrap: wrap; }
.lp-pill {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
    color: var(--plum); background: var(--cream); padding: 5px 11px; border-radius: 999px;
}
.lp-slug { font-size: 12px; color: var(--muted); letter-spacing: 0.02em; }
.lp-device {
    width: 100%; max-width: 452px; margin: 0 auto; padding: 12px 12px 16px;
    background: linear-gradient(160deg, #f5f4fb 0%, #e8e6f4 100%);
    border-radius: 46px;
    box-shadow: 0 34px 80px -34px rgba(74, 59, 196, 0.5), 0 0 0 1px rgba(74, 59, 196, 0.07), inset 0 1px 0 rgba(255, 255, 255, 0.8);
}
.lp-speaker { display: block; width: 46px; height: 5px; border-radius: 999px; background: rgba(30, 26, 51, 0.18); margin: 2px auto 10px; }
.lp-screen {
    width: 100%; overflow-y: auto; overflow-x: hidden;
    border-radius: 34px; border: 1px solid var(--line); background: #fff;
}
`;
