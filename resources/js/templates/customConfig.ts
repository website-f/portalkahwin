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

export type CoverReveal = 'plain' | 'curtain' | 'envelope' | 'zoom' | 'blinds';
export type AmbientEffect =
    | 'none' | 'petals' | 'sakura' | 'hearts' | 'stars' | 'sparkles' | 'snow' | 'leaves' | 'bubbles' | 'confetti'
    | 'fireflies' | 'butterflies' | 'bokeh' | 'dust';
export type DecorationStyle =
    | 'none' | 'cornerFloral' | 'roots' | 'leaves' | 'geometric' | 'goldFrame' | 'arch'
    | 'lantern' | 'artdeco' | 'moroccan';
export type HeadingFont = 'serif' | 'sans' | 'script' | 'elegant' | 'modern' | 'custom';

export interface CustomTemplateConfig {
    palette: CustomPalette;
    heading: HeadingFont;          // heading font family
    headingFontUrl?: string;       // uploaded custom font URL (used when heading === 'custom')
    headingFontName?: string;      // display name of the uploaded custom font
    cover: {
        reveal: CoverReveal;       // entrance animation for the cover
        accentColor?: string;      // curtain / envelope / blinds colour (defaults to primary)
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
}

/** Sections the designer can style / toggle (in render order after the cover). */
export const CUSTOM_SECTIONS = [
    'opening', 'couple', 'date', 'program', 'location', 'wishes', 'wishlist', 'contacts', 'gift', 'gallery',
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
        cover: { ...d.cover, ...(c.cover ?? {}) },
        effect: { ...d.effect, ...(c.effect ?? {}) },
        decoration: { ...d.decoration, ...(c.decoration ?? {}) },
        motion: c.motion ?? d.motion,
        sections: { ...sectionDefaults(), ...(c.sections ?? {}) },
    };
}
