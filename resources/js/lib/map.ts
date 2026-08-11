import type { InvitationData } from '../templates/types';

/**
 * Pull explicit coordinates out of a pasted Google Maps link so the embedded map
 * pins the EXACT spot the couple chose (not just a fuzzy address geocode).
 * Handles the common URL shapes: `@lat,lng`, `q=/query=/ll=/destination=lat,lng`,
 * and the `!3dLAT!4dLNG` place form.
 */
export function coordsFromMapsUrl(url?: string | null): string | null {
    if (!url) return null;
    let m = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (m) return `${m[1]},${m[2]}`;
    m = url.match(/[?&](?:q|query|ll|destination|daddr)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
    if (m) return `${m[1]},${m[2]}`;
    m = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (m) return `${m[1]},${m[2]}`;
    return null;
}

/**
 * Best embeddable Google Maps URL for a card's venue, always dropping a pin:
 * exact coordinates from the pasted maps link if available, else the full address.
 * Returns null only when there's nothing to show. No API key required.
 */
export function mapEmbedSrc(data: Pick<InvitationData, 'mapsUrl' | 'venueName' | 'venueAddress'>): string | null {
    const coords = coordsFromMapsUrl(data.mapsUrl);
    if (coords) {
        return `https://maps.google.com/maps?q=${coords}&z=16&hl=ms&output=embed`;
    }
    const query = [data.venueName, data.venueAddress].filter(Boolean).join(', ');
    if (query) {
        return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=16&hl=ms&output=embed`;
    }
    return null;
}
