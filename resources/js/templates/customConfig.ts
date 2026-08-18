// ============================================================
// Config contract for the no-code CUSTOM template designer.
// A "custom" design is a JSON config (this shape) stored on the
// template row and rendered by the single `Custom` engine component.
// The Designer UI edits this; the engine + previews read it.
// ============================================================

export interface CustomPalette {
    primary: string;   // headings / names
    secondary: string; // supporting text
    accent: string;    // florals / lines / highlights
    bg: string;        // page background
    text: string;      // body text
}

/** Per-section background + scroll-in animation. */
export interface CustomSectionConfig {
    enabled: boolean;
    bg: {
        type: 'none' | 'color' | 'gradient' | 'image';
        color?: string;   // color / gradient stop 1
        color2?: string;  // gradient stop 2
        angle?: number;   // gradient angle (deg)
        image?: string;   // /storage url for image bg
    };
    animation: 'none' | 'fade' | 'slideUp' | 'slideLeft' | 'zoom';
}

export type CoverReveal = 'plain' | 'curtain' | 'door' | 'envelope' | 'box' | 'zoom' | 'blinds' | 'split';
export type AmbientEffect =
    | 'none' | 'petals' | 'sakura' | 'hearts' | 'stars' | 'sparkles' | 'snow' | 'leaves' | 'bubbles' | 'confetti'
    | 'fireflies' | 'butterflies' | 'bokeh' | 'dust' | 'rain'
    | 'embers' | 'feathers' | 'notes' | 'meteors';
export type DecorationStyle =
    | 'none' | 'cornerFloral' | 'roots' | 'leaves' | 'geometric' | 'goldFrame' | 'arch'
    | 'lantern' | 'artdeco' | 'moroccan' | 'doubleHappiness' | 'ovalFrame' | 'floralCorners'
    | 'tropical' | 'celestial' | 'lace' | 'heartVine';
export type HeadingFont = 'serif' | 'sans' | 'script' | 'elegant' | 'modern' | 'custom';

/**
 * Whole-card background — an uploaded photo, a rich gradient, or a solid tint.
 * A gradient/colour paints the entire card edge-to-edge; an image is laid as a
 * full-bleed backdrop behind the cover (with a legibility scrim) so the names
 * always stay readable, exactly like a printed e-invite hero.
 */
export interface CustomBackground {
    type: 'none' | 'color' | 'gradient' | 'image';
    color?: string;        // solid colour / gradient stop 1
    color2?: string;       // gradient stop 2
    angle?: number;        // gradient angle (deg)
    image?: string;        // uploaded / hosted image URL
    overlay?: number;      // 0..0.85 scrim strength over an image (legibility)
    overlayColor?: string; // scrim colour (defaults to palette.bg)
    blur?: number;         // 0..10 px blur applied to the image
}

export interface CustomTemplateConfig {
    palette: CustomPalette;
    heading: HeadingFont;          // heading font family
    headingFontUrl?: string;       // uploaded custom font URL (used when heading === 'custom')
    headingFontName?: string;      // display name of the uploaded custom font
    background?: CustomBackground; // whole-card backdrop (photo / gradient / tint)
    cover: {
        reveal: CoverReveal;       // entrance animation for the cover
        accentColor?: string;      // curtain / door / envelope / box colour (defaults to primary)
        /**
         * Welcome gate: show a "tap to open" cover (names + date + an Open button)
         * that the guest taps to trigger the reveal — like a real e-invite. Default
         * ON for the overlay reveals (curtain/door/box/blinds); envelope/letter
         * always gate. `false` auto-plays the reveal on load instead.
         */
        gate?: boolean;
        /** Label on the open button (defaults to "Buka"). */
        openLabel?: string;
    };
    effect: {
        type: AmbientEffect;       // ambient sprinkle / rain effect
        color?: string;            // defaults to accent
        density: number;           // 4..24 particles
    };
    decoration: {
        style: DecorationStyle;    // side / corner decorations
        color?: string;            // defaults to accent
    };
    motion: 'calm' | 'lively';     // global animation intensity
    sections: Record<string, CustomSectionConfig>;
    /** Event designs only: which EventPoster theme to render (see eventThemes.tsx). */
    eventTheme?: string;
    /** Event designs only: the event TYPE (concert/openhouse/birthday/… — eventTypes.tsx). */
    eventType?: string;
    /** Event designs only: the cover STAGE / layout archetype (marquee/spotlight/vinyl/deco/launch/arch/garden/pop — eventStages.tsx). */
    eventStage?: string;
}

/** Sections the designer can style / toggle (in render order after the cover). */
export const CUSTOM_SECTIONS = [
    'opening', 'couple', 'prayer', 'date', 'program', 'location', 'wishes', 'wishlist', 'contacts', 'gift', 'gallery',
] as const;
export type CustomSectionKey = (typeof CUSTOM_SECTIONS)[number];

function sectionDefaults(): Record<string, CustomSectionConfig> {
    const out: Record<string, CustomSectionConfig> = {};
    CUSTOM_SECTIONS.forEach((k, i) => {
        out[k] = {
            enabled: true,
            bg: { type: i % 2 === 0 ? 'none' : 'color', color: 'rgba(255,255,255,0.45)' },
            animation: 'fade',
        };
    });
    return out;
}

/** A pleasant starting point for a brand-new custom design. */
export const DEFAULT_CUSTOM_CONFIG: CustomTemplateConfig = {
    palette: { primary: '#4a3bc4', secondary: '#6c6a80', accent: '#e8a33d', bg: '#faf9ff', text: '#2a2740' },
    heading: 'serif',
    background: { type: 'none' },
    cover: { reveal: 'plain' },
    effect: { type: 'petals', density: 12 },
    decoration: { style: 'cornerFloral' },
    motion: 'calm',
    sections: sectionDefaults(),
};

/** Merge a stored (possibly partial) config over the defaults so the engine is never under-specified. */
export function normalizeConfig(c?: Partial<CustomTemplateConfig> | null): CustomTemplateConfig {
    const d = DEFAULT_CUSTOM_CONFIG;
    if (!c) return { ...d, sections: sectionDefaults() };
    return {
        palette: { ...d.palette, ...(c.palette ?? {}) },
        heading: c.heading ?? d.heading,
        headingFontUrl: c.headingFontUrl,
        headingFontName: c.headingFontName,
        background: { type: 'none', ...(c.background ?? {}) },
        // Legacy: 'letter' folded into 'envelope' (both open cleanly and vanish).
        cover: (() => {
            const cov = { ...d.cover, ...(c.cover ?? {}) };
            if ((cov.reveal as string) === 'letter') cov.reveal = 'envelope';
            return cov;
        })(),
        effect: { ...d.effect, ...(c.effect ?? {}) },
        decoration: { ...d.decoration, ...(c.decoration ?? {}) },
        motion: c.motion ?? d.motion,
        sections: { ...sectionDefaults(), ...(c.sections ?? {}) },
        eventTheme: c.eventTheme,
        eventType: c.eventType,
        eventStage: c.eventStage,
    };
}
