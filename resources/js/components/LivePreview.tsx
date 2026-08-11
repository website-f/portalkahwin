import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Radio } from 'lucide-react';
import { getTemplate } from '../templates/registry';
import { useLang } from '../context/LangContext';
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
 * template in `preview` mode inside a scaled, scrollable device frame.
 */
export function LivePreview({ inv }: { inv: Inv }) {
    const { lang } = useLang();
    const C = ({
        bm: { livePreview: 'Pratonton Langsung' },
        en: { livePreview: 'Live Preview' },
    })[lang];
    const frameRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [stageH, setStageH] = useState(0);

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
        };

        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(frame);
        ro.observe(stage);
        return () => ro.disconnect();
    }, []);

    const liveData = useMemo<InvitationData>(
        () => ({
            groomName: inv.groom_name,
            brideName: inv.bride_name,
            groomShort: inv.groom_short,
            brideShort: inv.bride_short,
            groomParents: inv.groom_parents,
            brideParents: inv.bride_parents,
            openingLine: inv.opening_line,
            bismillah: inv.bismillah,
            coverImage: inv.cover_image ?? undefined,
            akadAt: inv.akad_at,
            receptionAt: inv.reception_at,
            dateLabel: inv.date_label,
            timeLabel: inv.time_label,
            hijriLabel: inv.hijri_label,
            venueName: inv.venue_name,
            venueAddress: inv.venue_address,
            mapsUrl: inv.maps_url,
            wazeUrl: inv.waze_url,
            program: inv.program,
            contacts: inv.contacts,
            gift: inv.gift,
            galleryImages: inv.gallery_images ?? undefined,
            musicUrl: inv.music_url ?? undefined,
            palette: inv.palette,
        }),
        [inv],
    );

    const Tpl = getTemplate(inv.template_key);

    return (
        <div>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    marginBottom: 10,
                }}
            >
                <span
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: 'var(--plum)',
                        background: 'var(--cream)',
                        padding: '5px 11px',
                        borderRadius: 999,
                    }}
                >
                    <Radio size={13} color="var(--gold)" /> {C.livePreview}
                </span>
                <span className="muted" style={{ fontSize: 12 }}>/e/{inv.slug}</span>
            </div>

            <div
                ref={frameRef}
                style={{
                    width: '100%',
                    maxWidth: 460,
                    margin: '0 auto',
                    height: 'min(78vh, 820px)',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    borderRadius: 22,
                    border: '6px solid #fff',
                    boxShadow: 'var(--shadow), 0 0 0 1px var(--line)',
                    background: '#fff',
                }}
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
                        }}
                    >
                        <Tpl data={liveData} preview />
                    </div>
                </div>
            </div>
        </div>
    );
}
