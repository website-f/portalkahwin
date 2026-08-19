import { Fragment, type CSSProperties } from 'react';

/**
 * Split a composed parents string ("Father & Mother", or the legacy
 * "Bin Ahmad & Puan Siti") into individual names, so father and mother can be
 * shown on their own lines the way a Malay walimah invitation reads.
 */
export function splitFamily(s?: string | null): string[] {
    return (s ?? '').split(/\s+&\s+|\s+dan\s+/i).map((x) => x.trim()).filter(Boolean);
}

/** True when a bride-leading invite side should read the bride's family first. */
export function brideLeads(inviteSide?: string | null): boolean {
    return inviteSide === 'bride' || inviteSide === 'both_bride';
}

/**
 * The inviting family/families — the hosts who invite guests to their child's
 * wedding. Rendered as its OWN block, ABOVE the invitation line and SEPARATE
 * from the couple's names (per the invitation-intro spec): each family's
 * father and mother sit on their own line with an "&" between.
 *
 * The server already nulls the non-inviting side (namesGroomSide/namesBrideSide),
 * so for a bride-only card just the bride's parents appear. Bride-leading sides
 * put the bride's family first. Renders nothing when no parents are set.
 */
export function InvitingHosts({
    intro,
    groomParents,
    brideParents,
    inviteSide,
    primary,
    accent,
    secondary,
    serif,
    background,
    maxWidth = 600,
}: {
    /** Greeting/lead-in shown above the parents ("Assalamualaikum … kami"). */
    intro?: string | null;
    groomParents?: string | null;
    brideParents?: string | null;
    inviteSide?: string | null;
    /** Name ink. */
    primary: string;
    /** "&" separator colour. */
    accent: string;
    /** Muted tone for the greeting (falls back to primary). */
    secondary?: string;
    /** Font stack (defaults to a serif). */
    serif?: string;
    background?: string;
    maxWidth?: number;
}) {
    const ordered = brideLeads(inviteSide) ? [brideParents, groomParents] : [groomParents, brideParents];
    const families = ordered.map(splitFamily).filter((f) => f.length > 0);
    const greeting = (intro ?? '').trim();
    if (families.length === 0 && !greeting) return null;
    const face = serif ?? 'Georgia, "Times New Roman", serif';

    return (
        <section style={{ ...sectionStyle, background }}>
            <div style={{ maxWidth, margin: '0 auto' }}>
                {greeting && (
                    <p style={{ fontFamily: face, fontSize: 'clamp(15px, 3.4vw, 19px)', lineHeight: 1.65, color: secondary ?? primary, margin: '0 0 22px', whiteSpace: 'pre-line' }}>
                        {greeting}
                    </p>
                )}
                {families.map((names, fi) => (
                    <div key={fi} style={{ marginTop: fi ? 26 : 0 }}>
                        {names.map((n, i) => (
                            <Fragment key={i}>
                                <div style={{ fontFamily: face, fontSize: 'clamp(19px, 4.4vw, 27px)', fontWeight: 500, color: primary, lineHeight: 1.4 }}>{n}</div>
                                {i < names.length - 1 && (
                                    <div style={{ fontFamily: face, fontStyle: 'italic', fontSize: 'clamp(15px, 3.4vw, 19px)', color: accent, margin: '3px 0' }}>&amp;</div>
                                )}
                            </Fragment>
                        ))}
                    </div>
                ))}
            </div>
        </section>
    );
}

const sectionStyle: CSSProperties = {
    padding: 'clamp(40px, 8vw, 64px) 22px 8px',
    textAlign: 'center',
    position: 'relative',
    zIndex: 1,
};
